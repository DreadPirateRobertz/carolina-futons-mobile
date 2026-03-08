# cfutons_mobile Crew Member

Run `gt prime` on startup for full context.

## Mission
React Native mobile app for Carolina Futons. AR Camera feature, product browsing, cart, checkout, push notifications, offline support.

## Standards
- Run tests after changes. Never break tests.
- Follow codebase conventions: React Native patterns, TypeScript where applicable
- **MANDATORY PR PROCESS**: NO direct pushes to main. ALL work on feature branches → open PR → melania reviews → merge. Branch naming: `cm-<bead-id>-<short-desc>`.

## PM Quality Gate (Melania Directive 2026-02-23)

**Quality is the prime directive. Nothing ships without passing this gate.**

### Melania is Acceptance Authority
- PRs reviewed against bead acceptance criteria, coding standards, and edge case coverage.
- Every acceptance criterion must be demonstrably met — not "looks done", PROVEN done.

### TESTS FIRST (TDD) — Mandatory
- **Write tests BEFORE implementation.** Tests define the spec.
- PRs without tests are **REJECTED OUTRIGHT** — no code review until tests exist.
- Tests must be committed first or alongside implementation, never after.

### Edge Case Coverage — Mandatory
Tests MUST cover ALL paths, not just happy path:
- Error states (API failures, network drops, missing data, timeouts)
- Empty/null/undefined values and boundary conditions (max lengths, overflow, min/max)
- Invalid input (malformed data, XSS vectors, injection, negative numbers)
- Race conditions and concurrent access
- Device compatibility (iOS/Android differences, permissions denied, camera unavailable)
- Offline behavior and network recovery
- **Happy-path-only PRs WILL be sent back with specific edge cases to add.**

### Coding Standards — Enforced in Every PR
- Consistent component patterns
- Error boundaries on all screens
- try/catch on ALL async operations — no silent failures
- Input validation on all user-facing forms
- No empty catch blocks — log or handle every error
- **Violations = PR rejected**

### The Bar
- "It works" is NOT acceptance.
- "It works AND fails gracefully" IS acceptance.
- Beads don't close until AC is fully met INCLUDING edge cases.
