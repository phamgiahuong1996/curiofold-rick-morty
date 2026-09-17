import { useEffect, useSyncExternalStore } from 'react';

import { collectionsPersistence } from '../store/collectionsStore';

export function CollectionStorageFeedback() {
  const status = useSyncExternalStore(
    collectionsPersistence.subscribe,
    collectionsPersistence.getStatus,
  );
  useEffect(() => collectionsPersistence.connect(), []);
  if (status !== 'error' && status !== 'retrying') return null;
  return (
    <div className="collection-storage-feedback" role="alert">
      <p>
        Your collection couldn’t be saved or restored. Keep this tab open to protect your latest
        changes. Check that browser storage is allowed, then try again.
      </p>
      <button
        type="button"
        disabled={status === 'retrying'}
        onClick={async () => {
          await collectionsPersistence.flush();
          if (collectionsPersistence.getStatus() === 'saved')
            document.getElementById('main-content')?.focus({ preventScroll: true });
        }}
      >
        {status === 'retrying' ? 'Saving…' : 'Try saving again'}
      </button>
    </div>
  );
}
