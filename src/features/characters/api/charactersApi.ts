import type { Character, CharacterPage, CharacterSearchParams } from '../types/character';

const baseUrl = 'https://rickandmortyapi.com/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message = 'Character request failed') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, fallback = 'Unknown'): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function characterFromResponse(value: unknown): Character {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.id) ||
    typeof value.id !== 'number' ||
    value.id < 1 ||
    typeof value.name !== 'string' ||
    !value.name.trim()
  ) {
    throw new ApiError(502, 'Invalid character response');
  }

  return {
    id: value.id,
    name: value.name,
    status: value.status === 'Alive' || value.status === 'Dead' ? value.status : 'unknown',
    species: text(value.species),
    type: text(value.type, ''),
    gender:
      value.gender === 'Female' || value.gender === 'Male' || value.gender === 'Genderless'
        ? value.gender
        : 'unknown',
    origin: {
      name: isRecord(value.origin) ? text(value.origin.name) : 'Unknown',
    },
    location: {
      name: isRecord(value.location) ? text(value.location.name) : 'Unknown',
    },
    image: text(value.image, ''),
  };
}

async function request(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`${baseUrl}${path}`, { signal });
  if (!response.ok) throw new ApiError(response.status);

  try {
    const body: unknown = await response.json();
    return body;
  } catch {
    if (signal?.aborted) throw signal.reason;
    throw new ApiError(502, 'Invalid JSON response');
  }
}

export async function getCharacters(
  { name, page }: CharacterSearchParams,
  signal?: AbortSignal,
): Promise<CharacterPage> {
  const params = new URLSearchParams({ page: String(page) });
  if (name.trim()) params.set('name', name.trim());

  let body: unknown;
  try {
    body = await request(`/character?${params}`, signal);
  } catch (error) {
    // The list endpoint uses 404 for unmatched filters and unavailable pages.
    if (error instanceof ApiError && error.status === 404) {
      return { info: { count: 0, pages: 0 }, results: [] };
    }
    throw error;
  }

  if (!isRecord(body) || !isRecord(body.info) || !Array.isArray(body.results)) {
    throw new ApiError(502, 'Invalid character list');
  }
  const { count, pages } = body.info;
  if (
    typeof count !== 'number' ||
    typeof pages !== 'number' ||
    !Number.isSafeInteger(count) ||
    !Number.isSafeInteger(pages) ||
    count < 0 ||
    pages < 0
  ) {
    throw new ApiError(502, 'Invalid pagination response');
  }
  return {
    info: { count, pages },
    results: body.results.map(characterFromResponse),
  };
}

export async function getCharactersByIds(
  ids: readonly number[],
  signal?: AbortSignal,
): Promise<Character[]> {
  if (ids.length === 0) return [];
  if (ids.some((id) => !Number.isSafeInteger(id) || id < 1))
    throw new ApiError(400, 'Invalid character IDs');
  const uniqueIds = [...new Set(ids)].sort((a, b) => a - b);
  const body = await request(`/character/${uniqueIds.join(',')}`, signal);
  return (Array.isArray(body) ? body : [body]).map(characterFromResponse);
}
