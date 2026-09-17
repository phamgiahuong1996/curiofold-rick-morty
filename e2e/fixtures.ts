import { test as base, expect } from '@playwright/test';
import type { Character } from '../src/features/characters/types/character.ts';

const portrait = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="#eeebfa"/><circle cx="150" cy="115" r="55" fill="#4938b8"/><path d="M50 300v-35a100 100 0 0 1 200 0v35" fill="#4938b8"/></svg>')}`;

export const characters: Character[] = [
  {
    id: 1,
    name: 'Rick Sanchez',
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    origin: { name: 'Earth (C-137)' },
    location: { name: 'Citadel of Ricks' },
    image: portrait,
  },
  {
    id: 2,
    name: 'Morty Smith',
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    origin: { name: 'Earth (C-137)' },
    location: { name: 'Earth' },
    image: portrait,
  },
  {
    id: 3,
    name: 'InterdimensionalExplorerWithAnUnexpectedlyLongUnbrokenName',
    status: 'unknown',
    species: 'Alien',
    type: '',
    gender: 'unknown',
    origin: { name: 'Unknown' },
    location: { name: 'AnExtremelyLongUnbrokenLocationInAnUnchartedParallelDimension' },
    // Exercise the real image-error fallback without any external image requests.
    image: 'data:image/png;base64,invalid',
  },
];

// Every test receives an isolated browser context and installs interception before navigation.
// Record paths for lightweight batch-lookup coverage, without asserting request counts or ordering.
export const test = base.extend<{ characterApi: string[] }>({
  characterApi: [
    async ({ context }, use) => {
      const requests: string[] = [];
      await context.route('https://rickandmortyapi.com/api/character**', async (route) => {
        const url = new URL(route.request().url());
        requests.push(`${url.pathname}${url.search}`);
        if (url.pathname === '/api/character') {
          const name = (url.searchParams.get('name') ?? '').toLowerCase();
          const results = characters.filter((character) =>
            character.name.toLowerCase().includes(name),
          );
          if (results.length === 0 || Number(url.searchParams.get('page') ?? 1) !== 1) {
            await route.fulfill({ status: 404, json: { error: 'There is nothing here' } });
            return;
          }
          await route.fulfill({
            json: { info: { count: results.length, pages: 1, next: null, prev: null }, results },
          });
          return;
        }
        const ids = url.pathname.slice('/api/character/'.length).split(',');
        const results = ids.map((id) =>
          characters.find((character) => character.id === Number(id)),
        );
        if (results.some((character) => !character)) {
          await route.fulfill({ status: 404, json: { error: 'Character not found' } });
          return;
        }
        await route.fulfill({ json: ids.length === 1 ? results[0] : results });
      });
      await use(requests);
    },
    { auto: true },
  ],
});

export { expect };
