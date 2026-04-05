# Contributing to Carolina Futons Mobile

## TDD Standards (Stilgar Directive 2026-04-02)

**Tests before implementation — mandatory, no exceptions.**

1. Write failing tests first
2. Implement until tests pass
3. Refactor with tests green

PRs without tests are **rejected outright**. No review until tests exist.

## Edge Case Coverage — Required in Every PR

Tests MUST cover:
- Error states (API failures, network drops, timeouts)
- Empty/null/undefined values and boundary conditions
- Invalid input (malformed data, XSS, injection, negative numbers)
- Race conditions and concurrent access
- Device compatibility (iOS/Android, permissions denied, camera unavailable)
- Offline behavior and network recovery

Happy-path-only PRs will be sent back with specific edge cases to add.

## Coding Standards

- `try/catch` on **all** async operations — no silent failures
- No empty catch blocks — log or handle every error
- Error boundaries on all screens
- Input validation on all user-facing forms
- Design tokens only: `sandBase`, `espresso`, `espressoLight`, `mountainBlue`, `sunsetCoral`, `offWhite`, `sandLight` — never raw hex or `background`/`textPrimary`/`textMuted`
- Screens import from hooks, never directly from `@/data/`
- Test files: camelCase naming convention

## CI Requirements

All PRs must pass before review:
- `lint` — ESLint + Prettier (run `npx eslint src/ --ext .ts,.tsx` and `npx prettier --check src/`)
- `test` — Jest with coverage (run `npx jest --ci --coverage`)
- `catalog-sync` — Wix catalog validation

**Fix CI before requesting review. Do not ask for review on a red PR.**

## Branch Naming

```
cm-<bead-id>-<short-desc>
```
Example: `cm-wrt-warranty-registration`

## PR Process

1. Branch from `main`
2. Commit tests first (or alongside implementation)
3. Run prettier: `npx prettier --write src/`
4. Push and open PR against `main`
5. All CI checks must be green
6. Refinery is final arbiter — do not self-merge

## Acceptance Bar

> "It works" is NOT acceptance.
> "It works AND fails gracefully" IS acceptance.
