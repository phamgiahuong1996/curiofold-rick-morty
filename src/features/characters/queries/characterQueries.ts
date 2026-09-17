import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { ApiError, getCharacters, getCharactersByIds } from '../api/charactersApi';
import type { Character, CharacterSearchParams } from '../types/character';

function cachedCharactersByIds(client: QueryClient, ids: readonly number[]) {
  if (ids.length === 0) return undefined;
  let newest: { data: Character[]; updatedAt: number } | undefined;
  for (const [key, data] of client.getQueriesData<Character[]>({
    queryKey: ['characters', 'byIds'],
  })) {
    if (!data) continue;
    const byId = new Map(data.map((character) => [character.id, character]));
    const characters = ids.map((id) => byId.get(id));
    if (!characters.every((character) => character !== undefined)) continue;
    const updatedAt = client.getQueryState(key)?.dataUpdatedAt ?? 0;
    if (!newest || updatedAt > newest.updatedAt) newest = { data: characters, updatedAt };
  }
  return newest;
}

function retryCharacterRequest(failureCount: number, error: Error) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

export function useCharactersQuery({ name, page }: CharacterSearchParams) {
  const params = { name: name.trim(), page };
  return useQuery({
    queryKey: ['characters', 'search', params],
    queryFn: ({ signal }) => getCharacters(params, signal),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    retry: retryCharacterRequest,
  });
}

export function useCharactersByIdsQuery(ids: readonly number[]) {
  const client = useQueryClient();
  const sortedIds = [...new Set(ids)].sort((a, b) => a - b);
  let cached: ReturnType<typeof cachedCharactersByIds>;
  const getCached = () => (cached ??= cachedCharactersByIds(client, sortedIds));
  return useQuery({
    queryKey: ['characters', 'byIds', sortedIds],
    queryFn: ({ signal }) => getCharactersByIds(sortedIds, signal),
    enabled: sortedIds.length > 0,
    // A removal changes the key, but details for every remaining ID are already cached.
    // Preserve their age so stale details refresh in the background instead of resetting freshness.
    initialData: () => getCached()?.data,
    initialDataUpdatedAt: () => getCached()?.updatedAt,
    staleTime: 5 * 60_000,
    retry: retryCharacterRequest,
  });
}
