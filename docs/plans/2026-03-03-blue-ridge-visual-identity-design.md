# Blue Ridge Visual Identity Sprint — Design Doc

**Date:** 2026-03-03
**Lead:** Dallas (cfutons_mobile/crew/dallas)
**Crew:** Dallas, Bishop, Ripley
**Goal:** Align mobile app with web's Blue Ridge Mountain illustrated aesthetic

---

## Context

The web frontend (cfutons rig, Melania) has established a Blue Ridge Mountain
illustrated aesthetic: mountain skyline SVG borders, hand-drawn-style empty state
illustrations, warm sand/espresso color palette, and a watercolor feel.

The mobile app has a solid token foundation (colors, typography, spacing are
numerically aligned with `sharedTokens.js`) and a dark editorial palette with
glassmorphism. However it's missing the illustrated visual identity elements
that give the web its distinctive character.

**Design references:**
- `design.jpeg` (cfutons repo root) — north star visual
- `src/public/sharedTokens.js` — cross-platform brand tokens
- `src/public/MountainSkyline.js` — programmatic SVG mountain skyline
- `src/public/emptyStateIllustrations.js` — 8 Blue Ridge SVG illustrations
- `DESIGN-SYSTEM.md` — full aesthetic specification

---

## Stories

### Story 1: Mountain Skyline SVG Component (Dallas)

**What:** Port `MountainSkyline.js` to React Native using `react-native-svg`.
Create `<MountainSkyline variant="sunrise|sunset" height={120} />` component.

**Where:** `src/components/MountainSkyline.tsx`

**Details:**
- Translate the SVG path data from the web's `generateMountainSVG()` function
- Use brand tokens from `tokens.ts` for gradient colors (skyGradientTop/Bottom, sunsetCoral)
- Support sunrise (blue-gold) and sunset (coral-gold) gradient variants
- Responsive width (fills container), configurable height
- Integrate as section divider on HomeScreen, ShopScreen, ProductDetailScreen

**Dependency:** None — this is the foundation story.

### Story 2: Illustrated Hero Header (Dallas)

**What:** Replace text-only HomeScreen hero with illustrated mountain sunrise
header matching design.jpeg.

**Where:** `src/screens/HomeScreen.tsx`

**Details:**
- Add sky gradient background behind hero section (skyGradientTop → sandBase)
- Place MountainSkyline component as hero backdrop
- Keep "Handcrafted in NC" badge and "Carolina Futons" headline
- Add subtle sunrise glow circle (sunsetCoral) behind mountains
- Maintain dark editorial GlassCard CTAs below

**Dependency:** Story 1 (MountainSkyline component)

### Story 3: Empty State Blue Ridge Illustrations (Bishop)

**What:** Port 8 inline SVG illustrations from web to React Native and wire into
empty state screens.

**Where:**
- New: `src/components/illustrations/` directory (one component per illustration)
- Modified: `src/components/EmptyState.tsx` (add illustration prop)

**Details:**
- Port: cart, search, wishlist, orders, reviews, favorites, compare, returns
- Each illustration becomes a React Native SVG component
- Update EmptyState to accept `illustration` prop (component) alongside `icon`
- Wire illustrations into CartScreen, WishlistScreen, ShopScreen (search),
  OrderHistoryScreen empty states
- Use brand tokens for all colors (no hardcoded hex)

**Dependency:** None — independent of Stories 1/2.

### Story 4: Screen Visual Polish Pass (Ripley)

**What:** Apply dark editorial + warm sand treatment to remaining unpolished
screens for aesthetic consistency.

**Where:** Multiple screens:
- `LoginScreen.tsx` — dark editorial background, GlassCard form
- `SignUpScreen.tsx` — same treatment as Login
- `ForgotPasswordScreen.tsx` — same treatment
- `CheckoutScreen.tsx` — warm sand background, tokenized typography
- `StoreLocatorScreen.tsx` — warm treatment, map styling
- `OrderHistoryScreen.tsx` — dark editorial list treatment
- `NotificationPreferencesScreen.tsx` — consistent toggles

**Details:**
- Apply `darkPalette` or warm sand backgrounds consistently
- Use `GlassCard` for elevated content areas
- Ensure all typography uses `fontFamily` from theme tokens
- Update shadows to use espresso-tinted shadows (not gray)
- Maintain accessibility (contrast ratios, touch targets)

**Dependency:** None — independent of all other stories.

### Story 5: Onboarding Dark Editorial Redesign (Dallas)

**What:** Update OnboardingScreen from light sand to dark editorial palette,
add mountain skyline element.

**Where:** `src/screens/OnboardingScreen.tsx`

**Details:**
- Switch background from sandBase to darkPalette.background
- Update text colors to darkPalette.textPrimary/textMuted
- Add MountainSkyline as visual accent between brand slides
- Use GlassCard for quiz option cards
- Maintain all quiz functionality and auto-advance behavior

**Dependency:** Story 1 (MountainSkyline component)

### Story 6: Cross-Platform Sandbox Verification (All)

**What:** Each crew member tests their work on all three platforms.

**Platforms:**
- iOS Simulator (via `expo start --ios`)
- Android Emulator (via `expo start --android`)
- Expo Web (via `expo start --web`)

**Checklist per platform:**
- [ ] Colors match brand tokens (no gray shadows, no off-brand colors)
- [ ] Typography renders correctly (Playfair Display headings, Source Sans 3 body)
- [ ] Mountain skyline SVG renders at correct proportions
- [ ] Empty state illustrations display cleanly
- [ ] Dark editorial screens have sufficient contrast
- [ ] GlassCard opacity looks correct on each platform
- [ ] No layout overflow or clipping on different screen sizes

---

## Execution Order

```
Phase 1 (parallel):
  Dallas → Story 1 (MountainSkyline component)
  Bishop → Story 3 (empty state illustrations)
  Ripley → Story 4 (screen visual polish)

Phase 2 (after Story 1 lands):
  Dallas → Story 2 (illustrated hero) + Story 5 (onboarding redesign)
  Bishop → Continue Story 3 / sandbox testing
  Ripley → Continue Story 4 / sandbox testing

Phase 3:
  All → Story 6 (cross-platform sandbox verification)
```

## Technical Notes

- `react-native-svg` is likely needed — check if already in dependencies
- SVG illustrations should be React components, not raw strings (unlike web)
- All colors must come from `tokens.ts`, mapping to `sharedTokens.js` values
- Tests: update existing tests, add snapshot tests for new visual components
- Branch: work on `cm-ux-stream3-screens` or new branch per story
