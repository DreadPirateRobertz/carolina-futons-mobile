# cm-spin: Spin Wheel — Native vs WebView Spike

**Date:** 2026-03-23
**Author:** dallas
**Bead:** cm-spin (P3, 1-day spike)

---

## Summary Recommendation

**Build native with react-native-reanimated + react-native-svg.**

WebView is a trap here. Native is faster, more maintainable, and already mostly paid for by our existing stack.

---

## Context

The spin wheel lives in the Loyalty screen (`initialTab: 'spin'`). Notification type `daily_spin_reminder` already routes users to it via deep link. The screen doesn't exist yet — this spike determines how to build it.

---

## Option A: Native (react-native-reanimated + react-native-svg)

### What we'd build
- SVG `<Pie>` segments rendered via `react-native-svg` (already installed: `15.8.0`)
- Rotation driven by `useSharedValue` + `withTiming/withSpring` from reanimated (`~3.16.0` — already installed)
- Pointer/indicator: static SVG triangle at top
- Spin tap → `withTiming` to calculated final angle (server-seeded random prize)
- Prize reveal: slide-up modal using reanimated (same pattern as `TierCelebrationModal`)

### Pros
- **Zero new dependencies** — SVG + reanimated already in the tree
- **60fps guaranteed** — reanimated runs on the UI thread, no bridge crossing
- **Fully themeable** — segments use design tokens (espresso, mountain blue, coral, sand)
- **Testable** — jest-friendly (reanimated mock already in `jest.setup.js`)
- **iOS + Android parity** — same code path, no WebView quirks
- **Offline-capable** — spin logic works without network (random seed cached)

### Cons
- Need to hand-code the segment geometry (pie slice paths via `d` attribute)
- More upfront code: ~180 lines for the wheel + ~60 for the animation hook

### Estimated complexity
- `SpinWheelCanvas.tsx` — SVG pie + rotation: **~180 lines**
- `useSpinWheel.ts` — animation state + prize calc: **~60 lines**
- `SpinScreen.tsx` — screen + CTA button: **~80 lines**
- Tests: **~40 lines**
- **Total: ~360 lines, 1 crew-day**

---

## Option B: Lottie (lottie-react-native)

### What we'd build
- Pre-exported `.json` animation from Lottie/After Effects
- `<LottieView>` component plays the spin animation
- Sync segment stops to frame ranges

### Assessment

**Not recommended for this use case.**

Lottie shines for icon micro-animations and fixed-path animations. A spin wheel requires:
- **Programmatic control** — the final angle is server-seeded, not fixed
- **Dynamic segments** — number of prizes, labels, and colors come from Wix CMS
- **Pause at arbitrary frame** — lottie supports `progress` prop but syncing prize position to frame math is fragile

Additionally:
- `lottie-react-native` is **not in our tree** — adds ~2MB native module
- Requires native rebuild (`expo run:ios / run:android`) to install
- Animation JSON is a design artifact — requires designer collaboration or After Effects license
- Hard to theme dynamically (segments would need to match design tokens at export time)

**Verdict:** Lottie is the wrong tool for a data-driven spin wheel. Use it only if we need decorative confetti bursts (where `TierCelebrationModal` is the better candidate).

---

## Option C: WebView (Wix-hosted or inline HTML)

### What we'd build
- `<WebView source={{ uri: 'https://halworker85.wixstudio.com/spin-wheel' }}` OR
- `<WebView source={{ html: spinHtml }}>` (inline)

### Assessment

**Not recommended.**

| Risk | Detail |
|------|--------|
| Network dependency | Hosted WebView requires Wix site reachable — emulator fails |
| Bridge latency | postMessage round-trips for prize result introduce 50-200ms lag |
| Theme mismatch | WebView can't read our design tokens natively |
| Deep link state | `initialTab: 'spin'` needs to pass prize config INTO the WebView via URL params |
| Test coverage | WebView is effectively untestable in jest — zero coverage for the animation |
| Security | `injectedJavaScript` opens XSS surface |
| Complexity | More moving parts for a simple rotating wheel |

The one scenario where WebView wins: if the Wix web crew builds a spin wheel for the website and we want pixel-identical parity at zero mobile cost. But the web crew hasn't built it, and our quality gate requires testable code.

---

## Final Recommendation

**Option A: Native (reanimated + SVG).**

Stack is already present. Zero new dependencies. Testable. Themeable. The geometry math (pie slices) is the only fiddly part — and it's a solved problem with a small utility function (`slicePath(index, total, radius)`).

### Implementation sketch

```typescript
// useSpinWheel.ts
import { useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

export function useSpinWheel(segments: PrizeSegment[], onLand: (prize: PrizeSegment) => void) {
  const rotation = useSharedValue(0);

  function spin(serverSeedAngle: number) {
    const target = rotation.value + 1440 + serverSeedAngle; // 4 full rotations + prize
    rotation.value = withTiming(target, { duration: 3200 }, (finished) => {
      if (finished) runOnJS(onLand)(segments[prizeIndex(serverSeedAngle, segments.length)]);
    });
  }

  return { rotation, spin };
}
```

```typescript
// SpinWheelCanvas.tsx
// react-native-svg Svg + G + Path (pie slices) + Animated.View rotation wrapper
```

---

## Next Step

If this spike is approved: assign `SpinScreen` implementation as `cm-spin-impl` (P3, ~1 crew-day). Suggest bishop or ripley — either can own the SVG geometry.

The screen must handle:
- Cold state (spin button enabled, daily quota not used)
- Spinning state (disable button, play animation)
- Result state (show prize modal — reuse `TierCelebrationModal` pattern)
- Quota-exhausted state (daily limit reached, show next reset time)
- Network error state (optimistic local spin, queue prize sync)
