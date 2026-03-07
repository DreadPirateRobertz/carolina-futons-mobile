# Sprint 2: Beta Launch Sprint — Design

> **Status:** Proposed. Pending user approval.
> **Builds on:** Sprint 1 (AR-Led, Stability-Guaranteed) — Phase 1 complete at framework level.
> **Goal:** Ship installable beta to TestFlight + Play Store internal track.

---

## Where We Are

Sprint 1 delivered framework-level implementations for all Phase 1 items:
- Sentry crash reporting wired into App.tsx
- Firebase + Mixpanel analytics live
- Push notification token registration with retry
- Offline queue with stale-while-revalidate caching
- AR measurement tool, comparison mode, multi-product staging
- UX animation hooks (cart bounce, fabric swatch transitions)
- 2460+ tests passing, zero TS strict errors

**What's missing for beta:** Production wiring, real API endpoints, EAS build pipeline, deep linking, and quality hardening. The framework is built — now we connect it to reality.

---

## Sprint 2 Architecture: Three Tracks

### Track A: Polecat Hardening (5 parallel workers)

Five polecats harden the framework code into production-ready modules:

| Bead | Polecat | Scope |
|------|---------|-------|
| cm-5w6 | dementus | Sentry: real DSN, source maps upload, release tracking, breadcrumb verification |
| cm-jn1 | furiosa | AR measurement: accuracy calibration, unit conversion edge cases, fit/no-fit UX |
| cm-nsh | nux | UX motion: shared element transitions (product list -> detail), spring tuning, reduced-motion respect |
| cm-8ul | rictus | Offline-first: exponential backoff on replay, queue persistence across cold restart, conflict resolution |
| cm-5no | slit | Push notifications: backend token storage, order-status webhook trigger, notification grouping |

**Standard for all polecats:** TDD (red-green-refactor), `renderHook`/`renderHookAsync` patterns from RNTL v13, no mocks unless unavoidable.

### Track B: Crew Integration (Bishop + Ripley)

| Worker | Current | Next (after handoff) |
|--------|---------|---------------------|
| Bishop | cm-uyy (Wix API) | Wire offline queue replay to Wix REST endpoints |
| Ripley | cm-cea (Wishlist/cart sync) | Stripe PaymentIntent flow + checkout integration |

### Track C: Dallas Sprint Leadership

Dallas owns cross-cutting work that polecats and crew depend on:

1. **EAS Build Pipeline**
2. **Deep Linking + Universal Links**
3. **Sprint coordination + quality gates**

---

## Detailed Plans

### C1. EAS Build Pipeline

**Why:** No beta without a build. This unblocks TestFlight + Play Console distribution.

**Configuration** (from Expo EAS docs):

```json
// eas.json
{
  "cli": { "version": ">= 3.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "...", "ascAppId": "...", "appleTeamId": "..." },
      "android": { "serviceAccountKeyPath": "./google-services.json", "track": "internal" }
    }
  }
}
```

**EAS Update** for OTA hotfixes post-beta:
- `preview` channel maps to preview builds
- `production` channel maps to production builds
- Runtime version policy: `"appVersion"` — updates only apply to matching binary version

**Files:**
- Create: `eas.json`
- Modify: `app.json` (add `runtimeVersion`, `updates.url`, submit config)
- Create: `.easignore` (exclude dev-only files from build)

### C2. Deep Linking + Universal Links

**Why:** Beta testers need to share product links that open directly in the app.

**Scheme setup** (app.json):
```json
{
  "expo": {
    "scheme": "carolinafutons",
    "ios": {
      "associatedDomains": ["applinks:carolinafutons.com"],
      "bundleIdentifier": "com.carolinafutons.mobile"
    },
    "android": {
      "intentFilters": [{
        "action": "VIEW",
        "autoVerify": true,
        "data": [{ "scheme": "https", "host": "carolinafutons.com", "pathPrefix": "/products" }],
        "category": ["BROWSABLE", "DEFAULT"]
      }]
    }
  }
}
```

**AASA file** (hosted at `carolinafutons.com/.well-known/apple-app-site-association`):
```json
{
  "applinks": {
    "details": [{
      "appID": "<TEAM_ID>.com.carolinafutons.mobile",
      "paths": ["/products/*", "/ar/*", "/collections/*"]
    }]
  }
}
```

**Route mapping:**
- `carolinafutons://products/:id` -> ProductDetailScreen
- `carolinafutons://ar/:modelId` -> ARScreen (direct to AR view)
- `carolinafutons://collections/:slug` -> filtered CatalogScreen
- `https://carolinafutons.com/products/:id` -> universal link

**Files:**
- Modify: `app.json` (scheme, associatedDomains, intentFilters)
- Create: `public/.well-known/apple-app-site-association`
- Modify: expo-router layout files for deep link params

### C3. Shared Element Transitions (UX Polish)

**Why:** Premium feel when navigating product list -> detail. Uses Reanimated `sharedTransitionTag`.

**Pattern** (from Reanimated docs):
```tsx
// In ProductCard (list screen)
<Animated.Image
  sharedTransitionTag={`product-image-${product.id}`}
  source={{ uri: product.imageUrl }}
/>

// In ProductDetailScreen
<Animated.Image
  sharedTransitionTag={`product-image-${product.id}`}
  source={{ uri: product.imageUrl }}
/>
```

Nux (cm-nsh) handles implementation. Dallas provides the architectural pattern and reviews.

### C4. Testing Standards Upgrade

Adopt RNTL v13 patterns across the test suite:

- Use `renderHookAsync` for hooks with async initialization (replaces `await act(async () => {})` pattern)
- Use `wrapper` option for hooks needing context providers
- Respect `concurrentRoot: true` default (React 18+ concurrent mode)
- Continue `AsyncStorage.getItem as jest.Mock` pattern for storage tests

---

## Quality Gates (Beta Release Criteria)

All must pass before `eas build --profile preview`:

| Gate | Metric | Current | Target |
|------|--------|---------|--------|
| Tests | Pass rate | 2460/2460 | 100% (no skip/pending) |
| TS Strict | Errors | 0 | 0 |
| Sentry | Verified | Framework only | Real DSN, test error visible in dashboard |
| Deep links | Working | Not configured | `carolinafutons://products/asheville` opens correct screen |
| Offline | Verified | Framework only | Queue replays to real Wix endpoints after reconnect |
| Payments | Working | Framework only | Stripe test mode PaymentIntent completes |
| AR models | Available | PoC models | Min 5 real product GLB/USDZ on CDN |
| Illustrations | Available | Blocked | Figma assets from Rennala (hq-i6ep) |

---

## Timeline

| Day | Track A (Polecats) | Track B (Crew) | Track C (Dallas) |
|-----|-------------------|----------------|-------------------|
| 1-2 | Polecats claim + start TDD | Bishop: Wix API cont. / Ripley: cart sync cont. | EAS build pipeline setup |
| 3-4 | Core implementation | Bishop: offline queue wiring | Deep linking + universal links |
| 5-6 | Testing + edge cases | Ripley: Stripe integration | Shared element transition review |
| 7 | PR review + merge | PR review + merge | Integration testing |
| 8 | Buffer | Buffer | Preview build + smoke test |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Sling infrastructure broken | Polecats can't start | Escalated to mayor; manual polecat assignment as fallback |
| Figma illustrations delayed | Beta ships with placeholder art | Acceptable for internal beta; production requires real assets |
| Stripe test keys not available | Checkout untestable | Use Stripe test mode keys; mock payment sheet in tests |
| AASA file hosting | Universal links won't verify | Need access to carolinafutons.com server; fallback to scheme-only deep links |
| AR model CDN | No production models | Commission 5 priority models (Asheville, Blue Ridge, Appalachian, Smoky, Piedmont) |

---

## Success = Installable Beta

Sprint 2 ends when a non-developer can:
1. Install via TestFlight / Play Console internal track
2. Browse products with shared element transitions
3. Open a deep link to a product
4. Place a futon in AR, measure the room, compare sizes
5. Add to cart, complete checkout with Stripe test card
6. Receive a push notification for order status
7. Use the app offline and see data sync on reconnect
8. Any crash automatically appears in Sentry
