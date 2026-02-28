# Dallas Status Report — 2026-02-28

## Summary

The crew is executing the Wix API integration + screen refactor pipeline. We're replacing all direct mock data imports with hook-based data access, preparing for live Wix backend drop-in. Design alignment with melania is complete.

---

## Open PRs (awaiting melania review)

| PR | Branch | Bead | Description |
|----|--------|------|-------------|
| #19 | `cm-wix-api-client` | cm-kpr | Wix Stores REST API client (31 tests) |
| #20 | `cm-wix-data-integration` | cm-ptv | useProduct, useOrders, useFutonModels hooks (54 tests) — ripley |
| #21 | `cm-a0w-category-screen-refactor` | cm-a0w | CategoryScreen refactor to useProducts hook — ripley |
| #22 | `cm-41j-arscreen-refactor` | cm-41j | ARScreen: hooks replace direct data imports (7 new tests) |
| #23 | `cm-dy0-order-screens-refactor` | cm-dy0 | OrderHistory+OrderDetail: hooks replace MOCK_ORDERS (21 new tests) |

## Completed This Session (dallas)

1. **cm-41j (ARScreen refactor)** — PR #22 pushed. Replaced `FUTON_MODELS`/`PRODUCTS` imports with `useFutonModels`/`useProductByModelId` hooks. Loading + error states. 7 integration tests.
2. **cm-dy0 (Order screens refactor)** — PR #23 pushed. Replaced `MOCK_ORDERS` imports with `useOrders`/`useOrderById` hooks. Loading + error states. 21 new tests (10 hook + 11 integration).

## Completed This Session (crew)

- **ripley**: cm-ptv (3 API hooks, 54 tests), cm-a0w (CategoryScreen refactor), mock data audit
- **bishop**: Wix SDK + Members auth research

## In Progress (tracked beads)

| Bead | Priority | Owner | Status |
|------|----------|-------|--------|
| cm-pk5 | P0 | — | Wix Members auth client module |
| cm-kpr | P0 | dallas | Wix API client integration (PR #19) |
| cm-4j6 | P0 | — | Wix Members auth integration (needs SDK research from bishop) |
| cm-dy0 | P1 | dallas | Order screens refactor (PR #23 — done, awaiting review) |
| cm-0xx | P1 | — | ProductDetailScreen refactor |
| cm-248 | P1 | — | Design doc: carolinafutons.com visual reference |
| cm-41j | P2 | dallas | ARScreen refactor (PR #22 — done, awaiting review) |

## Ready Work (unblocked, unclaimed)

| Bead | Priority | Description |
|------|----------|-------------|
| cm-a7m | P1 | Refactor 9 screens from src/data imports to API hooks (parent bead) |

## Design Alignment (melania)

Melania provided full brand design specs for AR Camera and mobile UI:
- **Colors**: Sand #E8D5B7, Espresso #3A2518, Mountain Blue #5B8FA8, Coral #E8845C, Green CTA #4A7C59
- **Typography**: Playfair Display headings, system sans-serif body
- **Spacing**: 8px base grid, border radii 4/8/12px
- **AR-specific**: No trust bar in AR (keep immersive), product cards match web pattern
- **Interaction**: Web hover → mobile press/long-press, web modal → mobile bottom sheet

## Architecture Pattern

All screen refactors follow the same hook pattern:
```
Screen → useXxx() hook → static data (now) → Wix API (later)
```
Each hook returns `{ data, isLoading, error }` so screens handle all async lifecycle states. When Wix API client goes live, we swap the hook internals — screens don't change.

## Test Health

- **Total**: 82 suites, 1537 tests passing (1 skipped — pre-existing auth)
- **Zero regressions** from all refactors
- **TDD enforced**: tests written before implementation on all new work

## Next Steps

1. melania reviews PRs #19–#23 (5 PRs in queue)
2. Continue screen refactors (cm-0xx ProductDetailScreen, cm-a7m remaining 9 screens)
3. Wix Members auth client (cm-pk5, P0) — blocked on bishop's SDK research
4. Close cm-41j and cm-dy0 after merge
