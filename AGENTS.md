# CurioFold project instructions

CurioFold provides Rick & Morty character discovery and custom collections.

## Architecture and state

- `src/app`: application composition and infrastructure (routing, providers, query client).
- `src/features/characters`: external character API, query state, character presentation.
- `src/features/collections`: favourites, groups, membership, persistence.
- `src/pages`: page-level composition; `src/shared`: genuinely reusable generic UI and styles.
- Use intentional feature public APIs (`index.ts`) for feature-to-feature usage where practical.
- TanStack Query owns server/API Character data. Zustand owns only persisted favourite IDs,
  group metadata, and memberships; never persist full Character API objects there.
- The URL owns committed search and pagination; local React state owns temporary UI state.

## Collection invariants

- Only favourites may belong to groups; membership IDs are unique.
- Unfavouriting removes the character from every group atomically.
- Deleting a group does not unfavourite characters.
- Re-favouriting does not restore old memberships.

## Code and formatting

- Use strict TypeScript; avoid `any`. Untrusted external data begins as `unknown` and is validated.
- Named function declarations are welcome for React components. Use `type` naturally for
  unions/aliases and `interface` naturally for object shapes/props.
- Keep CharacterCard collection-agnostic; compose collection actions through its action slot.
- Use native fetch and plain CSS. Add no UI or animation framework without a concrete justification.
- Prettier is the formatting source of truth (`.prettierrc.json`); do not fight formatter output.

## Accessibility and testing

- Preserve semantic HTML, keyboard behavior, focus management, visible focus, reduced motion,
  and touch target sizing. Avoid unnecessary ARIA.
- Use Vitest + Testing Library + MSW for unit/integration tests and Playwright for critical
  cross-page browser behavior. External APIs must be deterministic in automated tests.
- Prefer user-facing E2E assertions over exact request counts or ordering.

## AI workflow and validation

Understand -> Inspect -> Plan -> Implement smallest coherent diff -> Validate -> Review diff -> Report.

Before completing work run:

```sh
pnpm format
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Run `pnpm test:e2e` when browser-facing behavior is affected. Install Chromium with
`pnpm exec playwright install chromium` when needed; do not encode a developer-specific browser cache
path in repository configuration. Report validation results and outstanding limitations.
