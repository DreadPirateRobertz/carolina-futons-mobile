# AR Feature Design Document — Carolina Futons Mobile

**Owner**: dallas (PM) | **Last Updated**: 2026-02-27 | **Parent Bead**: cm-88d

---

## What Is This?

An augmented reality feature that lets customers point their phone camera at a room and see Carolina Futons furniture placed in it — at real-world scale, with realistic proportions. The customer can see if a futon fits in their living room before buying.

**Business case**: IKEA saw 189% conversion lift from AR. Wayfair saw 11x higher purchase likelihood. This is a proven revenue driver for furniture e-commerce.

---

## How It Works (Non-Technical)

1. Customer opens a product page (e.g., "The Asheville Futon")
2. Taps **"View in Your Room"** button
3. Phone camera opens
4. A 3D model of the futon appears in their room
5. Customer can move, rotate, and resize it
6. If they like it, they tap **"Add to Cart"** right from the AR view

**Platform behavior differs** — each phone OS has its own AR engine:

| Platform | What Happens | Who Built The AR |
|----------|-------------|-----------------|
| iPhone | Apple's AR Quick Look opens (same as IKEA uses) | Apple (ARKit) |
| Android | Google's Scene Viewer opens | Google (ARCore) |
| Web browser | 3D model viewer with rotate/zoom | Google's model-viewer |

We don't build our own AR engine. We use each platform's built-in one. This means zero maintenance burden and the best possible AR quality on each device.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                  USER TAPS                        │
│              "View in Your Room"                  │
└────────────┬──────────────┬──────────────┬───────┘
             │              │              │
         iOS (iPhone)   Android        Web Browser
             │              │              │
     ┌───────▼───────┐ ┌────▼──────┐ ┌────▼──────────┐
     │ AR Quick Look │ │ Scene     │ │ <model-viewer> │
     │ (Apple)       │ │ Viewer    │ │ (Google CDN)   │
     │               │ │ (Google)  │ │                │
     │ Opens .usdz   │ │ Opens .glb│ │ Loads .glb     │
     │ file from CDN │ │ from CDN  │ │ from CDN       │
     └───────────────┘ └───────────┘ └────────────────┘
                        │
              All load 3D models from:
         cdn.carolinafutons.com/models/
```

### Key Principle: Platform-Native AR

We leverage each platform's built-in AR capabilities instead of building a custom renderer. This means:
- **iOS** handles plane detection, shadows, lighting, and real-world scaling via ARKit
- **Android** does the same via ARCore
- **Web** provides a 3D preview with AR on supported browsers
- We maintain zero native AR code — it's all handled by the OS

---

## 3D Model Formats

Every product needs two model files:

| Format | Platform | Extension | Why |
|--------|----------|-----------|-----|
| **USDZ** | iOS | `.usdz` | Apple's required format for AR Quick Look |
| **GLB** | Android + Web | `.glb` | Universal 3D format (binary glTF) |

Both formats contain the same 3D geometry, textures, and materials — just packaged differently for each platform.

### Model Specs

| Spec | Target | Hard Limit | Why |
|------|--------|------------|-----|
| Triangle count | 15K-65K | 100K | More triangles = more detail but slower rendering |
| GLB file size | 3-8 MB | 20 MB | Larger = slower download on mobile data |
| USDZ file size | 5-15 MB | 25 MB | USDZ is typically larger than GLB |
| Texture resolution | 1024x1024 | 2048x2048 | Fabric detail needs decent resolution |
| Scale | 1 GLB unit = 1 meter | — | Required by ARKit/ARCore for real-world sizing |
| Origin | Bottom-center | — | So furniture sits flush on detected floors |

### Real-World Dimensions

Every 3D model is built to exact product dimensions. Example:

| Product | Width | Depth | Height | GLB Size |
|---------|-------|-------|--------|----------|
| Murphy Queen Vertical | 64" (1.63m) | 24" (0.61m) | 42" (1.07m) | 7.2 MB |
| Asheville Full Futon | 54" (1.37m) | 34" (0.86m) | 33" (0.84m) | 6.8 MB |
| Pisgah Twin Futon | 39" (0.99m) | 32" (0.81m) | 31" (0.79m) | 5.2 MB |

When a customer places the Asheville in their room via AR, it appears at exactly 54" wide — matching the real product.

---

## 3D Model Pipeline

How we turn product photos into AR-ready 3D models:

```
Product Photos (8-12 angles)
        ↓
   AI Generation Service (Tripo or Meshy API)
        ↓
   Raw 3D Model (.glb)
        ↓
   Optimization (Draco compression + KTX2 textures)
        ↓
   Conversion (GLB → USDZ for iOS)
        ↓
   Validation (triangle count, file size, scale check)
        ↓
   Upload to CDN (cdn.carolinafutons.com/models/)
        ↓
   Catalog Sync (updates app's model database)
```

**Pipeline scripts** live in `scripts/pipeline/`:
- `generate.ts` — Calls Tripo/Meshy API with product photos → raw GLB
- `convert.ts` — Optimizes GLB + converts to USDZ
- `validate.ts` — Checks quality against specs
- `sync-catalog.ts` — Updates `src/data/models3d.ts` with new model URLs

**Cost per model**: ~$0.25-0.60 via AI generation. Professional services (Hexa, Avataar) cost $85-220/model but deliver higher quality.

---

## Fabric Variants

Futons come in multiple fabric options. Two approaches:

| Platform | Technique | Details |
|----------|-----------|---------|
| GLB (Android/Web) | `KHR_materials_variants` | One file, multiple fabric textures — user switches in-viewer |
| USDZ (iOS) | Separate files | One USDZ per fabric variant (Apple limitation) |

Currently 8 fabric options × 4 futon models = 32 potential USDZ variants. For PoC, we start with one fabric per model.

---

## Phased Rollout

### Phase 1 — Quick Look / Scene Viewer (Current)

**Status**: Code complete, needs real 3D models

User taps "View in Room" → phone's native AR viewer opens with the 3D model. No custom AR code. Works in Expo managed workflow.

**What's implemented**:
- `openARViewer.ts` — Launches Quick Look (iOS) or Scene Viewer (Android)
- `ModelViewerWeb.tsx` — `<model-viewer>` web component for browser 3D viewing
- `ARWebScreen.tsx` — Full-screen web 3D viewer modal
- `arSupport.ts` — Platform capability detection
- `models3d.ts` — Catalog of 11 products with GLB/USDZ URLs (placeholder CDN)
- `modelLoader.ts` — Download/cache with LRU eviction (200MB budget)

**What's missing**:
- Real 3D model files on CDN (all URLs are placeholders)
- Web routing (ProductDetailScreen → ARWebScreen on web)

### Phase 2 — ViroReact Custom AR (Future, if metrics justify)

Full in-app AR with custom UI overlays:
- Plane detection with visual surface indicators
- Furniture placement on detected surfaces
- In-AR fabric picker, dimension labels, add-to-cart
- Multi-product placement (see multiple items together)
- Requires Expo custom dev build (`expo prebuild`)
- Library: `@reactvision/react-viro` v2.52.1

**Phase 2 is NOT started.** Decision to proceed depends on Phase 1 conversion metrics.

### Phase 3 — Premium iOS (Future)

RealityKit integration for LiDAR-equipped iPhones:
- Instant plane detection (no scanning needed)
- Object occlusion (furniture behind real objects)
- More accurate measurements

---

## Device Support

### AR Support by Platform

| Platform | AR Capability | Min Version | Coverage |
|----------|-------------|-------------|----------|
| iOS | ARKit via Quick Look | iOS 12+ | ~99% of active iPhones |
| Android | ARCore via Scene Viewer | Android 7.0+ with ARCore | ~87% of active Android |
| Web | 3D viewer (no AR) | Any modern browser | 100% |
| Web + Android Chrome | WebXR AR | Chrome 79+ | ~60% of Android web |
| Web + iOS Safari | Quick Look AR | iOS 12+ | ~99% (launches native) |

### Device Tiers

| Tier | Devices | Experience |
|------|---------|-----------|
| **Premium** | iPhone 12 Pro+ (LiDAR) | Instant plane detection, occlusion, shadows |
| **Standard** | Other iPhones, Android flagships | Standard plane detection, basic shadows |
| **Fallback** | No AR support, web | 3D model viewer only (rotate/zoom, no camera) |

---

## Current Codebase Map

```
src/
├── components/
│   ├── ARControls.tsx          ← AR session UI (model picker, fabrics, share)
│   ├── ARFutonOverlay.tsx      ← 2D futon overlay (Phase 0, camera+overlay)
│   ├── ARProductPicker.tsx     ← Product catalog picker for AR session
│   ├── ModelViewerWeb.tsx      ← Web 3D viewer (<model-viewer> web component)
│   ├── PlaneIndicator.tsx      ← AR surface plane visualization
│   ├── SurfaceIndicator.tsx    ← Surface detection feedback UI
│   └── ViewInRoomButton.tsx    ← "View in Your Room" CTA button
├── screens/
│   ├── ARScreen.tsx            ← Native AR camera screen
│   └── ARWebScreen.tsx         ← Web 3D viewer full-screen modal
├── services/
│   ├── arSupport.ts            ← Device AR capability detection
│   ├── lightingEstimation.ts   ← Ambient lighting for realistic rendering
│   ├── modelLoader.ts          ← 3D model download/cache (LRU, 200MB)
│   └── surfaceDetection.ts     ← Floor/surface plane detection service
├── hooks/
│   └── useSurfaceDetection.ts  ← React hook for surface detection state
├── data/
│   └── models3d.ts             ← 3D model catalog (11 products, GLB+USDZ URLs)
├── utils/
│   └── openARViewer.ts         ← Platform AR launcher (Quick Look/Scene Viewer)
scripts/
└── pipeline/
    ├── generate.ts             ← Photo-to-3D via Tripo/Meshy API
    ├── convert.ts              ← GLB optimization + USDZ conversion
    ├── validate.ts             ← Quality validation
    └── sync-catalog.ts         ← Sync pipeline output → app catalog
```

### Test Coverage

27 AR-related test suites covering:
- AR controls and overlay rendering (32 model×fabric combos)
- Camera permission flows
- AR viewer launching (iOS Quick Look, Android Scene Viewer, web callback)
- Device capability detection
- Surface detection and lighting estimation
- Model catalog data integrity
- Product picker filtering
- Web 3D viewer
- Integration tests (product-to-model mapping, session lifecycle)

---

## Open Work Items

| Bead | Title | Priority | Status |
|------|-------|----------|--------|
| cm-88d | AR Camera Feature (parent) | P0 | In Progress |
| cm-88d.1 | Source/generate real 3D furniture model | P1 | Open |
| cm-88d.2 | Upgrade ModelViewerWeb to full web component | P2 | Done |
| cm-88d.3 | E2E integration test — View in Room all platforms | P1 | Open |
| cm-88d.4 | Wire web platform routing | P2 | Open |

### Open PRs Needing Review

| PR | Title | Status |
|----|-------|--------|
| #7 | AR product catalog picker overlay | Awaiting review |
| #6 | Fuzzy search + autocomplete | Awaiting review |
| #5 | Deep link routing + tests | Awaiting review |
| #4 | Offline cart persistence + sync | Awaiting review |

---

## Competitor Landscape

| Company | AR Investment | Result |
|---------|-------------|--------|
| **IKEA Place** | Major (dedicated app) | 189% conversion lift, 8M+ downloads |
| **Wayfair** | Major (in-app) | 11x purchase likelihood, 92% conversion increase |
| **Houzz** | Major (in-app) | 11x purchase lift |
| **Pottery Barn** | $112M invested | Quietly sunset — 3D model maintenance too expensive |

**Lesson from Pottery Barn**: The ongoing cost isn't the AR tech — it's maintaining 3D models as products change. Our AI pipeline (Tripo/Meshy at $0.25-0.60/model) keeps this cost manageable vs. the $85-220/model professional services that crushed Pottery Barn.

---

## Rejected Approaches

| Approach | Why Rejected |
|----------|-------------|
| **WebXR / 8th Wall** | iOS Safari doesn't support `immersive-ar` — non-starter for our audience |
| **Custom native AR renderer** | 4-8 weeks of native iOS/Android code when Quick Look/Scene Viewer exist |
| **react-native-arkit/arcore** | Both libraries abandoned (no commits since 2022) |
| **Bundling models in app binary** | 11 models × ~7MB = 77MB+ added to app download size |

---

## Glossary

| Term | Meaning |
|------|---------|
| **ARKit** | Apple's AR framework built into iOS |
| **ARCore** | Google's AR framework for Android |
| **Quick Look** | Apple's built-in 3D/AR model viewer |
| **Scene Viewer** | Google's built-in 3D/AR model viewer |
| **USDZ** | Apple's 3D file format (required for Quick Look) |
| **GLB** | Binary glTF — universal 3D format (used by Android + web) |
| **Plane detection** | AR recognizes flat surfaces (floors, tables) to place objects on |
| **LiDAR** | Laser scanner on iPhone Pro models — enables instant, precise AR |
| **model-viewer** | Google's web component for 3D viewing in browsers |
| **Draco** | Google's 3D mesh compression (makes GLB files smaller) |
| **KTX2** | Compressed texture format (smaller than PNG/JPG for 3D) |
| **PBR** | Physically Based Rendering — realistic material/lighting system |
