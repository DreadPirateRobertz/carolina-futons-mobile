# AR Camera Feature: Technical Feasibility Research

**Issue:** cm-88d (P1) | **Date:** 2026-02-22 | **Author:** Artemis

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [ARKit & ARCore Capabilities](#2-arkit--arcore-capabilities)
3. [3D Model Formats](#3-3d-model-formats)
4. [React Native / Expo Integration](#4-react-native--expo-integration)
5. [Competitor UX Survey](#5-competitor-ux-survey)
6. [Recommendation](#6-recommendation)

---

## 1. Executive Summary

AR furniture placement is a mature, validated product pattern. IKEA, Wayfair, and Amazon all report 11x-189% conversion lifts from AR features. The core technology (ARKit on iOS, ARCore on Android) is stable and well-documented. For Carolina Futons' React Native/Expo stack, a two-phase approach is recommended:

- **Phase 1** (1-2 days): Quick Look (iOS) + Scene Viewer (Android) via `expo-linking` — zero native code, works in managed Expo
- **Phase 2** (2-4 weeks, if justified by Phase 1 metrics): ViroReact with Expo config plugin for in-app AR with custom UI

Carolina Futons has unique differentiation opportunities that large retailers cannot match: futon sofa/bed state toggling, murphy cabinet open/close visualization, and per-product fabric swapping — all leveraging the advantage of a small, focused catalog where every 3D model can be exceptional.

---

## 2. ARKit & ARCore Capabilities

### 2.1 ARKit (iOS)

**Core mechanism:** `ARWorldTrackingConfiguration` provides 6DoF device tracking. `planeDetection` supports `.horizontal` (floors — primary for futons) and `.vertical` (walls — murphy cabinets). Raycasting via `ARSession.raycast()` projects screen taps to 3D plane intersections for tap-to-place.

| Feature | Min iOS | Min Hardware |
|---|---|---|
| ARKit basic (plane detection, anchors) | iOS 11 | iPhone 6s (A9) |
| AR Quick Look (zero-code AR viewer) | iOS 12 | iPhone 6s+ |
| LiDAR scene reconstruction | iOS 13.4 | iPhone 12 Pro+ |
| Object/people occlusion | iOS 13 | A12 chip+ |

**Lighting:** Environmental HDR mode provides three components — main directional light (shadows), ambient spherical harmonics (indirect illumination), and HDR cubemap (specular reflections on glossy surfaces like polished wood frames). RealityKit handles this automatically.

**LiDAR (Pro devices):** Instant plane detection, real-time mesh generation with semantic labels (`floor`, `wall`, `table`, `seat`), and accurate object occlusion. Not required but significantly enhances experience.

**Quick Look for e-commerce:** An `<a rel="ar">` link to a `.usdz` file triggers the native AR viewer from Safari. Supports Apple Pay banners and custom action buttons ("Add to Cart") with callbacks. Does not work in WKWebView (Facebook, Instagram in-app browsers).

### 2.2 ARCore (Android)

**Core mechanism:** `Session` + `Config.PlaneFindingMode` for surface detection. `Frame.hitTest()` for raycasting. `HitResult.createAnchor()` locks virtual objects to world positions.

| Requirement | Value |
|---|---|
| Min SDK (AR Required) | API 24 (Android 7.0) |
| Min SDK (AR Optional) | API 19 (Android 4.4) |
| OpenGL ES | 3.0+ |
| Runtime dependency | Google Play Services for AR |
| Depth API coverage | ~87% of ARCore devices |

**Lighting:** Environmental HDR mode mirrors ARKit's three-component model (directional light, spherical harmonics, HDR cubemap). Comparable shadow/lighting realism.

**Scene Viewer:** Android's equivalent of Quick Look. Launched via Intent with a GLB URL. Parameters include `mode` (ar_preferred), `title`, and `link` (purchase URL).

**Instant Placement API:** Places objects immediately before plane detection completes, refining position as tracking improves. Reduces "scan and wait" friction. No ARKit equivalent (though LiDAR makes this less necessary on iOS).

### 2.3 Cross-Platform Parity

| Feature | iOS | Android | Parity |
|---|---|---|---|
| Horizontal/vertical plane detection | Yes | Yes | Full |
| Raycasting / hit testing | Yes | Yes | Full |
| Environmental HDR lighting | Yes | Yes | Full |
| E-commerce AR viewer | Quick Look (USDZ) | Scene Viewer (GLB) | Conceptual parity, different formats |
| Depth/occlusion | LiDAR (Pro) or monocular | Monocular + optional ToF | Near-full |
| `<model-viewer>` web component | Routes to Quick Look | Routes to Scene Viewer | Full (web) |

**iOS-only:** LiDAR mesh classification, Quick Look with Apple Pay, people occlusion, RealityKit framework.

**Android-only:** Instant Placement API, Cloud Anchors (persistent cross-device), Geospatial API.

---

## 3. 3D Model Formats

### 3.1 USDZ (iOS)

Zero-compression ZIP archive containing USD geometry + embedded textures. Single-file distribution for Safari/Messages/Quick Look.

**Materials:** UsdPreviewSurface PBR shader — diffuseColor, normal, roughness, metallic, opacity, emissive, occlusion, clearcoat. Intentionally simplified for mobile performance.

**Animation:** Skeletal animation (reclining mechanisms), transform keyframes (futon sofa-to-bed conversion), property animation. Quick Look plays a single linear timeline; interactive animations require a full ARKit/RealityKit app.

**Creation tools:** Reality Converter (free, macOS), Blender 3.0+ native export, Apple `usdzconvert` CLI, Pixar USD toolchain.

### 3.2 GLB/glTF (Android)

Binary glTF — the "JPEG of 3D." Single-file container with JSON scene graph + binary geometry + textures.

**Materials:** Metallic-roughness PBR model. Key extensions for furniture:
- `KHR_materials_sheen` — fabric appearance (critical for futon upholstery)
- `KHR_materials_clearcoat` — lacquered/varnished wood
- `KHR_texture_basisu` — GPU-compressed textures for size reduction

**Animation:** Skeletal, morph targets (cushion deformation), multiple named animation clips (e.g., "fold", "unfold", "recline") switchable by the viewer.

**Creation tools:** Blender (best free option), Substance Painter, `gltf-transform` CLI for optimization/compression.

### 3.3 Production Pipeline

```
Source Asset (Blender .blend)
├── Texture baking (Substance Painter or Blender)
│     2K PBR texture sets (diffuse, normal, roughness, metallic, AO)
├── Export GLB
│     gltf-transform → Draco mesh compression → validate
├── Export USDZ
│     Reality Converter or usdzconvert → validate in Xcode
└── Thumbnails / preview renders
```

**Never convert USDZ↔GLB directly.** Always export both from the shared source asset.

### 3.4 Budget Targets

| Parameter | Target | Maximum |
|---|---|---|
| Triangle count | 20K-50K | 100K |
| Texture resolution | 2048x2048 | 4096x4096 |
| File size per model | 5-15 MB | 25 MB |
| Texture format | JPEG (diffuse), PNG (normal) | — |

### 3.5 Scale and Dimensions

- **glTF:** 1 unit = 1 meter (hardcoded in spec)
- **USDZ/USD:** 1 unit = 1 centimeter (default `metersPerUnit = 0.01`)
- Model origin must be at bottom-center so objects sit flush on detected surfaces
- Embed explicit dimensions in metadata (`extras` in glTF, custom attributes in USD)
- **Most common AR bug is wrong scale** — always verify on-device before publishing

### 3.6 Asset Hosting

Serve models from a CDN (CloudFront, Cloudflare R2), not bundled in the app binary. With ~20-50 products at 10-15 MB each, the total asset library is 200-750 MB — too large to bundle but trivial to serve on-demand.

---

## 4. React Native / Expo Integration

### 4.1 Library Landscape

| Library | Status | AR? | Expo Go? | Notes |
|---|---|---|---|---|
| **ViroReact** (`@reactvision/react-viro`) | Active (Morrow-backed) | Full AR | No (dev build) | Wraps ARKit + ARCore. Config plugin for Expo. Best RN AR library. |
| react-native-arkit | Abandoned | — | — | Explicitly unmaintained. Do not use. |
| react-native-arcore | Abandoned | — | — | Do not use. |
| expo-gl + expo-three | Maintained | 3D only | Yes | No camera passthrough or plane detection. Good for 3D spin views. |
| react-native-filament (Margelo) | Active | 3D only | No | Best 3D render quality in RN. Not an AR SDK. |

### 4.2 Integration Approaches

#### Approach A: Quick Look + Scene Viewer (Recommended Phase 1)

**How:** `Linking.openURL()` with USDZ URL on iOS (triggers Quick Look) or Scene Viewer intent URL on Android. The `react-native-ar-viewer` npm package wraps exactly this pattern.

**Pros:**
- Zero native code. Works with Expo managed workflow and Expo Go
- High-quality AR powered by Apple/Google's own engines
- 1-2 day implementation effort

**Cons:**
- Leaves the app (system modal/separate activity)
- No custom UI overlay (no in-AR add-to-cart, no fabric picker)
- No analytics on in-AR behavior
- No multi-product placement

#### Approach B: ViroReact (Recommended Phase 2)

**How:** Add `@reactvision/react-viro` with Expo config plugin. Use `ViroARScene`, `ViroARPlaneSelector`, `Viro3DObject`. Requires custom dev build (`expo prebuild`).

**Pros:**
- Full in-app AR with custom React Native UI overlays
- Plane detection, tap-to-place, drag, rotate, pinch gestures
- Can overlay add-to-cart, fabric picker, dimension labels
- Loads GLB/OBJ models cross-platform

**Cons:**
- Requires custom dev build (no Expo Go)
- Large native footprint (ARKit/ARCore SDKs + Viro engine)
- 2-4 week implementation effort
- New Architecture (Fabric) support still maturing

#### Approach C: `<model-viewer>` WebView

**How:** Embed `react-native-webview` loading an HTML page with Google's `<model-viewer>` web component. Supports `src="model.glb"` + `ios-src="model.usdz"` with automatic platform routing.

**Verdict:** Viable but ultimately a more complicated way to achieve the same result as Approach A (exits to Quick Look/Scene Viewer for AR). The 3D preview in the WebView is decent for non-AR browsing.

#### Approach D: Custom Native Module

**How:** Write Swift (ARKit/RealityKit) and Kotlin (ARCore/Sceneform) native views, bridge to RN.

**Verdict:** Too expensive (4-8 weeks) for the value delivered when ViroReact already wraps ARKit/ARCore well.

#### Approach E: WebAR (8th Wall / WebXR)

**Verdict:** WebXR `immersive-ar` does not work on iOS Safari — non-starter. 8th Wall has commercial licensing costs not justified for this use case.

### 4.3 Expo Compatibility

| Approach | Expo Go | Dev Build | Bare |
|---|---|---|---|
| Quick Look / Scene Viewer (Linking) | **Yes** | **Yes** | **Yes** |
| `<model-viewer>` WebView | **Yes** | **Yes** | **Yes** |
| ViroReact | No | **Yes** (config plugin) | **Yes** |
| Custom native module | No | **Yes** | **Yes** |

---

## 5. Competitor UX Survey

### 5.1 IKEA Place / Kreativ

- **IKEA Place (2017):** Standalone AR app. 3,200+ products. Camera-first experience. 98% dimensional accuracy. Single-product placement. No in-AR purchase.
- **IKEA Kreativ (2022):** LiDAR room scanning, AI furniture removal, multi-product placement, persistent scenes. Requires LiDAR for full experience.
- **Impact:** 189% higher conversion for AR-enabled products. 8M+ downloads. 3x engagement vs traditional browsing.

### 5.2 Wayfair "View in Room"

- Integrated in main shopping app (not standalone). Entry via "View in Your Room" button + "3D" badge on product cards.
- **Key differentiator:** Add to Cart directly from AR view. Interactive Photo mode for remote visualization. Room Planner 3D tool.
- **Impact:** 11x more likely to purchase. 92% conversion increase for AR users.

### 5.3 Amazon AR View / Room Decorator

- Accessed from product detail page. Supports furniture, wall art, lighting, decor.
- **Key differentiator:** Multi-product placement with in-AR product recommendations. Save and resume across devices. In-AR add to cart.

### 5.4 Houzz

- 1M+ 3D models (aggregated from retailers). Saves to social "ideabooks." Unique flooring visualization feature.
- **Impact:** 11x purchase likelihood lift.

### 5.5 Pottery Barn / West Elm

- **Cautionary tale:** Invested $112M in AR (acquiring Outward). Feature was quietly sunset. Maintaining AR requires ongoing 3D model and SDK investment — ROI was unclear for their product mix.

### 5.6 Universal UX Patterns

| Pattern | Standard |
|---|---|
| Entry point | "View in Your Room" button on product detail page |
| Onboarding | "Point camera at floor" with animated illustration, 3-5 seconds |
| Surface feedback | Animated dots/grid on detected plane |
| Placement | Tap to place at true scale |
| Manipulation | Drag (move), pinch (scale — often locked), two-finger rotate |
| Realism minimum | Shadow plane + light estimation + PBR materials |
| Actions | Screenshot, share, add to cart (if in-app AR) |

---

## 6. Recommendation

### 6.1 Two-Phase Strategy

#### Phase 1: Quick Look + Scene Viewer (Ship in 1-2 days)

Add a "View in Your Room" button on `ProductDetailScreen` that:
- **iOS:** Opens `.usdz` URL via `Linking.openURL()` → Apple Quick Look AR
- **Android:** Opens Scene Viewer intent URL with `.glb` model

Zero native code. Works with current Expo managed workflow. Gives users a high-quality AR experience powered by Apple/Google's own engines. The main cost is producing 3D model files.

#### Phase 2: ViroReact In-App AR (2-4 weeks, if Phase 1 justifies)

If Phase 1 analytics show strong AR adoption, upgrade to ViroReact for:
- In-app AR with custom UI overlays (fabric picker, add-to-cart, dimension labels)
- Multi-product placement
- Analytics on AR behavior

Requires switching to Expo custom dev builds.

### 6.2 Carolina Futons Differentiators

These features set us apart from large retailers who cannot invest per-product at this level:

1. **Futon state toggle:** Switch between sofa and bed mode in AR. Answers the key question: "Will it fit when unfolded?" No competitor offers this.
2. **Murphy cabinet open/close:** Toggle to show storage capacity vs. closed footprint.
3. **Fabric/cover swapping:** Cycle through fabric options on the placed model (espresso, sand, mountain blue). Configuration-in-context.
4. **Showroom tie-in:** "Visit this in person" CTA linking to nearest NC/SC showroom with the model on display.

### 6.3 3D Asset Requirements

| Item | Spec |
|---|---|
| Formats per product | `.usdz` (iOS) + `.glb` (Android) |
| Source format | Blender `.blend` files |
| Triangle budget | 20K-50K per model |
| Texture resolution | 2K default |
| File size target | 5-15 MB per format |
| Scale | Real-world dimensions, origin at bottom-center |
| Hosting | CDN (not bundled in app) |
| Catalog size | ~20-50 products |
| Fabric rendering | `KHR_materials_sheen` (GLB), UsdPreviewSurface (USDZ) |

### 6.4 Key Metrics to Track

- **AR adoption rate:** % of product detail views that trigger "View in Your Room"
- **AR-to-cart conversion:** % of AR sessions resulting in add-to-cart (benchmark: 11x lift)
- **Screenshot/share rate:** organic amplification indicator
- **Return rate for AR purchases:** expect 60%+ reduction vs. non-AR (industry data)

### 6.5 Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| 3D model production cost/time | High | Start with top 5 best-selling products. Use Blender (free). Consider commissioning from Fiverr/Upwork 3D artists at $50-200/model. |
| Android device fragmentation | Medium | Use AR Optional manifest flag. Graceful fallback to static images on unsupported devices. |
| Pottery Barn precedent (feature sunset) | Low | Phase 1 approach has near-zero maintenance cost. Only invest in Phase 2 if metrics justify. |
| ViroReact maintenance risk | Medium | Morrow acquisition funds full-time team. Quick Look/Scene Viewer approach has zero dependency on ViroReact. |
| Wrong scale in AR | High (user trust) | Mandatory on-device QA for every model before publishing. Embed explicit dimensions in model metadata. |

---

## Feasibility Verdict

**AR furniture placement is technically feasible for Carolina Futons' React Native/Expo stack with minimal effort for Phase 1.** The technology is mature, the UX patterns are standardized, and the business case is validated by industry data. The primary investment is in 3D model production, not engineering.
