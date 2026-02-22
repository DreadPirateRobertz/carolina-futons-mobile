# AR 3D Asset Pipeline Research — cm-88d

**Owner**: scout | **Date**: 2026-02-22 | **Status**: Complete

Research for the AR Camera Feature: how to create ~50 AR-ready 3D models of futons and murphy cabinets for the Carolina Futons mobile app.

---

## Executive Summary

**Recommended approach: E-commerce AR specialist service (Hexa or Avataar)**
- $85-220/model, $4,250-11,000 total for 50 models
- 3-6 week turnaround, AR-ready USDZ + GLB output
- Purpose-built for furniture AR (used by Wayfair, IKEA, West Elm)
- Input: product photos (8-12 angles) + dimensions + fabric swatches

---

## 1. AI 3D Generation Services Evaluated

| Service | Cost/Model | Quality | AR Formats | API | Verdict |
|---------|-----------|---------|------------|-----|---------|
| **Meshy** | ~$0.60 (Pro $20/mo, ~33 models) | 4/5 textures | GLB + USDZ native | Yes | Strong — best all-around AI option |
| **Tripo v3.0 Ultra** | ~$0.25 (Pro $16/mo, ~75 models) | 4/5 geometry | GLB, USD (no native USDZ) | Yes | Strong — best hard-surface mesh quality |
| **Hyper3D Rodin** | $0.40 via fal.ai | 5/5 photorealism | Standard (needs conversion) | Yes | Best photorealism, 4K PBR textures |
| **Kaedim** | $0.58 (Starter $29/mo, 50 models) | 4.5/5 (human-refined) | Standard | Enterprise | Best quality — AI + human artist loop |
| **Polycam** | $14.99/mo unlimited | 4/5 (LiDAR) | GLB + USDZ native | Enterprise | Best if you have physical product access |
| **Luma Genie** | ~$10-30/mo | 3.5/5 | All major formats | Limited | Risky — Luma focusing on video, Genie deprioritized |
| **CSM/Anything3D** | Was $2.50-100/mo | N/A | N/A | Shutdown | **Avoid** — Cube webapp shut down Jan 2026 |
| **Shap-E (OpenAI)** | Free | 1.5/5 | Basic mesh | N/A | Not production-ready |
| **TripoSR** | Free (self-hosted) | 2.5/5 | Needs conversion | N/A | Viable for prototyping, needs GPU infra |

### Key Insight
AI generation costs are nearly zero ($20-80 total for 50 models). But **every AI model needs manual cleanup** (retopology, UV, PBR materials, scale correction) — cleanup costs $130-370/model, dominating total cost.

---

## 2. Production Approaches Compared

| Approach | Per-Model | Total (50) | Timeline | AR Quality | Scalability |
|----------|----------|------------|----------|------------|-------------|
| **AR specialist (Hexa/Avataar)** | $85-220 | $4,250-11,000 | 3-6 wks | 4.5/5 | Excellent |
| AI + artist hybrid | $100-220 | $5,000-11,000 | 4-7 wks | 3.5/5 | Good |
| From-scratch freelance | $115-290 | $5,800-14,500 | 4-8 wks | 4/5 | Good |
| AI + cleanup | $130-370 | $6,500-18,500 | 4-8 wks | 3/5 | Good |
| Freelance platform | $120-290 | $6,000-14,500 | 6-10 wks | 3.5/5 | Moderate |
| DIY photogrammetry | $240-435 | $12,000-21,750 | 8-16 wks | 4/5 | Good (long-term) |

---

## 3. Recommendation: Tiered Pipeline

### Tier 1 — Primary: Hexa (Amazon) or Avataar
- Purpose-built for furniture e-commerce AR
- Accept product photos + dimensions as input
- Deliver AR-ready USDZ + GLB
- Volume pricing at 50+ models
- **Budget: $4,000-11,000 | Timeline: 3-6 weeks**

### Tier 2 — Hero Products: Polycam LiDAR Scanning
- For 5-10 bestsellers needing pixel-perfect accuracy
- Requires iPhone Pro/iPad Pro + physical product access
- $14.99/mo, no per-model limit
- Best geometric accuracy of any approach

### Tier 3 — Fabric Texture Enhancement: Hyper3D Rodin
- For models where fabric texture fidelity is critical
- $0.40/model via fal.ai API (~$20 for 50)
- 4K PBR textures — best photorealism available

### Tier 4 — Fallback: Kaedim
- AI + human artist refinement for any models failing QA
- $29/mo for 50 models
- 85-90% accuracy on hard-surface furniture

---

## 4. Technical Requirements for AR Models

### File Formats
| Format | Platform | Use |
|--------|----------|-----|
| **USDZ** | iOS (ARKit, AR Quick Look) | Apple-required, self-contained ZIP |
| **GLB** | Android (ARCore, Scene Viewer) | glTF 2.0 binary container |

**Source of truth**: Author/store as GLB, derive USDZ via conversion.

### Model Specifications

| Metric | Target | Hard Limit |
|--------|--------|------------|
| Triangle count | 50,000-80,000 | 100,000 |
| Texture resolution | 2048x2048 | Never 4096x4096 |
| GLB file size | 3-10 MB | 20 MB |
| USDZ file size | 5-15 MB | 25 MB |
| AR frame rate | 60 FPS | Never below 30 FPS |
| Load time (LTE) | < 3 seconds | < 5 seconds |
| Scale unit | Meters | Always meters |
| Model origin | Bottom center | Consistent across all |
| Total catalog | ~500 MB | ~1.25 GB |

### PBR Material Properties

| Property | Futon/Fabric | Wood Frame | Metal Hardware |
|----------|-------------|------------|----------------|
| Metallic | 0.0 | 0.0 | 0.8-1.0 |
| Roughness | 0.7-0.9 | 0.3-0.5 | 0.1-0.3 |
| Base color | Fabric pattern texture | Wood grain texture | Metal color |
| Normal map | Essential (fabric weave) | Essential (grain depth) | Optional |

### Photo Input Guidelines (for AI/service providers)
- 8-12 photos per product minimum
- Front, side, back, 3/4, top-down, detail angles
- Clean neutral background (white/light gray)
- Even diffuse lighting, no harsh shadows
- High resolution (min 1024x1024, ideal 2048x2048+)
- For futons: capture both sofa AND bed configurations
- For murphy cabinets: capture open AND closed states

---

## 5. Conversion & Delivery Pipeline

```
Source (service output or Blender .blend)
        |
        v
   [Blender Export]
        |
        v
   Raw GLB (unoptimized)
        |
        +------------------------+
        v                        v
  [gltf-transform]         [usdzconvert]
        |                        |
        v                        v
  Optimized GLB              USDZ
  (Draco + KTX2)          (iOS AR Quick Look)
        |                        |
        v                        v
  [glTF Validator]    [Reality Converter QA]
        |                        |
        v                        v
  Upload to CDN            Upload to CDN
```

### Tools
- **gltf-transform** (CLI/Node): optimize GLB — Draco compression, KTX2 textures, mesh quantization
- **usdzconvert** (Apple CLI, macOS): GLB-to-USDZ conversion
- **glTF Validator** (Khronos): automated spec compliance check
- **Reality Converter** (macOS): visual USDZ QA
- **Blender** (Python scripting): batch operations

### Hosting
- CDN with correct MIME types: `model/gltf-binary` (GLB), `model/vnd.usdz+zip` (USDZ)
- Content-hash URLs for cache busting
- Two-tier loading: low-detail preview (< 1 MB) + full-detail on demand
- Disk cache: 200-300 MB LRU in app cache directory
- Integrate with existing `ProductCacheService` for offline AR

### Fabric Variants
- GLB: Use `KHR_materials_variants` extension (one file, multiple fabrics)
- USDZ: Separate files per variant (no material variant support)
- Automate variant generation via texture-swap script

---

## 6. QA Checklist (Per Model)

- [ ] Triangle count within budget (50K-80K)
- [ ] No non-manifold geometry or inverted normals
- [ ] Real-world dimensions correct (meters)
- [ ] Origin at bottom center
- [ ] Textures power-of-two (1024 or 2048)
- [ ] PBR values physically plausible
- [ ] glTF Validator passes
- [ ] Visual check in Reality Converter (USDZ)
- [ ] On-device test: AR Quick Look (iOS) + Scene Viewer (Android)
- [ ] File size within budget
- [ ] Loads in < 3s on LTE

---

## 7. Common AI-Generated Model Issues

| Issue | Description | Fix |
|-------|-------------|-----|
| Excessive polygons | AI outputs 200K-500K+ tris | Decimate in Blender |
| Baked-in lighting | Lighting in base color texture | Retexture with proper PBR |
| Wrong scale | Arbitrary units | Rescale to meters with real dimensions |
| Missing back/bottom | AI skips hidden sides | Add geometry for AR visibility |
| Texture seams | Visible lines at UV boundaries | Texture paint fix, ensure UV padding |
| No material separation | Single texture for everything | Separate fabric/wood/metal materials |
| Soft/blobby edges | AI smooths hard edges | Manual edge cleanup in Blender |

---

## 8. Budget Scenarios

| Scenario | Budget | Timeline | Notes |
|----------|--------|----------|-------|
| **Aggressive** | $4,000-7,500 | 3-5 weeks | AR specialist, volume rate |
| **Moderate** | $7,500-12,000 | 4-7 weeks | Specialist + freelance fallback |
| **Conservative** | $12,000-18,000 | 6-10 weeks | Studio quality, all variants |

---

## Next Steps

1. Get quotes from Hexa and Avataar for 50 furniture models
2. Prepare product photo kit (shooting guide for consistent input)
3. Create 1-2 pilot models to validate pipeline before full batch
4. Coordinate with Artemis on AR SDK choice (affects format priorities)
5. Set up CDN bucket and conversion CI pipeline
