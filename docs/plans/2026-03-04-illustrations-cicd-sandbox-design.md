# Illustrations, CI/CD, and Sandbox Testing Design

**Date:** 2026-03-04
**Author:** cfutons_mobile/crew/dallas
**Branch:** cm-ux-stream3-screens

## Problem

Mobile illustrations are significantly simpler than the web counterparts. The web MountainSkyline has 7 C-curve bezier ridgeline layers, feTurbulence watercolor filters, bird/pine/flora details, and multi-stop gradients. Mobile has 2 flat polygon layers. Empty state illustrations follow a similar pattern — 3 Q-curve layers vs. rich web scenes. No nightly CI exists. No cross-platform sandbox testing has been done.

## Workstream 1: Illustration Upgrade

### MountainSkyline — Match Web Fidelity

Current mobile: 2 layers (mid-ground + foreground), 2-stop gradient, basic linear paths.
Target: 7 C-curve bezier layers with atmospheric opacity ramp, detail elements, rich gradients.

**Port from web:**
- 7 ridgeline layers (distant → front) with C-curve bezier organic paths
- Atmospheric opacity ramp: 0.12 → 0.85 (standard), 0.12 → 0.6 (transparent)
- Layer colors: distant/far = mountainBlue, back→front = espresso (standard mode)
- 5-6 stop sky gradients for sunrise and sunset variants
- Bird silhouettes (4 birds, stroke paths)
- Pine tree outlines (3 trees with triangle canopy layers)
- Wildflower/flora clusters (stem lines + circle blooms)
- Atmospheric haze bands (3 horizontal rects with blur)
- Paper grain overlay (low opacity espresso rect — skip feTurbulence for mobile GPU perf)
- Transparent mode for dark section dividers (different color/opacity ramp)

**Skip for mobile performance:**
- feTurbulence/feDisplacementMap watercolor displacement filter
- feGaussianBlur haze filter (use opacity-only haze instead)
- Paper grain noise filter (use simple low-opacity overlay)

### Empty State Illustrations — Depth Upgrade

Each of the 8 illustrations (Cart, Search, Wishlist, Reviews, Category, Error, NotFound, Stream):
- Upgrade from 3 Q-curve layers to 5 C-curve bezier layers
- Multi-stop gradients (3-stop → 5-stop)
- Scene-specific detail elements (trail markers, cabin smoke, fog wisps, lightning, etc.)
- Consistent viewBox 0 0 280 200, responsive width/height props

### Shared Utilities

Extract into `src/components/illustrations/shared.ts`:
- Mountain path generator (C-curve bezier with wobble offsets)
- Gradient preset configs
- Detail element builders (birds, trees, flora)
- Opacity ramp constants

## Workstream 2: Melania Coordination

- No standalone Figma file — design direction from design.jpeg, sharedTokens.js, CLAUDE.md
- Send Melania illustration upgrade plan for review
- Request sign-off on skipping feTurbulence for mobile perf
- Send post-implementation screenshots from sandbox testing
- Advised Melania to set up matching nightly CI for cfutons web repo

## Workstream 3: Sandbox Testing

### Platforms
- iOS Simulator (iPhone 15 Pro)
- Android Emulator (Pixel 7)
- Web browser (Expo web export)

### Screens to Test
Home, Shop, ProductDetail, Cart, Account, Onboarding + all empty states

### Report Format
| Platform | Screen | Status | Issues |
|----------|--------|--------|--------|
| iOS      | Home   | pass/fail | description |

### Focus Areas
- SVG rendering fidelity (gradients, paths, opacity)
- Dark mode contrast and readability
- MountainSkyline proportions at different screen sizes
- Empty state illustration alignment and scaling
- GlassCard glassmorphism rendering per platform

## Workstream 4: Nightly CI/CD

### New Workflow: `.github/workflows/nightly.yml`

**Schedule:** `cron: '0 4 * * *'` (4 AM UTC daily)

**Jobs:**

1. **test** — `npx jest --ci --coverage` with coverage threshold enforcement
2. **typecheck** — `npx tsc --noEmit` strict TypeScript
3. **lint** — `npx eslint src/ --ext .ts,.tsx`
4. **catalog-sync** — `npx tsx scripts/sync-3d-catalog.ts --check`
5. **build-ios** — `expo prebuild --platform ios` + xcodebuild compile check
6. **build-android** — `expo prebuild --platform android` + Gradle build
7. **build-web** — `expo export --platform web` bundle verification

**Infrastructure:**
- iOS build requires `macos-latest` runner
- Android/test/lint/typecheck on `ubuntu-latest`
- Coverage reports + build artifacts retained 7 days
- Failure notifications via GitHub Actions email

## Success Criteria

- MountainSkyline visually matches web version's depth and detail (minus filter effects)
- All 8 empty state illustrations have 5+ layers with organic paths and scene details
- Nightly CI runs all jobs without failure on main branch
- Sandbox test report covers all screens on all 3 platforms
- Melania approves visual quality
- All existing tests continue to pass
