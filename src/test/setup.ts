import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

import { collectionsPersistence, useCollectionsStore } from '../features/collections';
import { server } from './server';

let lockQueue = Promise.resolve<unknown>(undefined);
Object.defineProperty(navigator, 'locks', {
  configurable: true,
  value: {
    request: (_name: string, callback: () => unknown) => {
      const task = lockQueue.then(callback);
      lockQueue = task.catch(() => {});
      return task;
    },
  },
});
Element.prototype.scrollIntoView = vi.fn();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  localStorage.clear();
  useCollectionsStore.setState({ favouriteIds: [], groups: [] });
});
afterEach(async () => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
  await collectionsPersistence.flush();
  useCollectionsStore.setState({ favouriteIds: [], groups: [] });
  localStorage.clear();
  collectionsPersistence.rehydrate();
});
afterAll(() => server.close());
