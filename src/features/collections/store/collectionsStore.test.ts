import { expect, test, vi } from 'vitest';

import { collectionsPersistence, useCollectionsStore } from './collectionsStore';

const state = () => useCollectionsStore.getState();

test('failed writes keep edits in memory and retry combines them with newer stored data', async () => {
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage full', 'QuotaExceededError');
  });
  state().addFavourite(1);
  const groupId = state().createGroup('Local discoveries')!;
  state().addCharacterToGroup(groupId, 1);
  await collectionsPersistence.flush();
  expect(collectionsPersistence.getStatus()).toBe('error');
  expect(state().favouriteIds).toEqual([1]);
  expect(localStorage.getItem('curiofold-collections')).toBeNull();

  write.mockRestore();
  localStorage.setItem(
    'curiofold-collections',
    JSON.stringify({
      state: {
        favouriteIds: [2],
        groups: [{ id: 'other', name: 'Another tab', characterIds: [2] }],
      },
      version: 0,
    }),
  );
  await collectionsPersistence.flush();
  expect(collectionsPersistence.getStatus()).toBe('saved');
  expect(state().favouriteIds).toEqual([2, 1]);
  expect(state().groups.map((group) => group.characterIds)).toEqual([[2], [1]]);
  useCollectionsStore.setState({ favouriteIds: [], groups: [] });
  collectionsPersistence.rehydrate();
  expect(state().favouriteIds).toEqual([2, 1]);
});

test('a read failure preserves the current collection and pending edits can be saved later', async () => {
  state().addFavourite(1);
  await collectionsPersistence.flush();
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Storage blocked', 'SecurityError');
  });
  collectionsPersistence.rehydrate();
  expect(state().favouriteIds).toEqual([1]);
  state().addFavourite(2);
  await collectionsPersistence.flush();
  expect(collectionsPersistence.getStatus()).toBe('error');
  read.mockRestore();
  await collectionsPersistence.flush();
  expect(state().favouriteIds).toEqual([1, 2]);
  expect(collectionsPersistence.getStatus()).toBe('saved');
});

test('storage events update local data without echoing writes and keep unsaved edits', async () => {
  const disconnect = collectionsPersistence.connect();
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage full', 'QuotaExceededError');
  });
  try {
    state().addFavourite(1);
    await collectionsPersistence.flush();
    write.mockRestore();
    localStorage.setItem(
      'curiofold-collections',
      JSON.stringify({ state: { favouriteIds: [2], groups: [] }, version: 0 }),
    );
    const echo = vi.spyOn(Storage.prototype, 'setItem');
    window.dispatchEvent(new StorageEvent('storage', { key: 'curiofold-collections' }));
    expect(state().favouriteIds).toEqual([2, 1]);
    expect(echo).not.toHaveBeenCalled();
    expect(collectionsPersistence.getStatus()).toBe('error');
    await collectionsPersistence.flush();
    expect(collectionsPersistence.getStatus()).toBe('saved');
  } finally {
    disconnect();
  }
});

test('clearing storage in another tab clears the local collection without restoring deleted data', async () => {
  state().addFavourite(1);
  await collectionsPersistence.flush();
  const disconnect = collectionsPersistence.connect();
  try {
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(state().favouriteIds).toEqual([]);
    state().addFavourite(2);
    await collectionsPersistence.flush();
    expect(JSON.parse(localStorage.getItem('curiofold-collections')!).state.favouriteIds).toEqual([
      2,
    ]);
  } finally {
    disconnect();
  }
});

test('adds favourites and prevents duplicate IDs', () => {
  state().addFavourite(1);
  expect(state().favouriteIds).toEqual([1]);
  state().addFavourite(1);
  state().addFavourite(2);
  expect(state().favouriteIds).toEqual([1, 2]);
});

test('toggles a favourite on and off', () => {
  state().toggleFavourite(1);
  expect(state().favouriteIds).toEqual([1]);
  state().toggleFavourite(1);
  expect(state().favouriteIds).toEqual([]);
});

test('removes a favourite without changing other favourites', () => {
  state().addFavourite(1);
  state().addFavourite(2);
  state().removeFavourite(1);
  expect(state().favouriteIds).toEqual([2]);
  state().removeFavourite(99);
  expect(state().favouriteIds).toEqual([2]);
});

test('creates a group with a UUID and trimmed name; duplicate names are allowed', () => {
  const id = state().createGroup('  Portal pals  ');
  expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  expect(state().groups).toEqual([{ id, name: 'Portal pals', characterIds: [] }]);
  const secondId = state().createGroup('Portal pals');
  expect(secondId).not.toBe(id);
  expect(state().groups).toHaveLength(2);
});

test.each(['', ' ', '\t\n'])('rejects blank group name %j', (name) => {
  expect(state().createGroup(name)).toBeNull();
  expect(state().groups).toEqual([]);
});

test('adds a favourite to a group once and rejects non-favourites', () => {
  const id = state().createGroup('Portal pals')!;
  state().addCharacterToGroup(id, 1);
  expect(state().groups[0].characterIds).toEqual([]);
  state().addFavourite(1);
  state().addCharacterToGroup(id, 1);
  expect(state().groups[0].characterIds).toEqual([1]);
  state().addCharacterToGroup(id, 1);
  state().addCharacterToGroup(id, 2);
  expect(state().groups[0].characterIds).toEqual([1]);
});

test('removes membership while preserving the favourite and other memberships', () => {
  const id = state().createGroup('Portal pals')!;
  state().addFavourite(1);
  state().addFavourite(2);
  state().addCharacterToGroup(id, 1);
  state().addCharacterToGroup(id, 2);
  state().removeCharacterFromGroup(id, 1);
  expect(state().groups[0].characterIds).toEqual([2]);
  expect(state().favouriteIds).toEqual([1, 2]);
});

test('deleting a group preserves its favourites', () => {
  const id = state().createGroup('Portal pals')!;
  state().addFavourite(1);
  state().addCharacterToGroup(id, 1);
  state().deleteGroup(id);
  expect(state().groups).toEqual([]);
  expect(state().favouriteIds).toEqual([1]);
});

test.each(['removeFavourite', 'toggleFavourite'] as const)(
  '%s removes membership from ALL groups atomically and re-favouriting restores none',
  (action) => {
    const first = state().createGroup('Portal pals')!;
    const second = state().createGroup('Earth')!;
    state().addFavourite(1);
    state().addFavourite(2);
    state().addCharacterToGroup(first, 1);
    state().addCharacterToGroup(second, 1);
    state().addCharacterToGroup(second, 2);
    const updates: Array<{ favouriteIds: number[]; memberships: number[][] }> = [];
    const unsubscribe = useCollectionsStore.subscribe((next) => {
      updates.push({
        favouriteIds: next.favouriteIds,
        memberships: next.groups.map((group) => group.characterIds),
      });
    });
    try {
      state()[action](1);
      expect(updates).toEqual([{ favouriteIds: [2], memberships: [[], [2]] }]);
      state().addFavourite(1);
      expect(state().groups.map((group) => group.characterIds)).toEqual([[], [2]]);
    } finally {
      unsubscribe();
    }
  },
);

test('missing group IDs and invalid character IDs leave state intact', () => {
  state().addFavourite(1);
  state().createGroup('Portal pals');
  const before = state();
  state().addCharacterToGroup('missing', 1);
  state().removeCharacterFromGroup('missing', 1);
  state().deleteGroup('missing');
  for (const id of [0, -1, 1.5, NaN, Infinity]) {
    state().addFavourite(id);
    state().toggleFavourite(id);
  }
  expect(state()).toBe(before);
});

test('only collection data persists and survives a storage rehydration cycle', async () => {
  state().addFavourite(2);
  state().addFavourite(1);
  const id = state().createGroup('Portal pals')!;
  state().addCharacterToGroup(id, 1);
  await collectionsPersistence.flush();
  const saved = localStorage.getItem('curiofold-collections')!;
  expect(JSON.parse(saved).state).toEqual({
    favouriteIds: [2, 1],
    groups: [{ id, name: 'Portal pals', characterIds: [1] }],
  });
  useCollectionsStore.setState({ favouriteIds: [], groups: [] });
  localStorage.setItem('curiofold-collections', saved);
  collectionsPersistence.rehydrate();
  expect(state().favouriteIds).toEqual([2, 1]);
  expect(state().groups).toEqual([{ id, name: 'Portal pals', characterIds: [1] }]);
  state().removeFavourite(1);
  expect(state().groups[0].characterIds).toEqual([]);
});

test('rehydration sanitizes malformed collections and cannot replace actions', async () => {
  localStorage.setItem(
    'curiofold-collections',
    JSON.stringify({
      state: {
        favouriteIds: [1, 1, -1, '2', null, 2],
        groups: [
          null,
          { id: 'a', name: '  Pals  ', characterIds: [1, 1, 2, 99] },
          { id: 'a', name: 'Duplicate ID', characterIds: [2] },
          { id: 'blank', name: '  ', characterIds: [] },
          { id: 5, name: 'Bad ID' },
          { id: 'b', name: 'Empty', characterIds: 'bad' },
        ],
        addFavourite: 'bad',
      },
      version: 0,
    }),
  );
  collectionsPersistence.rehydrate();
  expect(state().favouriteIds).toEqual([1, 2]);
  expect(state().groups).toEqual([
    { id: 'a', name: 'Pals', characterIds: [1, 2] },
    { id: 'b', name: 'Empty', characterIds: [] },
  ]);
  expect(state().addFavourite).toBeTypeOf('function');
});

test.each([
  '{broken json',
  JSON.stringify({ state: { favouriteIds: {}, groups: 'bad' }, version: 0 }),
])('unreadable or malformed storage leaves usable empty state: %s', async (saved) => {
  localStorage.setItem('curiofold-collections', saved);
  collectionsPersistence.rehydrate();
  expect(state().favouriteIds).toEqual([]);
  expect(state().groups).toEqual([]);
  state().addFavourite(1);
  expect(state().favouriteIds).toEqual([1]);
});
