import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import {
  CharacterGrid,
  CharacterGridSkeleton,
  CharacterPagination,
  CharacterSearch,
  useCharactersQuery,
} from '../../features/characters';
import { FavouriteButton } from '../../features/collections';
import { FeedbackPanel } from '../../shared/components/FeedbackPanel/FeedbackPanel';
import './ExplorePage.css';

function validPage(value: string | null) {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { key: navigationKey } = useLocation();
  const name = (searchParams.get('q') ?? '').trim();
  const page = validPage(searchParams.get('page'));
  const query = useCharactersQuery({ name, page });
  const results = query.data?.results ?? [];
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const pendingPageFocus = useRef<{ page: number; name: string } | null>(null);

  useEffect(() => {
    const target = pendingPageFocus.current;
    if (!target) return;
    if (target.page !== page || target.name !== name) {
      pendingPageFocus.current = null;
      return;
    }
    if (query.isPending || query.isPlaceholderData || query.isFetching) return;
    pendingPageFocus.current = null;
    resultsHeadingRef.current?.focus({ preventScroll: true });
    resultsHeadingRef.current?.scrollIntoView({ block: 'start' });
  }, [page, name, query.isPending, query.isPlaceholderData, query.isFetching]);

  const commitSearch = useCallback(
    (nextName: string) => {
      pendingPageFocus.current = null;
      const trimmedName = nextName.trim();
      if (trimmedName === name) return;
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        if (trimmedName) next.set('q', trimmedName);
        else next.delete('q');
        next.set('page', '1');
        return next;
      });
    },
    [name, setSearchParams],
  );

  function changePage(nextPage: number) {
    pendingPageFocus.current = { page: nextPage, name };
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('page', String(nextPage));
      return next;
    });
  }

  return (
    <>
      <section className="page-intro" aria-labelledby="explore-heading">
        <p className="page-kicker">Make room for curiosity</p>
        <h1 id="explore-heading">Explore</h1>
        <p className="page-description">
          Familiar faces. Unexpected characters. Find your next discovery in the Rick &amp; Morty
          universe.
        </p>
      </section>

      <CharacterSearch name={name} navigationKey={navigationKey} onCommit={commitSearch} />

      <section aria-labelledby="results-heading">
        <div className="explore-results__heading">
          <h2 id="results-heading" ref={resultsHeadingRef} tabIndex={-1}>
            Characters
          </h2>
          <p role="status">
            {query.isPending
              ? 'Loading characters…'
              : query.isFetching
                ? 'Updating results…'
                : query.isError
                  ? ''
                  : `${query.data?.info.count ?? 0} characters${name ? ` matching “${name}”` : ' to discover'}`}
          </p>
        </div>

        {query.isError && (
          <FeedbackPanel
            role="alert"
            title="Characters are out of reach"
            message="We couldn’t load the characters right now. Check your connection and give it another try."
          >
            <button type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>
              Try again
            </button>
          </FeedbackPanel>
        )}

        {!query.isPending && !query.isError && !query.isPlaceholderData && results.length === 0 && (
          <FeedbackPanel
            title={
              page > 1
                ? 'No characters on this page'
                : name
                  ? 'No characters matched'
                  : 'No characters available'
            }
            message={
              page > 1
                ? 'This page is unavailable. Return to the first page to continue exploring.'
                : name
                  ? `No matches for “${name}”. Try another name or explore all characters.`
                  : 'Try loading the characters again in a moment.'
            }
          >
            {page > 1 ? (
              <button type="button" onClick={() => changePage(1)}>
                Back to first page
              </button>
            ) : name ? (
              <button type="button" onClick={() => commitSearch('')}>
                Show all characters
              </button>
            ) : (
              <button type="button" onClick={() => void query.refetch()}>
                Try again
              </button>
            )}
          </FeedbackPanel>
        )}

        <div aria-busy={query.isFetching}>
          {query.isPending ? (
            <CharacterGridSkeleton />
          ) : (
            results.length > 0 && (
              <CharacterGrid
                characters={results}
                renderActions={(character) => (
                  <FavouriteButton characterId={character.id} characterName={character.name} />
                )}
              />
            )
          )}
        </div>

        {results.length > 0 && query.data && (
          <CharacterPagination
            page={page}
            pages={query.data.info.pages}
            updating={query.isPlaceholderData || query.isFetching}
            onPageChange={changePage}
          />
        )}
      </section>
    </>
  );
}
