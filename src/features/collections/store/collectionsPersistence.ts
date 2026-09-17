import type { CollectionGroup } from '../types/collection';

export interface CollectionsData {
  favouriteIds: number[];
  groups: CollectionGroup[];
}

export type CollectionChange = (data: CollectionsData) => CollectionsData;
type SaveStatus = 'saved' | 'saving' | 'retrying' | 'error';
export const collectionsStorageKey = 'curiofold-collections';

export function validCharacterId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function uniqueIds(value: unknown): number[] {
  return Array.isArray(value) ? [...new Set(value.filter(validCharacterId))] : [];
}

function sanitizeCollections(value: unknown): CollectionsData {
  const data = typeof value === 'object' && value !== null ? value : {};
  const favouriteIds = uniqueIds('favouriteIds' in data ? data.favouriteIds : []);
  const favourites = new Set(favouriteIds);
  const candidates = 'groups' in data && Array.isArray(data.groups) ? data.groups : [];
  const groups: CollectionGroup[] = [];
  const groupIds = new Set<string>();
  for (const candidate of candidates) {
    if (typeof candidate !== 'object' || candidate === null) continue;
    const { id, name, characterIds } = candidate;
    if (typeof id !== 'string' || !id.trim() || groupIds.has(id)) continue;
    if (typeof name !== 'string' || !name.trim()) continue;
    groupIds.add(id);
    groups.push({
      id,
      name: name.trim(),
      characterIds: uniqueIds(characterIds).filter((id) => favourites.has(id)),
    });
  }
  return { favouriteIds, groups };
}

function readCollections(): CollectionsData {
  const saved = localStorage.getItem(collectionsStorageKey);
  let parsed: unknown;
  try {
    parsed = saved === null ? null : JSON.parse(saved);
  } catch {
    return { favouriteIds: [], groups: [] };
  }
  if (typeof parsed !== 'object' || parsed === null) return sanitizeCollections(null);
  if ('version' in parsed && parsed.version !== 0) throw new Error('Unsupported storage version');
  return sanitizeCollections('state' in parsed ? parsed.state : null);
}

// Preserve the existing storage envelope. Pending operations and status are never persisted.
// Writers use an origin-wide lock and rebase operations onto the latest stored collection.
export function createCollectionsPersistence(publish: (data: CollectionsData) => void) {
  const pending: CollectionChange[] = [];
  const listeners = new Set<() => void>();
  let status: SaveStatus = 'saved';
  let running: Promise<void> | undefined;

  function setStatus(next: SaveStatus) {
    if (next === status) return;
    status = next;
    listeners.forEach((listener) => listener());
  }

  function rehydrate() {
    try {
      publish(pending.reduce((data, change) => change(data), readCollections()));
      if (pending.length === 0) setStatus('saved');
    } catch {
      // A read failure must not replace the current collection with empty data.
      setStatus('error');
    }
  }

  function flush(): Promise<void> {
    if (running) return running;
    if (pending.length === 0) {
      rehydrate();
      return Promise.resolve();
    }
    setStatus(status === 'error' ? 'retrying' : 'saving');
    running = (async () => {
      try {
        // HTTPS or localhost is required. Never fall back to unsafe snapshot writes.
        if (!navigator.locks) throw new Error('Safe browser storage is unavailable');
        while (pending.length > 0) {
          await navigator.locks.request(collectionsStorageKey, () => {
            const data = pending.reduce((value, change) => change(value), readCollections());
            localStorage.setItem(
              collectionsStorageKey,
              JSON.stringify({ state: data, version: 0 }),
            );
            pending.length = 0;
            publish(data);
          });
        }
        setStatus('saved');
      } catch {
        // Retry keeps these operations and combines them with other tabs' newer changes.
        setStatus('error');
      }
    })().finally(() => {
      running = undefined;
    });
    return running;
  }

  function connect() {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === collectionsStorageKey) rehydrate();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pending.length === 0) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', rehydrate);
    window.addEventListener('beforeunload', onBeforeUnload);
    rehydrate();
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', rehydrate);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }

  return {
    connect,
    rehydrate,
    flush,
    enqueue(change: CollectionChange) {
      pending.push(change);
      void flush();
    },
    getStatus: () => status,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
