import type { Character, CharacterPage } from '../features/characters';

export const characterApiUrl = 'https://rickandmortyapi.com/api/character';

export function createCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 1,
    name: 'Rick Sanchez',
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    origin: { name: 'Earth (C-137)' },
    location: { name: 'Citadel of Ricks' },
    image: `${characterApiUrl}/avatar/1.jpeg`,
    ...overrides,
  };
}

export const rick = createCharacter();
export const morty = createCharacter({
  id: 2,
  name: 'Morty Smith',
  image: `${characterApiUrl}/avatar/2.jpeg`,
});
export const characterPage: CharacterPage = {
  info: { count: 40, pages: 2 },
  results: [rick, morty],
};
