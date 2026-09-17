import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  CharacterGrid,
  CharacterGridSkeleton,
  useCharactersByIdsQuery,
} from '../../features/characters';
import {
  CreateGroupForm,
  FavouriteButton,
  GroupMembershipControl,
  useCollectionsStore,
} from '../../features/collections';
import { FeedbackPanel } from '../../shared/components/FeedbackPanel/FeedbackPanel';
import './CollectionsPage.css';

export function CollectionsPage() {
  const favouriteIds = useCollectionsStore((state) => state.favouriteIds);
  const groups = useCollectionsStore((state) => state.groups);
  const deleteGroup = useCollectionsStore((state) => state.deleteGroup);
  const removeCharacterFromGroup = useCollectionsStore((state) => state.removeCharacterFromGroup);
  const query = useCharactersByIdsQuery(favouriteIds);
  const [announcement, setAnnouncement] = useState('');
  const groupInputRef = useRef<HTMLInputElement>(null);
  const emptyFavouritesLinkRef = useRef<HTMLAnchorElement>(null);
  const favouriteButtonRefs = useRef(new Map<number, HTMLButtonElement>());
  const pendingFavouriteFocus = useRef<number | 'empty' | null>(null);
  const groupHeadingRefs = useRef(new Map<string, HTMLHeadingElement>());
  const groupsHeadingRef = useRef<HTMLHeadingElement>(null);
  const pendingGroupFocus = useRef<{ id: string | undefined } | null>(null);
  const characters = query.data ?? [];
  const characterNames = new Map(characters.map((character) => [character.id, character.name]));

  useEffect(() => {
    const pending = pendingFavouriteFocus.current;
    if (pending === null) return;
    pendingFavouriteFocus.current = null;
    const target =
      pending === 'empty'
        ? emptyFavouritesLinkRef.current
        : favouriteButtonRefs.current.get(pending);
    if (!target) return;
    target.focus({ preventScroll: true });
    const bounds = target.getBoundingClientRect();
    if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
      target.scrollIntoView({ block: 'nearest' });
    }
  }, [favouriteIds]);

  useEffect(() => {
    const pending = pendingGroupFocus.current;
    if (!pending) return;
    pendingGroupFocus.current = null;
    const target =
      (pending.id ? groupHeadingRefs.current.get(pending.id) : null) ?? groupsHeadingRef.current;
    if (!target) return;
    target.focus({ preventScroll: true });
    const bounds = target.getBoundingClientRect();
    if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
      target.scrollIntoView({ block: 'nearest' });
    }
  }, [groups]);

  return (
    <>
      <section className="page-intro" aria-labelledby="collections-heading">
        <p className="page-kicker">Keep your discoveries close</p>
        <h1 id="collections-heading">Collections</h1>
        <p className="page-description">
          A home for the characters that catch your attention, organised in a way that feels yours.
        </p>
      </section>
      <section className="collections-section collections-tools" aria-label="Collection tools">
        <CreateGroupForm
          inputRef={groupInputRef}
          onCreated={(name) => setAnnouncement(`Created group “${name}”.`)}
        />
        <a className="collection-jump" href="#groups-heading">
          Manage groups ({groups.length})
        </a>
        <p className="collection-announcement" role="status">
          {announcement}
        </p>
      </section>
      <section className="collections-section" aria-labelledby="favourites-heading">
        <div className="collections-section__heading">
          <h2 id="favourites-heading">Favourites</h2>
          <p>
            {favouriteIds.length} saved {favouriteIds.length === 1 ? 'character' : 'characters'}
          </p>
        </div>
        {favouriteIds.length === 0 ? (
          <FeedbackPanel
            title="No favourites yet"
            message="Tap Favourite on a character in Explore to keep your discoveries here."
          >
            <Link ref={emptyFavouritesLinkRef} className="page-return" to="/">
              Explore characters
            </Link>
          </FeedbackPanel>
        ) : (
          <>
            {query.isPending && <p role="status">Loading favourites…</p>}
            {query.isError && (
              <FeedbackPanel
                role="alert"
                title="Favourites are out of reach"
                message="We couldn’t load your favourite characters. Your saved collection is still here. Try again to load their current details."
              >
                <button
                  type="button"
                  disabled={query.isFetching}
                  onClick={() => void query.refetch()}
                >
                  Try again
                </button>
              </FeedbackPanel>
            )}
            <div aria-busy={query.isFetching}>
              {query.isPending ? (
                <CharacterGridSkeleton />
              ) : (
                characters.length > 0 && (
                  <CharacterGrid
                    characters={characters}
                    renderActions={(character) => (
                      <>
                        <FavouriteButton
                          characterId={character.id}
                          characterName={character.name}
                          buttonRef={(button) => {
                            if (button) favouriteButtonRefs.current.set(character.id, button);
                            else favouriteButtonRefs.current.delete(character.id);
                          }}
                          onUnfavourite={() => {
                            setAnnouncement(
                              `Unfavourited ${character.name}. Removed from all groups.`,
                            );
                            const index = characters.findIndex((item) => item.id === character.id);
                            pendingFavouriteFocus.current =
                              characters[index + 1]?.id ?? characters[index - 1]?.id ?? 'empty';
                          }}
                        />
                        <GroupMembershipControl
                          characterId={character.id}
                          characterName={character.name}
                        />
                      </>
                    )}
                  />
                )
              )}
            </div>
          </>
        )}
      </section>

      <section className="collections-section" aria-labelledby="groups-heading">
        <div className="collections-section__heading">
          <h2 id="groups-heading" ref={groupsHeadingRef} tabIndex={-1}>
            Custom groups
          </h2>
          <p>
            A favourite can belong to more than one group. Deleting a group keeps its favourites.
          </p>
        </div>
        {groups.length === 0 ? (
          <FeedbackPanel
            title="No groups yet"
            message="Create a group for a theme, a dimension, or anything that sparks your curiosity. Then open Groups on a favourite card to add it."
          />
        ) : (
          <ul className="collection-groups" aria-label="Custom groups">
            {groups.map((group) => (
              <li key={group.id}>
                <article className="collection-group" aria-labelledby={`group-${group.id}`}>
                  <div className="collection-group__heading">
                    <h3
                      id={`group-${group.id}`}
                      tabIndex={-1}
                      ref={(heading) => {
                        if (heading) groupHeadingRefs.current.set(group.id, heading);
                        else groupHeadingRefs.current.delete(group.id);
                      }}
                    >
                      {group.name}
                    </h3>
                    <button
                      className="collection-delete"
                      type="button"
                      aria-label={`Delete group ${group.name}`}
                      onClick={() => {
                        const index = groups.findIndex((item) => item.id === group.id);
                        pendingGroupFocus.current = {
                          id: groups[index + 1]?.id ?? groups[index - 1]?.id,
                        };
                        deleteGroup(group.id);
                        setAnnouncement(
                          `Deleted group “${group.name}”. Its characters remain favourites.`,
                        );
                      }}
                    >
                      Delete group
                    </button>
                  </div>
                  <p className="collection-group__count">
                    {group.characterIds.length}{' '}
                    {group.characterIds.length === 1 ? 'character' : 'characters'}
                  </p>
                  {group.characterIds.length === 0 ? (
                    <p className="collection-group__empty">
                      No characters in this group. Open Groups on a favourite card above to add it.
                    </p>
                  ) : (
                    <ul
                      className="collection-group__members"
                      aria-label={`Members of ${group.name}`}
                    >
                      {group.characterIds.map((characterId) => {
                        const name = characterNames.get(characterId) ?? `Character #${characterId}`;
                        return (
                          <li key={characterId}>
                            <span>{name}</span>
                            <button
                              type="button"
                              aria-label={`Remove ${name} from ${group.name}`}
                              onClick={() => {
                                removeCharacterFromGroup(group.id, characterId);
                                setAnnouncement(
                                  `Removed ${name} from “${group.name}”. Still in Favourites.`,
                                );
                                groupHeadingRefs.current.get(group.id)?.focus();
                              }}
                            >
                              Remove from group
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
