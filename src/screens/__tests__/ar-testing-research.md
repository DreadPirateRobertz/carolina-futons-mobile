# AR Feature Testing Research (cm-88d / cm-tof)

> Tester research deliverable for Carolina Futons AR Camera Feature
> Date: 2026-02-22 | Author: cfutons_mobile/crew/tester

---

## Table of Contents

1. [Current Implementation Assessment](#1-current-implementation-assessment)
2. [AR Testing Strategies](#2-ar-testing-strategies)
3. [Platform Support Matrix (ARKit / ARCore)](#3-platform-support-matrix)
4. [Performance Benchmarks](#4-performance-benchmarks)
5. [Accessibility Considerations](#5-accessibility-considerations)
6. [Recommendations & Next Steps](#6-recommendations--next-steps)

---

## 1. Current Implementation Assessment

The current AR implementation (`ARScreen.tsx`, `ARFutonOverlay.tsx`, `ARControls.tsx`) uses **expo-camera CameraView with a 2D React Native overlay** -- not true ARKit/ARCore. Key characteristics:

- Camera feed via `expo-camera` (no plane detection, no SLAM, no depth sensing)
- Futon rendered as styled React Native Views with perspective transforms
- Pan/pinch/rotate gestures via `react-native-gesture-handler` + `react-native-reanimated`
- Objects are NOT anchored to real-world surfaces
- Existing test coverage is strong for UI logic (model/fabric selection, pricing, dimensions, haptics, accessibility props)

**Gap**: To deliver true AR furniture placement, the app needs ARKit/ARCore integration -- likely via `@reactvision/react-viro` (ViroReact), the only actively maintained React Native AR library with cross-platform support.

---

## 2. AR Testing Strategies

### 2.1 Placement Accuracy

| Metric | ARKit (LiDAR) | ARKit (no LiDAR) | ARCore |
|--------|---------------|-------------------|--------|
| Positional drift | ~0.02m/sec | ~0.05m/sec | ~0.05-0.10m/sec |
| Measurement error (<3m) | +/-1-2.5 cm | +/-2.5-5 cm | +/-3-7 cm |
| Reliable range | ~5m | ~3-5m | ~3-5m |

**Pass/fail criteria**: Scale accuracy within 5%, positional drift <3cm over 15s, plane detection <5s in normal lighting, frame rate >30fps sustained.

**How to measure drift**: Place physical floor markers at known positions. Place virtual object at marker. Walk a 10-15s loop. Return to origin. Measure displacement.

### 2.2 Automated vs Manual Testing

| Layer | Tool | Automation Level |
|-------|------|-----------------|
| Component logic (model/fabric/price) | Jest + RNTL | **Fully automated** (already done) |
| Visual regression (overlay rendering) | Applitools/Percy | **Automated** (mask camera region) |
| Gesture interactions | Detox/Maestro | **Partial** (Detox: iOS sim only) |
| Performance (FPS/CPU/memory) | Xcode Instruments / Android Profiler | **Semi-automated** (real device only) |
| Plane detection & anchoring | ARKit/ARCore session replay | **Automatable via session replay** |
| E2E AR in real rooms | Manual | **Cannot be automated** |

**Session Replay** is the most impactful automation investment:
- **iOS**: ARKit session recording via Reality Composer, replay in XCTest
- **Android**: ARCore Recording & Playback API (`ArRecordingConfig`/`ArPlaybackConfig`)

**Must be manual**: Subjective realism, edge-case environments (mirrors, glass, clutter), physical dimension comparison, first-time UX.

### 2.3 Device Test Matrix

**Tier 1 — Must Test (blocks release):**

| Device | OS | Rationale |
|--------|----|-----------|
| iPhone 15/16 Pro | iOS 17-18 | LiDAR, latest ARKit, high-end buyers |
| iPhone 13/14 | iOS 17-18 | No LiDAR, most common iPhones |
| iPhone SE 3 | iOS 17 | Lowest-spec supported iPhone |
| Samsung Galaxy S24/S25 | Android 14-15 | Dominant Android flagship |
| Google Pixel 8/9 | Android 14-15 | ARCore reference hardware |
| Samsung Galaxy A54/A55 | Android 14 | Mid-range bulk of Android AR users |

**Tier 2 — Should Test**: iPad Pro M2/M4, iPhone 12, OnePlus 12, Xiaomi 14, Galaxy Tab S9

**Tier 3 — Nice to Have**: iPhone 11, Motorola Edge 40, Galaxy Z Fold, Pixel 6a

**Android long tail strategy**: Use cloud device farms (BrowserStack, Firebase Test Lab). Focus on ARCore Depth API-supported devices (87%+ of active ARCore devices). Test top 10 devices by market share in US furniture buyer demographics.

### 2.4 Test Environment Requirements

| Variable | Baseline | Edge Case |
|----------|----------|-----------|
| Lighting | 300-500 lux (normal indoor) | 50-100 lux (low light), harsh directional (sun) |
| Surface | Textured floor (hardwood, carpet) | Featureless (white tile), reflective (polished), dark |
| Room size | 10-25 sqm | <10 sqm (bedroom), >25 sqm (open plan) |
| Clutter | Furnished room | Empty room, heavily cluttered |

**Reproducible test setup**: Dedicated room with dimmable lighting, floor markers at known positions, calibration object (24"x24" box), standard test protocol (place → walk circle → verify).

---

## 3. Platform Support Matrix

### 3.1 ARKit (iOS)

- **Minimum for AR**: iOS 11 + A9 chip (iPhone 6s+)
- **Recommended minimum**: iOS 15 (ARKit 5) — covers ~95%+ of active iPhones
- **Ideal**: iOS 16+ (ARKit 6, RoomPlan API) — covers ~90%+ of active iPhones
- **LiDAR devices** (best experience): iPhone 12 Pro+, iPad Pro 4th gen+ (~20-30% of active iPhones)

Key ARKit versions for furniture placement:

| Version | iOS | Key Feature |
|---------|-----|-------------|
| ARKit 2 | 12 | Vertical plane detection (walls) |
| ARKit 4 | 14 | Depth API, semantic scene classification |
| ARKit 6 | 16 | RoomPlan API, 4K video |

### 3.2 ARCore (Android)

- **Minimum**: Android 7.0 (API 24) for "AR Required" apps
- **Recommended minimum**: Android 9.0 (API 28)
- **Certified devices**: ~600+ models
- **Active device coverage**: ~35-45% of all Android devices (vs ~97% iOS)
- **Depth API support**: 87%+ of active ARCore devices

### 3.3 ARCore vs ARKit Gaps

| Dimension | Impact on Furniture Placement |
|-----------|-------------------------------|
| Depth sensing | ARKit LiDAR: hardware depth at 60Hz. ARCore: software RGB-based, lower accuracy |
| Scene mesh | ARKit: 3D polygonal mesh with semantic labels. ARCore: depth map only |
| RoomPlan | ARKit 6: full room scanning. ARCore: no equivalent |
| Device fragmentation | ARKit: 6-8 iPhone models. ARCore: 600+ models with varying quality |

### 3.4 React Native AR Library

**Use `@reactvision/react-viro` (ViroReact) v2.52.1** — only production-ready, actively maintained option. Cross-platform (ARKit + ARCore), Expo-compatible, corporate backing from Morrow (acquired 2025). Supports world tracking, plane detection, 3D model rendering (USDZ, OBJ, GLB).

### 3.5 Recommended Tiered Experience

| Tier | Devices | Experience |
|------|---------|------------|
| Premium | iOS 16+ with LiDAR, flagships with ARCore Depth | Full AR: room scanning, occlusion, shadows, RoomPlan (iOS) |
| Standard | iOS 15+, Android 9+ with ARCore | Basic plane detection, furniture placement, simpler occlusion |
| Fallback | No AR support | Static 3D model viewer or 2D overlay (current implementation) |

---

## 4. Performance Benchmarks

### 4.1 Frame Rate

| Tier | FPS | Notes |
|------|-----|-------|
| Minimum acceptable | 24 | Below this: tracking fails, motion sickness |
| Target | 30 | Standard for consumer AR, shippable floor |
| Ideal | 60 | ARKit default on iPhone 12+ |
| Danger zone | <20 | Users abandon the feature |

**Frame drop causes**: Tracking/pose estimation (3-6ms/frame), model rendering (4-12ms depending on complexity), RN bridge overhead (1-5ms), oversized textures.

### 4.2 3D Model Specs

| Metric | Target | Maximum |
|--------|--------|---------|
| Polygons per furniture model | 15K-25K tris | 50K tris |
| Total scene budget | 75K-100K tris | — |
| USDZ file size (iOS) | 3-8 MB | 15 MB |
| GLB file size (Android) | 2-6 MB | 12 MB |
| Model load time | <1.5s | 3s |
| Base color texture | 1024x1024 | 2048x2048 |
| Normal/roughness maps | 512x512 | 1024x1024 |

**LOD strategy**: LOD0 (25K tris, full tex) at <1m, LOD1 (10-20K tris, half tex) at 1-3m, LOD2 (2-5K tris, quarter tex) at >3m, LOD3 (500 tris, solid color) as loading placeholder.

### 4.3 Memory Budgets

| Component | Memory |
|-----------|--------|
| AR session baseline | 80-150 MB |
| Furniture model (geometry) | 5-20 MB |
| Textures (decompressed GPU) | 20-80 MB |
| React Native runtime | 40-80 MB |
| **Total AR session** | **250-450 MB** |

| Device | AR Session Budget | Warning Threshold |
|--------|-------------------|-------------------|
| iPhone SE 3 | 400 MB | 350 MB |
| iPhone 12 | 500 MB | 450 MB |
| Galaxy A54 | 350 MB | 300 MB |
| Pixel 7a | 400 MB | 350 MB |

### 4.4 Thermal & Battery

| Device | Thermal Throttle Onset | Battery Drain |
|--------|----------------------|---------------|
| iPhone SE 3 | 3-5 min | ~1.3%/min |
| iPhone 12 | 5-8 min | ~1.0%/min |
| Galaxy A54 | 4-7 min | ~0.7%/min |
| Pixel 7a | 4-6 min | ~0.9%/min |

**Session duration targets**: Optimal 0-3 min, acceptable 3-5 min (show battery indicator), warn 5-8 min, suggest screenshot & exit 8-10 min.

### 4.5 Device-Tier Performance Config

```
Tier 1 (iPhone 12+, Pixel 8+):
  60 FPS, LOD0, full textures (2048), real-time shadows, environment probes

Tier 2 (iPhone SE 3, Pixel 7a):
  30 FPS, LOD0, 1024 textures, blob shadows, simplified lighting

Tier 3 (Galaxy A54, older mid-range Android):
  30 FPS (accept 24), LOD1, 512-1024 textures, blob shadows, fixed ambient
```

**Degradation priority**: Shadows → environment lighting → texture resolution → post-processing → polygon count → frame rate target (last resort).

---

## 5. Accessibility Considerations

### 5.1 WCAG 2.2 Applicability

WCAG 2.2 applies to AR features. Key criteria:

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 1.1.1 Non-text Content | A | AR overlays need text alternatives |
| 1.4.3 Contrast | AA | UI overlays on camera feed: 4.5:1 ratio |
| 1.4.11 Non-text Contrast | AA | Interactive controls: 3:1 |
| 2.5.1 Pointer Gestures | A | Multipoint gestures need single-pointer alternatives |
| 2.5.7 Dragging Movements | AA | Drag-to-move needs non-dragging alternative |
| 2.5.8 Target Size | AA | Minimum 24x24 CSS px |

W3C XAUR (XR Accessibility User Requirements) exists but has no testable criteria yet. WCAG 2.2 AA is the legal/practical floor.

### 5.2 Critical Accessibility Requirements

**MUST-HAVE (10 items):**

1. **Non-AR alternative flow** — Manual room dimension input + 2D top-down view. This is the single most important accessibility requirement. Without it, the feature is inaccessible to blind users.
2. **Accessible overlay controls** — 4.5:1 contrast (use opaque background containers on all text over camera), 44x44pt touch targets, accessibility labels/roles/hints, thumb-reachable zone
3. **Single-pointer alternatives for all gestures** — +/- buttons for resize, rotation dial/arrows for rotate, tap-to-place or D-pad for move
4. **Screen reader support** — Accessibility elements for each placed item (name, dimensions, position), updated as scene changes
5. **Respect Reduce Motion** — Default to static/photo mode when system reduce-motion is enabled
6. **Clear error states** — Non-technical messages for tracking loss, surface detection failure. Announce to assistive tech.
7. **Haptic + auditory feedback** — Distinct haptics for success/failure. Respect system mute.
8. **Accessible onboarding** — Step-by-step, one instruction per screen, simple language, skippable
9. **Color-independent state** — Never rely solely on color (use icons + text alongside)
10. **Switch Control / Switch Access** — Test full flow with both

**SHOULD-HAVE:**
- Photo upload with static overlay
- Quick-scan and freeze (3-5s scan, then frozen view)
- Bottom sheet with sliders for position/rotation/scale
- Dynamic Type support for all overlay text
- Voice Control / Voice Access testing

**NICE-TO-HAVE:**
- Audio scene descriptions
- Voice-driven placement ("Place futon against back wall")
- Spatial audio cues
- High-contrast rendering mode

### 5.3 VoiceOver/TalkBack

ARKit/ARCore views are opaque to screen readers by default. Must build custom accessibility layer:
- **iOS**: `UIAccessibilityElement` at screen-projected position of each placed object, `UIAccessibilityCustomAction` for rotate/resize/remove
- **Android**: `AccessibilityNodeProvider` with virtual nodes, `contentDescription` on each
- **React Native**: `accessibilityRole="adjustable"`, `accessibilityActions` for increment/decrement/delete

### 5.4 Motion Sensitivity

~35% of adults have some motion sensitivity. Camera-view AR triggers nausea for many.

- Check `AccessibilityInfo.isReduceMotionEnabled()` — if true, default to static mode
- Offer static/screenshot placement as a first-class alternative
- Consider mild low-pass filter on camera transform to reduce jitter

---

## 6. Recommendations & Next Steps

### Immediate Actions (current architecture)

1. **Add Detox E2E tests** for AR screen flow: permission → model selection → fabric → add to cart
2. **Add visual regression tests** (Applitools/Percy) for each model/fabric rendering
3. **Implement single-pointer gesture alternatives** — buttons for resize/rotate alongside existing gestures
4. **Ensure overlay contrast** — verify all text over camera has opaque background containers

### When ARKit/ARCore Integration Begins

5. **Library**: Adopt `@reactvision/react-viro` (ViroReact v2.52.1)
6. **Minimum targets**: iOS 15 / Android 9.0 (API 28)
7. **Implement session recording/replay** for automated accuracy testing
8. **Build device performance tier detection** — auto-select quality level based on device
9. **Create dedicated AR test room** with controlled lighting and floor markers
10. **Acquire Tier 1 device lab** (6 devices minimum) + cloud farm for Tier 2-3
11. **Build non-AR alternative flow** (manual dimensions + 2D room view) — required for accessibility compliance
12. **Implement Reduce Motion detection** — static placement as default when enabled

### Performance Pass/Fail Gate

| Metric | Pass | Fail |
|--------|------|------|
| FPS (sustained, 30s) | ≥30 | <24 |
| Model load time | ≤3s | >5s |
| Placement accuracy | ±3cm | >5cm drift |
| Plane detection time (normal light) | ≤5s | >10s |
| Memory (AR session) | ≤400 MB | >500 MB |
| Battery drain | ≤1.5%/min | >2%/min |

---

*Research compiled from: Apple ARKit docs, Google ARCore docs, W3C WCAG 2.2, W3C XAUR, TelemetryDeck iOS adoption data, GFXBench/3DMark mobile GPU data, ViroReact GitHub, industry AR apps (IKEA Place, Wayfair, Houzz), MobiDev AR testing guides, Applitools visual testing research.*
