import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';

import { characterApiUrl, characterPage, morty, rick } from '../../../test/fixtures';
import { server } from '../../../test/server';
import { ApiError, getCharacters, getCharactersByIds } from './charactersApi';

test('search returns typed characters and sends the trimmed name and page', async () => {
  let requestUrl = '';
  server.use(
    http.get(characterApiUrl, ({ request }) => {
      requestUrl = request.url;
      return HttpResponse.json(characterPage);
    }),
  );
  expect(await getCharacters({ name: ' rick ', page: 2 })).toEqual(characterPage);
  const url = new URL(requestUrl);
  expect(url.searchParams.get('name')).toBe('rick');
  expect(url.searchParams.get('page')).toBe('2');
});

test('a search 404 becomes a valid empty result', async () => {
  server.use(http.get(characterApiUrl, () => new HttpResponse(null, { status: 404 })));
  expect(await getCharacters({ name: 'no-match', page: 1 })).toEqual({
    info: { count: 0, pages: 0 },
    results: [],
  });
});

test('genuine HTTP failures expose an ApiError status', async () => {
  server.use(http.get(characterApiUrl, () => new HttpResponse(null, { status: 503 })));
  await expect(getCharacters({ name: '', page: 1 })).rejects.toBeInstanceOf(ApiError);
  await expect(getCharacters({ name: '', page: 1 })).rejects.toMatchObject({
    status: 503,
  });
});

test('an ID lookup normalizes a single object to an array', async () => {
  server.use(http.get(`${characterApiUrl}/1`, () => HttpResponse.json(rick)));
  expect(await getCharactersByIds([1])).toEqual([rick]);
});

test('an ID lookup normalizes an array and requests sorted unique IDs', async () => {
  server.use(http.get(`${characterApiUrl}/1,2`, () => HttpResponse.json([rick, morty])));
  expect(await getCharactersByIds([2, 1, 2])).toEqual([rick, morty]);
});

test('an empty ID lookup needs no request and an ID 404 remains an error', async () => {
  expect(await getCharactersByIds([])).toEqual([]);
  server.use(http.get(`${characterApiUrl}/99999`, () => new HttpResponse(null, { status: 404 })));
  await expect(getCharactersByIds([99999])).rejects.toMatchObject({
    status: 404,
  });
});

test('invalid response data produces a controlled error', async () => {
  server.use(
    http.get(characterApiUrl, () =>
      HttpResponse.json({
        info: { count: 1, pages: 1 },
        results: [{ id: null }],
      }),
    ),
  );
  await expect(getCharacters({ name: '', page: 1 })).rejects.toMatchObject({
    status: 502,
  });
});

test('an aborted signal cancels the request', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(getCharacters({ name: '', page: 1 }, controller.signal)).rejects.toMatchObject({
    name: 'AbortError',
  });
});
