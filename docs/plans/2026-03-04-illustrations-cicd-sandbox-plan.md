# Illustrations, Nightly CI/CD, and Sandbox Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade all SVG illustrations to match web fidelity (7-layer mountains, organic paths, detail elements), add nightly CI/CD pipeline, and produce a cross-platform sandbox testing report.

**Architecture:** Shared illustration utilities provide mountain path generators, gradient presets, and detail element builders used by MountainSkyline and all 8 empty state illustrations. A new GitHub Actions nightly workflow runs full test + lint + typecheck + build verification. Sandbox testing uses Expo dev client on iOS Simulator, Android Emulator, and web.

**Tech Stack:** React Native 0.76, Expo SDK 52, react-native-svg, GitHub Actions, Jest, TypeScript

---

### Task 1: Shared Illustration Utilities

**Files:**
- Create: `src/components/illustrations/shared.ts`
- Test: `src/components/illustrations/__tests__/shared.test.ts`

**Step 1: Write the failing test**

```typescript
// src/components/illustrations/__tests__/shared.test.ts
import {
  buildCBezierMountainPath,
  buildBirds,
  buildPineTrees,
  buildFlora,
  MOUNTAIN_LAYER_CONFIGS,
  GRADIENT_PRESETS_MULTI,
} from '../shared';

describe('shared illustration utilities', () => {
  describe('buildCBezierMountainPath', () => {
    it('returns a valid SVG path starting with M and ending with Z', () => {
      const path = buildCBezierMountainPath(200, 0.4, 42);
      expect(path).toMatch(/^M0,200/);
      expect(path).toMatch(/Z$/);
    });

    it('uses C-curve bezier segments', () => {
      const path = buildCBezierMountainPath(200, 0.5, 1);
      expect(path).toContain('C');
    });

    it('produces different paths for different seeds', () => {
      const path1 = buildCBezierMountainPath(200, 0.5, 1);
      const path2 = buildCBezierMountainPath(200, 0.5, 2);
      expect(path1).not.toBe(path2);
    });
  });

  describe('MOUNTAIN_LAYER_CONFIGS', () => {
    it('has 7 layers', () => {
      expect(MOUNTAIN_LAYER_CONFIGS).toHaveLength(7);
    });

    it('each layer has name, baseHeight, and seed', () => {
      for (const layer of MOUNTAIN_LAYER_CONFIGS) {
        expect(layer).toHaveProperty('name');
        expect(layer).toHaveProperty('baseHeight');
        expect(layer).toHaveProperty('seed');
      }
    });

    it('layers progress from distant (high) to front (low)', () => {
      const heights = MOUNTAIN_LAYER_CONFIGS.map((l) => l.baseHeight);
      for (let i = 1; i < heights.length; i++) {
        expect(heights[i]).toBeGreaterThanOrEqual(heights[i - 1]);
      }
    });
  });

  describe('GRADIENT_PRESETS_MULTI', () => {
    it('has sunrise and sunset presets', () => {
      expect(GRADIENT_PRESETS_MULTI).toHaveProperty('sunrise');
      expect(GRADIENT_PRESETS_MULTI).toHaveProperty('sunset');
    });

    it('each preset has 5+ stops', () => {
      expect(GRADIENT_PRESETS_MULTI.sunrise.length).toBeGreaterThanOrEqual(5);
      expect(GRADIENT_PRESETS_MULTI.sunset.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('detail element builders', () => {
    it('buildBirds returns array of bird configs', () => {
      const birds = buildBirds(1440, 200);
      expect(birds.length).toBeGreaterThanOrEqual(3);
      for (const bird of birds) {
        expect(bird).toHaveProperty('path');
        expect(bird).toHaveProperty('strokeWidth');
      }
    });

    it('buildPineTrees returns array of tree configs', () => {
      const trees = buildPineTrees(1440, 200);
      expect(trees.length).toBeGreaterThanOrEqual(2);
      for (const tree of trees) {
        expect(tree).toHaveProperty('trunk');
        expect(tree).toHaveProperty('canopyLayers');
      }
    });

    it('buildFlora returns array of flora configs', () => {
      const flora = buildFlora(1440, 200);
      expect(flora.length).toBeGreaterThanOrEqual(3);
      for (const item of flora) {
        expect(item).toHaveProperty('stem');
        expect(item).toHaveProperty('bloom');
      }
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest --no-coverage --testPathPattern "illustrations/__tests__/shared" -v`
Expected: FAIL — cannot find module '../shared'

**Step 3: Write the implementation**

```typescript
// src/components/illustrations/shared.ts
import { colors } from '@/theme/tokens';

// ── 7-layer mountain configs (distant → front) ──────────────────────
// baseHeight: fraction of viewBox height where ridge sits (0 = top, 1 = bottom)
// Higher baseHeight = closer/lower mountain

export const MOUNTAIN_LAYER_CONFIGS = [
  { name: 'distant', baseHeight: 0.32, seed: 42 },
  { name: 'far', baseHeight: 0.41, seed: 17 },
  { name: 'back', baseHeight: 0.48, seed: 73 },
  { name: 'mid-far', baseHeight: 0.55, seed: 29 },
  { name: 'mid', baseHeight: 0.62, seed: 61 },
  { name: 'mid-near', baseHeight: 0.72, seed: 88 },
  { name: 'front', baseHeight: 0.80, seed: 55 },
] as const;

// Atmospheric opacity ramp: distant (faint) → front (solid)
export const STANDARD_OPACITIES = [0.12, 0.18, 0.25, 0.38, 0.5, 0.68, 0.85];
export const TRANSPARENT_OPACITIES = [0.12, 0.18, 0.28, 0.35, 0.42, 0.52, 0.6];

// Standard layer colors: distant blue haze → espresso foreground
export const STANDARD_LAYER_COLORS = [
  colors.mountainBlue,
  colors.mountainBlue,
  colors.espresso,
  colors.espresso,
  colors.espresso,
  colors.espresso,
  colors.espresso,
];

export const TRANSPARENT_LAYER_COLORS = [
  colors.mountainBlueLight,
  colors.mountainBlueLight,
  colors.mountainBlueLight,
  colors.sandBase,
  colors.sandBase,
  colors.espressoLight,
  colors.espressoLight,
];

// ── Multi-stop gradient presets (5-6 stops for rich sky) ─────────────

export interface GradientStop {
  offset: string;
  color: string;
  opacity: number;
}

export const GRADIENT_PRESETS_MULTI: Record<string, GradientStop[]> = {
  sunrise: [
    { offset: '0%', color: colors.skyGradientTop, opacity: 1 },
    { offset: '20%', color: colors.mountainBlueLight, opacity: 0.9 },
    { offset: '45%', color: colors.skyGradientBottom, opacity: 0.7 },
    { offset: '70%', color: colors.sandLight, opacity: 0.8 },
    { offset: '85%', color: colors.sunsetCoralLight, opacity: 0.5 },
    { offset: '100%', color: colors.sandLight, opacity: 0.6 },
  ],
  sunset: [
    { offset: '0%', color: colors.mountainBlueDark, opacity: 0.6 },
    { offset: '15%', color: colors.sunsetCoral, opacity: 0.7 },
    { offset: '35%', color: colors.skyGradientBottom, opacity: 0.8 },
    { offset: '55%', color: colors.sunsetCoralLight, opacity: 0.7 },
    { offset: '80%', color: colors.sunsetCoralLight, opacity: 0.5 },
    { offset: '100%', color: colors.sandLight, opacity: 0.4 },
  ],
};

// ── Seeded pseudo-random for deterministic path wobble ───────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── C-curve bezier mountain path generator ───────────────────────────

export function buildCBezierMountainPath(
  vbH: number,
  baseHeightFraction: number,
  seed: number,
  vbW: number = 1440,
  segments: number = 10,
): string {
  const rand = seededRandom(seed);
  const baseY = vbH * baseHeightFraction;
  const amplitude = vbH * 0.15;
  const segWidth = vbW / segments;

  let d = `M0,${vbH} L0,${Math.round(baseY)}`;

  for (let i = 0; i < segments; i++) {
    const x0 = i * segWidth;
    const x3 = (i + 1) * segWidth;
    const wobble1 = (rand() - 0.5) * amplitude;
    const wobble2 = (rand() - 0.5) * amplitude;
    const wobble3 = (rand() - 0.5) * amplitude * 0.8;
    const cp1x = x0 + segWidth * 0.33;
    const cp1y = baseY + wobble1;
    const cp2x = x0 + segWidth * 0.66;
    const cp2y = baseY + wobble2;
    const endY = baseY + wobble3;
    d += ` C${Math.round(cp1x)},${Math.round(cp1y)} ${Math.round(cp2x)},${Math.round(cp2y)} ${Math.round(x3)},${Math.round(endY)}`;
  }

  d += ` L${vbW},${vbH} Z`;
  return d;
}

// ── Compact path builder for small illustrations (280×200) ───────────

export function buildSmallMountainPath(
  vbW: number,
  vbH: number,
  baseHeightFraction: number,
  seed: number,
  segments: number = 6,
): string {
  return buildCBezierMountainPath(vbH, baseHeightFraction, seed, vbW, segments);
}

// ── Detail element builders ──────────────────────────────────────────

export interface BirdConfig {
  path: string;
  strokeWidth: number;
  x: number;
  y: number;
}

export function buildBirds(vbW: number, vbH: number): BirdConfig[] {
  const spread = vbW / 5;
  return [
    { path: `M${spread * 1},${vbH * 0.18} C${spread * 1 + 5},${vbH * 0.15} ${spread * 1 + 10},${vbH * 0.14} ${spread * 1 + 15},${vbH * 0.16} C${spread * 1 + 20},${vbH * 0.14} ${spread * 1 + 25},${vbH * 0.15} ${spread * 1 + 30},${vbH * 0.18}`, strokeWidth: 1.2, x: spread * 1, y: vbH * 0.18 },
    { path: `M${spread * 2.5},${vbH * 0.13} C${spread * 2.5 + 4},${vbH * 0.10} ${spread * 2.5 + 7},${vbH * 0.09} ${spread * 2.5 + 10},${vbH * 0.11} C${spread * 2.5 + 13},${vbH * 0.09} ${spread * 2.5 + 16},${vbH * 0.10} ${spread * 2.5 + 20},${vbH * 0.13}`, strokeWidth: 1.0, x: spread * 2.5, y: vbH * 0.13 },
    { path: `M${spread * 3.5},${vbH * 0.20} C${spread * 3.5 + 3},${vbH * 0.18} ${spread * 3.5 + 5},${vbH * 0.17} ${spread * 3.5 + 8},${vbH * 0.19} C${spread * 3.5 + 11},${vbH * 0.17} ${spread * 3.5 + 13},${vbH * 0.18} ${spread * 3.5 + 16},${vbH * 0.20}`, strokeWidth: 0.8, x: spread * 3.5, y: vbH * 0.20 },
    { path: `M${spread * 4},${vbH * 0.15} C${spread * 4 + 3},${vbH * 0.13} ${spread * 4 + 6},${vbH * 0.12} ${spread * 4 + 8},${vbH * 0.14} C${spread * 4 + 10},${vbH * 0.12} ${spread * 4 + 13},${vbH * 0.13} ${spread * 4 + 16},${vbH * 0.15}`, strokeWidth: 0.9, x: spread * 4, y: vbH * 0.15 },
  ];
}

export interface TreeConfig {
  trunk: { x: number; y: number; width: number; height: number };
  canopyLayers: { path: string; opacity: number }[];
}

export function buildPineTrees(vbW: number, vbH: number): TreeConfig[] {
  const positions = [vbW * 0.14, vbW * 0.65, vbW * 0.85];
  return positions.map((x) => {
    const trunkH = vbH * 0.15;
    const trunkW = vbW * 0.003;
    const trunkY = vbH * 0.70;
    const spread = vbW * 0.014;
    return {
      trunk: { x, y: trunkY, width: trunkW, height: trunkH },
      canopyLayers: [
        { path: `M${x - spread},${trunkY + trunkH * 0.35} C${x - spread * 0.5},${trunkY - trunkH * 0.1} ${x + spread * 0.5},${trunkY - trunkH * 0.1} ${x + spread},${trunkY + trunkH * 0.35}`, opacity: 0.45 },
        { path: `M${x - spread * 0.8},${trunkY + trunkH * 0.2} C${x - spread * 0.3},${trunkY - trunkH * 0.25} ${x + spread * 0.3},${trunkY - trunkH * 0.25} ${x + spread * 0.8},${trunkY + trunkH * 0.2}`, opacity: 0.55 },
        { path: `M${x - spread * 0.6},${trunkY + trunkH * 0.05} C${x - spread * 0.15},${trunkY - trunkH * 0.35} ${x + spread * 0.15},${trunkY - trunkH * 0.35} ${x + spread * 0.6},${trunkY + trunkH * 0.05}`, opacity: 0.65 },
      ],
    };
  });
}

export interface FloraConfig {
  stem: { x1: number; y1: number; x2: number; y2: number; strokeWidth: number };
  bloom: { cx: number; cy: number; r: number; color: string };
}

export function buildFlora(vbW: number, vbH: number): FloraConfig[] {
  const positions = [
    { x: vbW * 0.10, bloomColor: colors.sunsetCoral },
    { x: vbW * 0.11, bloomColor: colors.sandBase },
    { x: vbW * 0.47, bloomColor: colors.sunsetCoral },
    { x: vbW * 0.49, bloomColor: colors.mountainBlueLight },
    { x: vbW * 0.90, bloomColor: colors.sunsetCoral },
    { x: vbW * 0.92, bloomColor: colors.sandBase },
  ];
  return positions.map(({ x, bloomColor }) => ({
    stem: { x1: x, y1: vbH * 0.90, x2: x + 1, y2: vbH * 0.84, strokeWidth: 1 },
    bloom: { cx: x, cy: vbH * 0.83, r: vbW * 0.002 + 1.5, color: bloomColor },
  }));
}
```

**Step 4: Run tests to verify they pass**

Run: `npx jest --no-coverage --testPathPattern "illustrations/__tests__/shared" -v`
Expected: PASS — all tests green

**Step 5: Commit**

```bash
git add src/components/illustrations/shared.ts src/components/illustrations/__tests__/shared.test.ts
git commit -m "feat: shared illustration utilities — mountain paths, gradients, detail builders"
```

---

### Task 2: MountainSkyline Upgrade to 7-Layer Fidelity

**Files:**
- Modify: `src/components/MountainSkyline.tsx`
- Modify: `src/components/__tests__/MountainSkyline.test.tsx`

**Step 1: Write additional failing tests**

Add to `src/components/__tests__/MountainSkyline.test.tsx`:

```typescript
import { MOUNTAIN_LAYER_CONFIGS } from '../illustrations/shared';

// ... existing tests above ...

it('renders 7 mountain layers', () => {
  const { toJSON } = render(<MountainSkyline testID="skyline-layers" />, { wrapper });
  const tree = toJSON();
  // Count Path elements — should have 7 mountain layers + atmospheric haze rects
  const svg = tree!.children?.find((c: any) => c.type === 'Svg') || tree;
  const paths = JSON.stringify(svg).match(/"type":"Path"/g) || [];
  expect(paths.length).toBeGreaterThanOrEqual(7);
});

it('renders bird detail elements', () => {
  const { toJSON } = render(<MountainSkyline testID="skyline-birds" showDetails />, { wrapper });
  const json = JSON.stringify(toJSON());
  // Birds use stroke paths with no fill
  expect(json).toContain('"fill":"none"');
});

it('renders transparent variant for dark dividers', () => {
  const { getByTestId } = render(
    <MountainSkyline testID="skyline-transparent" transparent />,
    { wrapper },
  );
  expect(getByTestId('skyline-transparent')).toBeTruthy();
});

it('accepts showDetails prop to render birds, trees, flora', () => {
  const { getByTestId } = render(
    <MountainSkyline testID="skyline-details" showDetails />,
    { wrapper },
  );
  expect(getByTestId('skyline-details')).toBeTruthy();
});
```

**Step 2: Run tests to verify new tests fail**

Run: `npx jest --no-coverage --testPathPattern "MountainSkyline" -v`
Expected: FAIL — `showDetails` and `transparent` props not supported, only 2 layers

**Step 3: Rewrite MountainSkyline with 7-layer architecture**

Replace `src/components/MountainSkyline.tsx` with full implementation using:
- `MOUNTAIN_LAYER_CONFIGS` for 7 C-curve bezier layers
- `GRADIENT_PRESETS_MULTI` for 5-6 stop gradients
- `buildBirds`, `buildPineTrees`, `buildFlora` for detail elements
- `STANDARD_OPACITIES` / `TRANSPARENT_OPACITIES` for atmospheric depth
- `STANDARD_LAYER_COLORS` / `TRANSPARENT_LAYER_COLORS` for mode switching
- New props: `transparent?: boolean`, `showDetails?: boolean` (default true)
- 3 atmospheric haze Rect elements (opacity-only, no filter)
- Paper grain overlay Rect at 0.06 opacity
- Keep existing props: `variant`, `height`, `showGlow`, `style`, `testID`

Key structure:
```
<Svg>
  <Defs> multi-stop gradient + glow radial </Defs>
  <Rect sky background />
  {showGlow && <Circle glow />}
  {birds}
  {7 mountain layer <Path> elements}
  {atmospheric haze rects}
  {pine trees}
  {flora}
  <Rect paper grain overlay />
</Svg>
```

**Step 4: Run all MountainSkyline tests**

Run: `npx jest --no-coverage --testPathPattern "MountainSkyline" -v`
Expected: PASS — all old + new tests green

**Step 5: Run full test suite to check nothing broke**

Run: `npx jest --no-coverage`
Expected: 105+ suites, all pass

**Step 6: Commit**

```bash
git add src/components/MountainSkyline.tsx src/components/__tests__/MountainSkyline.test.tsx
git commit -m "feat(MountainSkyline): upgrade to 7-layer fidelity with birds, trees, flora"
```

---

### Task 3: Empty State Illustrations Upgrade (Batch)

**Files:**
- Modify: `src/components/illustrations/CartIllustration.tsx`
- Modify: `src/components/illustrations/SearchIllustration.tsx`
- Modify: `src/components/illustrations/WishlistIllustration.tsx`
- Modify: `src/components/illustrations/ReviewsIllustration.tsx`
- Modify: `src/components/illustrations/CategoryIllustration.tsx`
- Modify: `src/components/illustrations/ErrorIllustration.tsx`
- Modify: `src/components/illustrations/NotFoundIllustration.tsx`
- Modify: `src/components/illustrations/StreamIllustration.tsx`
- Modify: `src/components/illustrations/__tests__/illustrations.test.tsx`

**Step 1: Add depth-checking tests**

Add to `src/components/illustrations/__tests__/illustrations.test.tsx`:

```typescript
it('has at least 5 Path elements for mountain depth', () => {
  const { toJSON } = render(<Component />);
  const json = JSON.stringify(toJSON());
  const paths = json.match(/"type":"Path"/g) || [];
  expect(paths.length).toBeGreaterThanOrEqual(5);
});
```

**Step 2: Run tests to verify new test fails**

Run: `npx jest --no-coverage --testPathPattern "illustrations/__tests__/illustrations" -v`
Expected: FAIL — current illustrations have only 3-4 paths

**Step 3: Upgrade each illustration**

For each of the 8 illustrations, apply:
- Replace Q-curve paths with C-curve bezier paths using `buildSmallMountainPath()` from shared.ts
- Increase from 3 layers to 5 mountain layers (distant, far, mid, near, front)
- Upgrade gradients from 2-3 stops to 4-5 stops
- Add scene-specific detail elements:
  - **Cart**: trail marker posts, small footpath
  - **Search**: fog wisps (Ellipse), distant bird
  - **Wishlist**: cabin chimney smoke (curved Path), more tree detail
  - **Reviews**: sun rays (Line elements), enhanced glow
  - **Category**: tree trunks with canopy layers, forest path
  - **Error**: additional lightning bolts, darker cloud layers
  - **NotFound**: deeper fog layers, faint trail disappearing
  - **Stream**: water ripple circles, rocks (Ellipse)

**Step 4: Run tests to verify all pass**

Run: `npx jest --no-coverage --testPathPattern "illustrations" -v`
Expected: PASS — all illustration tests green including new depth check

**Step 5: Commit**

```bash
git add src/components/illustrations/
git commit -m "feat(illustrations): upgrade all 8 empty states to 5-layer C-bezier depth"
```

---

### Task 4: Nightly CI/CD Workflow

**Files:**
- Create: `.github/workflows/nightly.yml`
- Test: (manual — verify YAML syntax)

**Step 1: Write the workflow file**

```yaml
# .github/workflows/nightly.yml
name: Nightly Integration

on:
  schedule:
    - cron: '0 4 * * *'  # 4 AM UTC daily
  workflow_dispatch:  # Allow manual trigger

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - name: Run tests with coverage
        run: npx jest --ci --coverage --coverageReporters=text --coverageReporters=lcov
      - name: Upload coverage
        if: matrix.node-version == 20
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx eslint src/ --ext .ts,.tsx

  catalog-sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsx scripts/sync-3d-catalog.ts --check

  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Export web bundle
        run: npx expo export --platform web
      - uses: actions/upload-artifact@v4
        with:
          name: web-bundle
          path: dist/
          retention-days: 7

  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Prebuild iOS
        run: npx expo prebuild --platform ios --no-install
      - name: Build iOS (Release, no codesign)
        run: |
          xcodebuild -workspace ios/*.xcworkspace \
            -scheme CarolinaFutonsMobile \
            -configuration Release \
            -sdk iphonesimulator \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
            CODE_SIGNING_ALLOWED=NO \
            build 2>&1 | tail -20

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - run: npm ci
      - name: Prebuild Android
        run: npx expo prebuild --platform android --no-install
      - name: Build Android (Release)
        run: cd android && ./gradlew assembleRelease --no-daemon 2>&1 | tail -20
```

**Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/nightly.yml'))" && echo "Valid YAML"`
Expected: "Valid YAML"

**Step 3: Commit**

```bash
git add .github/workflows/nightly.yml
git commit -m "ci: add nightly integration workflow — test, lint, typecheck, build iOS/Android/web"
```

---

### Task 5: Sandbox Testing and Report

**Files:**
- Create: `docs/reports/2026-03-04-sandbox-testing-report.md`

**Step 1: Start Expo dev server**

Run: `npx expo start` (in background)

**Step 2: Test on iOS Simulator**

Run: `npx expo run:ios --device "iPhone 15 Pro"`

Navigate through all screens: Home, Shop, ProductDetail (tap a product), Cart, Account, Onboarding.
For each screen, note:
- SVG rendering quality (gradients, paths, opacity layers)
- Dark mode contrast
- MountainSkyline proportions
- GlassCard glassmorphism effect
- Empty state illustrations (trigger by clearing cart, searching for nonexistent item)

**Step 3: Test on Android Emulator**

Run: `npx expo run:android`

Same screen walkthrough as iOS.

**Step 4: Test on Web**

Run: `npx expo export --platform web && npx serve dist/`

Same screen walkthrough in browser.

**Step 5: Write report**

Create `docs/reports/2026-03-04-sandbox-testing-report.md`:

```markdown
# Sandbox Testing Report — 2026-03-04

## Summary
| Platform | Screens Tested | Pass | Fail | Issues |
|----------|---------------|------|------|--------|
| iOS Simulator (iPhone 15 Pro) | 6 | ? | ? | ... |
| Android Emulator (Pixel 7) | 6 | ? | ? | ... |
| Web (Chrome) | 6 | ? | ? | ... |

## Screen-by-Screen Results

### HomeScreen
| Platform | Status | Notes |
|----------|--------|-------|
| iOS | | |
| Android | | |
| Web | | |

### ShopScreen
...

### ProductDetailScreen
...

### CartScreen
...

### AccountScreen
...

### OnboardingScreen
...

## MountainSkyline Rendering
- [ ] 7 layers visible with atmospheric depth
- [ ] Gradient colors match brand tokens
- [ ] Bird/tree/flora details render at correct scale
- [ ] Transparent mode works on dark sections

## Empty State Illustrations
- [ ] 5-layer depth visible
- [ ] C-curve paths render smoothly (no jagged edges)
- [ ] Scene details visible at default size

## Issues Found
1. ...

## Recommendations
1. ...
```

**Step 6: Commit report**

```bash
git add docs/reports/2026-03-04-sandbox-testing-report.md
git commit -m "docs: sandbox testing report — iOS, Android, web"
```

---

### Task 6: Send Melania Screenshots + Status

**Step 1: Capture key screenshots**

Take screenshots of Home, Shop, and one empty state on each platform.

**Step 2: Send status to Melania**

```bash
gt mail send cfutons/crew/melania -s "Illustration upgrade complete + sandbox report" -m "..."
```

Include: what was upgraded, test results, link to report doc, request for visual sign-off.

**Step 3: Push branch and update PR**

```bash
git push
gh pr edit 45 --body "..." # Updated body with new workstream results
```

---

Plan complete and saved to `docs/plans/2026-03-04-illustrations-cicd-sandbox-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

Which approach?