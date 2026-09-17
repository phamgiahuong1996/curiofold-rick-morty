# CurioFold

CurioFold is a responsive Rick & Morty character discovery app with personal favourites and custom
collections. It separates remote character data from the small amount of collection data owned by
the user, keeping both the UI and persistence model straightforward.

- Repository: [curiofold-rick-morty](https://github.com/phamgiahuong1996/curiofold-rick-morty)
- Live deployment: [CurioFold on Vercel](https://curiofold-rick-morty.vercel.app/)
- Character data and portraits: [Rick and Morty API](https://rickandmortyapi.com/)

## Functionality

- Explore character cards with status, species, and last known location.
- Search by name with a 300 ms debounce or immediate form submission; paginate API results.
- Share or revisit committed search/page state through the URL and browser history.
- Favourite characters from Explore and manage them on Collections.
- Create named groups and add a favourite to multiple groups; remove membership independently.
- Create groups at the top of Collections, jump directly to group management, and expand a card's
  Groups button only when editing membership.
- Restore favourites, groups, and membership after reload using localStorage.
- Synchronize collection edits across tabs, serialize simultaneous writes, and retry failed saves
  without discarding changes made in another tab.
- Recover from API failures with retry controls, distinguish empty results from failures, and show
  a portrait fallback when images cannot load.
- Navigate using keyboard controls, skip navigation, and a client-side not-found page.

Only favourites can belong to groups. Unfavouriting removes every membership in the same store
update; re-favouriting does not restore those memberships. Deleting a group leaves its favourites
intact. Group names are trimmed and must be non-empty; duplicate names are allowed, with UUIDs
providing independent identity.

## Technology stack

| Concern                | Tool                                                    |
| ---------------------- | ------------------------------------------------------- |
| UI and routing         | React 19, React Router 7                                |
| Language and build     | Strict TypeScript, Vite 8                               |
| API state              | TanStack Query 5, native fetch                          |
| Collection state       | Zustand 5 with localStorage persistence                 |
| Styling                | Plain CSS, shared design tokens, CSS micro-interactions |
| Code quality           | ESLint with React hooks/accessibility rules, Prettier   |
| Unit/integration tests | Vitest, Testing Library, MSW                            |
| Browser tests          | Playwright, Chromium                                    |

## Local setup

Requirements: **Node 24** and **pnpm 10**. `.nvmrc` selects Node 24; `package.json` declares the
supported engine ranges and pins pnpm to **10.33.2** through `packageManager`.

If pnpm is not installed, install the pinned version with `npm install --global pnpm@10.33.2`.

```sh
git clone https://github.com/phamgiahuong1996/curiofold-rick-morty.git
cd curiofold-rick-morty
pnpm install --frozen-lockfile
pnpm dev
```

Use the local URL printed by Vite. No API key, backend, or environment variables are required.
Normal app use requires access to the Rick and Morty API and its portraits.

## Commands

| Command             | Purpose                                                      |
| ------------------- | ------------------------------------------------------------ |
| `pnpm dev`          | Start the Vite development server                            |
| `pnpm build`        | Check TypeScript and create the production bundle in `dist/` |
| `pnpm preview`      | Serve the built bundle locally (build first)                 |
| `pnpm typecheck`    | Check application, tooling, and E2E TypeScript projects      |
| `pnpm lint`         | Run ESLint                                                   |
| `pnpm format`       | Apply repository Prettier formatting                         |
| `pnpm format:check` | Check formatting without modifying files                     |
| `pnpm test`         | Run unit and integration tests once                          |
| `pnpm test:watch`   | Run Vitest in watch mode                                     |
| `pnpm test:e2e`     | Run the Chromium browser suite against a production preview  |

Install the Playwright browser before the first E2E run:

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

On Linux runners, use `pnpm exec playwright install --with-deps chromium` to also install system
dependencies. No custom `PLAYWRIGHT_BROWSERS_PATH` is required. Playwright starts its own build and
preview at `http://127.0.0.1:4173`; locally it may reuse an already-running server at that address.

For manual production checks:

```sh
pnpm build
pnpm preview --host 127.0.0.1
```

Open `/`, navigate directly to `/collections`, and reload an unknown path to inspect the React
not-found page. Preview is a local verification server, not a production hosting server.

## Architecture

```text
src/
  app/                   Router, providers, query client, app composition
  features/
    characters/          API adapter, response types, queries, character UI
    collections/         Favourite/group controls, store, persistence types
  pages/                 Explore, Collections, NotFound composition
  shared/
    components/          App shell and reusable feedback UI
    styles/              Design tokens and global CSS
  test/                  MSW fixtures, server, setup, render helpers
e2e/                     Deterministic cross-page and responsive browser tests
.github/workflows/ci.yml Quality checks and browser-test CI
```

Pages assemble feature APIs exposed through their `index.ts` modules. CharacterCard belongs to the
characters feature and remains collection-agnostic: it accepts an action slot, into which pages
compose FavouriteButton and GroupMembershipControl. Character presentation does not import the
collections store.

### State ownership and data flow

| State                                                    | Owner             | Reason                                                                 |
| -------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------- |
| Character objects, search results, request status        | TanStack Query    | Remote data needs caching, cancellation, freshness, and retry handling |
| Favourite IDs, groups, membership IDs                    | Zustand           | Local user-owned data has synchronous collection invariants            |
| Committed search (`q`) and page (`page`)                 | URL               | Reload, deep linking, and browser back/forward restore the same view   |
| Search drafts, group form, announcements, image fallback | Local React state | Temporary presentation state does not need global persistence          |

Explore validates URL page values, passes search/page to the API query, and resets the page when
search changes. Collections selects persisted favourite IDs and fetches current character details
through the API's single/multi-ID endpoint. ID lists are deduplicated and sorted for stable query keys.
When favourites are removed, complete cached batches can seed the remaining subset while preserving
their original freshness, keeping surviving cards and group names available during background refresh.

### Persistence

The collection persistence adapter saves only `favouriteIds` and `groups` from Zustand under the
`curiofold-collections` localStorage key, preserving the existing `{ state, version: 0 }` format.
Each group contains an ID, name, and unique character membership IDs. Full API Character objects and
store actions are never persisted. On rehydration, parsed collection data is sanitized: invalid IDs
and groups are discarded, duplicates are removed, and membership is restricted to favourites.

Updates appear immediately in the current tab. The adapter queues the intended operations (add or
remove, rather than toggling a stored snapshot), takes an origin-wide Web Lock, reads the latest
stored collection, applies the operations, and writes once. Storage events and window focus refresh
other tabs without echoing writes. Pending local operations are reapplied over incoming data.

If storage reads or writes fail, the current collection remains usable and a visible warning offers
retry. Retrying applies pending operations to the latest stored data, so other tabs' changes survive.
The browser warns before leaving while changes are unsaved. Save status and pending operations live
only in memory and are not included in the stored collection. Saving requires a modern browser with
Web Locks on HTTPS or localhost; when unavailable, the app reports the save failure instead of using
an unsafe concurrent-write fallback.

This keeps storage small and avoids duplicating the API cache. Collections still needs the API for
character details after a fresh load. Data stays in the current browser/origin; clearing site storage
removes it, and there is no account, cloud synchronization, or offline character catalog.

### API and error handling

The API adapter uses native fetch with TanStack Query's abort signal. JSON enters as `unknown`;
runtime checks validate required character identity and pagination fields, then normalize optional
display fields. Invalid JSON or required response shapes become controlled ApiErrors. This is a
focused handwritten validator rather than a complete schema for every upstream API field.

The list endpoint's 404 becomes an empty result; ID lookup failures remain errors. Queries allow
one automatic retry for transient failures and do not automatically retry expected 4xx errors.
Character queries use a five-minute stale window and search retains previous results while updating.
Loading, empty, and error states have distinct feedback. Collection metadata survives detail-fetch
failures, and the UI offers manual retry.

## Accessibility and responsive design

The app uses semantic landmarks, headings, lists, labelled forms, native buttons, and checkboxes.
A skip link reaches focusable main content; route changes focus main, and collection changes move
focus to the next useful control or empty-state link. Status messages announce updates and form errors
are associated with their input. Visible focus styles, 44 px touch targets, image alternatives,
wrapping of long names, and reduced-motion CSS are part of the implementation.

Explicit pagination focuses and scrolls to the results heading after loading, including cached pages;
debounced searches keep focus in the search input. Each route has a descriptive document title.
The group form owns its draft locally, and membership checkboxes mount only when a card's Groups
button is expanded. Group member names and cached character subsets use ID maps for lookup.

Plain CSS and shared tokens keep the visual system inspectable. Grid layouts adapt to available
space, and small CSS transitions provide feedback without an animation runtime. Browser checks cover
375, 768, 1280, and 1600 px widths plus mobile touch interaction. Automated checks support accessibility
work; manual assistive-technology review remains a useful follow-up.

## Testing strategy

- **API and store tests:** response validation, request cancellation, error semantics, collection
  invariants, persistence sanitization, read/write failure recovery, and storage-event synchronization.
- **Page/router integration tests:** Testing Library exercises search, URL/history state, loading and
  error recovery, favourite/group actions, keyboard controls, and focus behavior. MSW supplies
  deterministic responses and rejects unhandled requests.
- **Browser tests:** Playwright exercises the Explore-to-Collections journey, persistence after
  reload, group membership, unfavourite continuity/focus, responsive layouts, reduced motion, and
  mobile interactions, and direct navigation/refresh for Explore, Collections, and NotFound. API
  responses and portraits are fixtures; tests do not depend on live API data.
- **Regression browser tests:** two tabs editing the same starting snapshot while a write lock is
  held, cross-tab deletion, storage quota failure and retry, full 20-character pagination with keyboard
  focus, and 100 favourites with 10 groups on desktop/mobile. The large fixture starts with zero
  mounted membership checkboxes and mounts only the opened card's 10 controls.

E2E assertions prioritize observable behavior over exact request counts or ordering. A lightweight
check retains coverage of the multi-ID API path. Screenshots are captured only on failure; CI traces
are captured on the first retry. Generated results are ignored by Git.

## CI

GitHub Actions runs one Ubuntu job for pull requests and pushes to `main`. Node comes from `.nvmrc`,
pnpm from `packageManager`, and the pnpm store is cached using the lockfile. Checks run sequentially:

```sh
pnpm install --frozen-lockfile
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

Failed checks stop subsequent verification steps. Playwright uses one CI worker, forbids focused
tests, and allows two retries for browser failures. Failed E2E runs upload `test-results/` diagnostics
for seven days. The workflow does not deploy.

## Deployment approach

The host is Vercel with its Vite preset: Node 24, install command
`pnpm install --frozen-lockfile`, build command `pnpm build`, and output directory `dist`.
No serverless functions are needed.

`vercel.json` rewrites client paths to `/index.html`, following
[Vercel's Vite SPA configuration](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas).
This lets direct navigation and refresh reach `/collections` and lets React Router's wildcard route
render NotFound for unknown paths. The SPA not-found view is served through the HTML fallback, so it
does not imply an HTTP 404 response. Local Vite preview verifies the built app's routing, while actual
Vercel routing must be checked after deployment.

The production URL is linked at the top of this README. After each deployment, verify direct navigation
and refresh on `/`, `/collections`, and an unknown path. Local uncommitted fixes are not automatically
present on that deployment; publish the validated revision through the project's Vercel deployment flow.

## AI-assisted development

AI assistance supports scoped implementation, inspection, cleanup, documentation, and validation.
`AGENTS.md` records the project's feature boundaries, state ownership, business invariants, formatting,
accessibility, and validation expectations. The workflow is to understand the requirement, inspect
existing code, plan a small coherent change, implement, validate, review the diff, and report results.
Generated changes still require review against the actual code and tests; documentation should claim
only implemented behavior.

## Exercise trade-offs and future improvements

For the exercise's two-hour scope, the priorities are the required two-page discovery/collection flow,
clear state ownership, browser persistence, and understandable error handling. A client-only Vite app,
native controls, and plain CSS keep setup and implementation small. The later reliability improvements
add focused regression coverage for multi-tab persistence, failed saves, pagination focus, and larger
collections without adding a backend or UI framework. This describes scope choices, not a claim about
the actual elapsed development time.

- Browser-only persistence keeps the exercise self-contained, but provides no cross-device sync or
  recovery after storage is cleared. A backend and cloud sync could follow authentication.
- Handwritten runtime validation avoids another dependency for a small API surface. A schema
  validation library becomes more useful as response complexity grows.
- Batched ID queries are simple and reuse cached subsets on removal. Per-character query
  normalization could reduce overlap and lookup costs for a much larger collection dataset.
- Groups use a flat model with create/delete and membership controls. Renaming, richer organization,
  and sorting are future work.
- Plain CSS and micro-interactions provide the required design and feedback without a UI or animation
  framework. Heavier libraries were avoided where native browser features and the existing tools
  already covered the need.
- Chromium covers the critical browser journey without a CI matrix. Firefox/WebKit coverage and
  manual screen-reader testing would broaden confidence beyond this exercise.
