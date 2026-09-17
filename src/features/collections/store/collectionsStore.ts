import { create } from 'zustand';

import { createCollectionsPersistence, validCharacterId } from './collectionsPersistence';
import type { CollectionChange, CollectionsData } from './collectionsPersistence';

interface CollectionsState extends CollectionsData {
  addFavourite: (characterId: number) => void;
  removeFavourite: (characterId: number) => void;
  toggleFavourite: (characterId: number) => void;
  createGroup: (name: string) => string | null;
  deleteGroup: (groupId: string) => void;
  addCharacterToGroup: (groupId: string, characterId: number) => void;
  removeCharacterFromGroup: (groupId: string, characterId: number) => void;
}

function withoutFavourite(state: CollectionsData, characterId: number): CollectionsData {
  if (!state.favouriteIds.includes(characterId)) return state;
  return {
    favouriteIds: state.favouriteIds.filter((id) => id !== characterId),
    groups: state.groups.map((group) => ({
      ...group,
      characterIds: group.characterIds.filter((id) => id !== characterId),
    })),
  };
}

export const useCollectionsStore = create<CollectionsState>()((set, get) => {
  function change(operation: CollectionChange) {
    const current = get();
    const next = operation(current);
    if (next === current) return;
    set(next);
    collectionsPersistence.enqueue(operation);
  }

  return {
    favouriteIds: [],
    groups: [],
    addFavourite: (characterId) => {
      if (!validCharacterId(characterId)) return;
      change((state) =>
        state.favouriteIds.includes(characterId)
          ? state
          : { ...state, favouriteIds: [...state.favouriteIds, characterId] },
      );
    },
    removeFavourite: (characterId) => change((state) => withoutFavourite(state, characterId)),
    toggleFavourite: (characterId) => {
      // Store the intended add/remove, not a toggle that could invert another tab's edit.
      if (get().favouriteIds.includes(characterId)) get().removeFavourite(characterId);
      else get().addFavourite(characterId);
    },
    createGroup: (name) => {
      const trimmedName = name.trim();
      if (!trimmedName) return null;
      const id = crypto.randomUUID();
      change((state) => ({
        ...state,
        groups: [...state.groups, { id, name: trimmedName, characterIds: [] }],
      }));
      return id;
    },
    deleteGroup: (groupId) =>
      change((state) =>
        state.groups.some((group) => group.id === groupId)
          ? { ...state, groups: state.groups.filter((group) => group.id !== groupId) }
          : state,
      ),
    addCharacterToGroup: (groupId, characterId) =>
      change((state) => {
        const target = state.groups.find((group) => group.id === groupId);
        if (
          !target ||
          !state.favouriteIds.includes(characterId) ||
          target.characterIds.includes(characterId)
        )
          return state;
        return {
          ...state,
          groups: state.groups.map((group) =>
            group.id === groupId
              ? { ...group, characterIds: [...group.characterIds, characterId] }
              : group,
          ),
        };
      }),
    removeCharacterFromGroup: (groupId, characterId) =>
      change((state) => {
        if (!state.groups.find((group) => group.id === groupId)?.characterIds.includes(characterId))
          return state;
        return {
          ...state,
          groups: state.groups.map((group) =>
            group.id === groupId
              ? { ...group, characterIds: group.characterIds.filter((id) => id !== characterId) }
              : group,
          ),
        };
      }),
  };
});

export const collectionsPersistence = createCollectionsPersistence((data) => {
  const current = useCollectionsStore.getState();
  // Acknowledging our own save preserves references, keeping cards and focus stable.
  const favouriteIds =
    JSON.stringify(current.favouriteIds) === JSON.stringify(data.favouriteIds)
      ? current.favouriteIds
      : data.favouriteIds;
  const groups =
    JSON.stringify(current.groups) === JSON.stringify(data.groups) ? current.groups : data.groups;
  if (favouriteIds !== current.favouriteIds || groups !== current.groups)
    useCollectionsStore.setState({ favouriteIds, groups });
});

collectionsPersistence.rehydrate();
