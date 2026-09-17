import { http, HttpResponse } from 'msw';

import { characterApiUrl, characterPage, morty, rick } from './fixtures';

export const handlers = [
  http.get(characterApiUrl, () => HttpResponse.json(characterPage)),
  http.get(`${characterApiUrl}/:ids`, ({ params }) => {
    const ids = String(params.ids).split(',').map(Number);
    const characters = [rick, morty].filter((character) => ids.includes(character.id));
    if (characters.length === 0) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(ids.length === 1 ? characters[0] : characters);
  }),
];
