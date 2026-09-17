import type { Ref } from 'react';

import { useCollectionsStore } from '../store/collectionsStore';

interface FavouriteButtonProps {
  characterId: number;
  characterName: string;
  onUnfavourite?: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
}

export function FavouriteButton({
  characterId,
  characterName,
  onUnfavourite,
  buttonRef,
}: FavouriteButtonProps) {
  const isFavourite = useCollectionsStore((state) => state.favouriteIds.includes(characterId));
  const toggleFavourite = useCollectionsStore((state) => state.toggleFavourite);

  return (
    <button
      ref={buttonRef}
      className="favourite-button"
      type="button"
      aria-pressed={isFavourite}
      aria-label={isFavourite ? `Unfavourite ${characterName}` : `Favourite ${characterName}`}
      onClick={() => {
        toggleFavourite(characterId);
        if (isFavourite) onUnfavourite?.();
      }}
    >
      <span className="favourite-button__icon" aria-hidden="true">
        {isFavourite ? '♥' : '♡'}
      </span>
      {isFavourite ? 'Favourited' : 'Favourite'}
    </button>
  );
}
