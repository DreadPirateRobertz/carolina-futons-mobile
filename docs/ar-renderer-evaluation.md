# AR Renderer Evaluation — cm-9k2

**Author**: bishop | **Date**: 2026-02-22 | **Status**: Complete

Evaluate RealityKit, SceneKit, and three.js for the Carolina Futons AR camera feature. Currently Phase 1 uses Quick Look (iOS) + Scene Viewer (Android) via `Linking.openURL()`. This evaluates Phase 2 options for custom in-app AR rendering.

---

## Executive Summary

| Renderer | Platform | Expo Compat | In-App AR | Effort | Recommendation |
|----------|----------|-------------|-----------|--------|----------------|
| **Quick Look + Scene Viewer** | iOS + Android | Native (no plugin) | No (system UI) | Done | **Phase 1 (current)** |
| **three.js + @react-three/fiber** | Web + all | Yes (GL view) | 2D overlay only | Medium | **Phase 2: web fallback** |
| **RealityKit** | iOS only | Requires native module | Full ARKit | High | Phase 3: premium iOS |
| **SceneKit** | iOS only | Requires native module | Limited AR | High | Not recommended |

**Recommendation**: Keep Phase 1 (Quick Look / Scene Viewer) for native AR. Add three.js for web fallback and 3D product preview. RealityKit only if we need custom in-app AR beyond what Quick Look provides.

---

## 1. Quick Look + Scene Viewer (Current — Phase 1)

### How It Works
- **iOS**: Open `.usdz` URL → system AR Quick Look viewer
- **Android**: Open Scene Viewer intent → Google's AR viewer with `.glb`
- **Implementation**: `Linking.openURL()` — zero native code

### Pros
- No native module required (works with Expo managed workflow)
- Platform-native UI (familiar to users)
- Handles permissions, fallbacks, device detection automatically
- Apple/Google maintain the rendering quality
- Already implemented and working

### Cons
- Opens in a separate full-screen viewer (leaves the app)
- No customization of the AR UI
- No fabric variant switching in AR (would need separate USDZ per variant)
- No analytics/tracking within the AR session
- No programmatic control (can't screenshot, measure, etc.)

### Verdict
**Keep as primary AR path.** Covers 90%+ of the use case with zero maintenance.

---

## 2. three.js + @react-three/fiber (Web Fallback)

### What It Provides
- 3D model viewer (rotate, zoom) for product pages
- WebGL rendering in React Native via `expo-gl` + `react-three-fiber`
- Web platform support (Expo web export)
- 2D AR overlay (camera feed + 3D model superimposed — like current ARScreen)

### React Native Integration
```
expo-gl → @react-three/fiber/native → three.js
```

### Pros
- Cross-platform (iOS, Android, web)
- Full UI customization (fabric switching, dimension overlays, screenshots)
- In-app experience (no leaving the app)
- Rich ecosystem (drei helpers, postprocessing)
- Expo compatible (expo-gl is managed)
- Good for product 3D preview even without AR

### Cons
- Not true AR (no plane detection, occlusion, lighting estimation)
- WebGL performance on low-end Android can be poor
- Bundle size increase (~500KB gzipped for three.js)
- Need to manage GL context lifecycle carefully in React Native
- Fabric variant rendering requires PBR shader setup

### Key Dependencies
- `expo-gl` (managed workflow compatible)
- `@react-three/fiber` (React renderer for three.js)
- `@react-three/drei` (helpers — OrbitControls, Environment, useGLTF)

### Effort Estimate
- 3D product viewer: 2-3 days
- Fabric variant switching: 1-2 days
- Camera overlay (2D AR): 2-3 days (extends current ARScreen)
- Web export: 1 day
- **Total: 6-9 days**

### Verdict
**Recommended for Phase 2.** Adds 3D product preview + web support. The current 2D AR camera overlay already works; three.js would replace the flat image with real 3D rendering.

---

## 3. RealityKit (iOS Premium AR)

### What It Provides
- Full ARKit integration: plane detection, physics, occlusion, lighting estimation
- USDZ loading with material variants
- People occlusion, object occlusion (A12+)
- LiDAR mesh integration (iPhone Pro)
- Collaborative AR sessions

### React Native Integration
Requires a **custom native module** (Swift):
```
RCTViewManager → ARView (RealityKit) → React Native bridge
```

### Pros
- Best AR quality on iOS
- Real plane detection (furniture sits on actual floor)
- Lighting estimation (model matches room lighting)
- Object occlusion (furniture goes behind real objects)
- Direct USDZ support (no conversion needed)

### Cons
- **iOS only** — need separate Android solution
- **Requires ejecting from Expo managed workflow** (or custom dev client)
- Significant Swift native code (~500-1000 lines for bridge)
- RealityKit API changes between iOS versions
- Complex debugging (native + JS layers)
- ARKit session management is non-trivial

### Effort Estimate
- Native module scaffold: 2-3 days
- AR session + plane detection: 3-4 days
- USDZ loading + placement: 2-3 days
- UI controls bridge: 2-3 days
- Custom Expo dev client setup: 1-2 days
- Testing on device matrix: 2-3 days
- **Total: 12-18 days**

### Verdict
**Phase 3 only if Quick Look isn't sufficient.** High effort, iOS only. The payoff is significantly better AR quality but Quick Look already provides good AR with zero maintenance.

---

## 4. SceneKit (Legacy iOS 3D)

### What It Provides
- 3D scene rendering (precursor to RealityKit)
- ARSCNView for AR sessions
- USDZ/DAE/OBJ loading

### Pros
- Mature API (available since iOS 8)
- Slightly simpler than RealityKit

### Cons
- **Deprecated in favor of RealityKit** — Apple investing in RealityKit
- No modern AR features (people occlusion, LiDAR mesh)
- Same native module requirement as RealityKit
- Less documentation and community support
- iOS only

### Verdict
**Not recommended.** If we need native iOS AR, go directly to RealityKit. SceneKit is legacy.

---

## 5. Decision Matrix

| Criteria (weight) | Quick Look/SV | three.js | RealityKit | SceneKit |
|-------------------|:---:|:---:|:---:|:---:|
| Expo managed (3) | 5 | 4 | 1 | 1 |
| Cross-platform (3) | 4 | 5 | 1 | 1 |
| AR quality (2) | 4 | 2 | 5 | 3 |
| Dev effort (2) | 5 | 3 | 1 | 2 |
| Customization (1) | 1 | 5 | 4 | 3 |
| Maintenance (1) | 5 | 3 | 2 | 1 |
| **Weighted Score** | **49** | **43** | **27** | **19** |

---

## 6. Recommended Phasing

### Phase 1 — Quick Look + Scene Viewer (Current, Done)
- Native platform AR viewers
- Zero native code, full Expo managed
- Covers primary AR use case

### Phase 2 — three.js 3D Preview (Next)
- Add 3D product viewer on product detail pages
- Fabric variant switching in 3D
- Web platform support
- Enhanced 2D AR camera overlay with real 3D models
- Keep Quick Look/Scene Viewer as "true AR" entry point

### Phase 3 — RealityKit (Future, If Needed)
- Custom in-app AR on iOS
- Only pursue if customer feedback demands better than Quick Look
- Requires Expo custom dev client or bare workflow
- Parallel Android solution needed (ARCore via custom module)
