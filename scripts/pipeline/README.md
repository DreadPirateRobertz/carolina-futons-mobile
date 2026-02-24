# 3D Model Pipeline — cm-9k2

Converts vendor/AI-generated 3D models into AR-ready GLB + USDZ assets for the Carolina Futons mobile app.

## Quick Start

```bash
# Full pipeline (generate → convert → validate → sync)
npm run pipeline:all

# Or step by step:

# 1. Generate 3D models from product photos (requires API key)
npm run pipeline:generate

# 2. Optimize GLB + convert to USDZ
npm run pipeline:convert

# 3. Validate output quality
npm run pipeline:validate

# 4. Sync app catalog with pipeline output
npm run pipeline:sync
```

## Pipeline Flow

```
photos/{slug}/*.jpg
    ↓
[generate.ts] → Tripo v3.0 / Meshy AI / local vendor models
    ↓
input/{slug}.glb
    ↓
[convert.ts] → gltf-transform optimize (Draco + KTX2)
    ↓
output/glb/{slug}-{hash}.glb
    ↓
[usdzconvert] → macOS only
    ↓
output/usdz/{slug}-{hash}.usdz
    ↓
[validation] → Triangle count, file size, glTF spec
    ↓
output/manifest.json → CDN-ready URLs + hashes
    ↓
[sync-catalog.ts] → Updates src/data/models3d.ts
```

## Commands

| Script | Purpose |
|--------|---------|
| `generate.ts` | Photo-to-3D generation via AI services |
| `convert.ts` | Main pipeline — optimize, convert, validate |
| `validate.ts` | Standalone validation of .glb/.usdz files |
| `sync-catalog.ts` | Sync pipeline output → app TypeScript catalog |

### generate.ts flags

- `--dry-run` — Show what would be generated without calling APIs
- `--product <id>` — Generate single product
- `--service <name>` — Override service (tripo, meshy, local)

### convert.ts flags

- `--dry-run` — Validate without converting
- `--skip-usdz` — Skip USDZ conversion (Linux/CI)
- `--product <id>` — Process single product

### validate.ts flags

- `--strict` — Treat warnings as errors
- `--dir <path>` — Validate all files in directory

## Setup

Copy the config example and add your API keys:

```bash
cp scripts/pipeline/generate.config.json.example scripts/pipeline/generate.config.json
# Edit generate.config.json with your Tripo or Meshy API key
```

## Quality Targets

| Metric | Target | Hard Limit |
|--------|--------|------------|
| Triangles | 65,000 | 100,000 |
| GLB size | 8 MB | 20 MB |
| USDZ size | 15 MB | 25 MB |
| Texture | 2048x2048 | — |

## Prerequisites

- Node.js 18+
- `npx tsx` (included in devDependencies)
- `@gltf-transform/cli` — `npm install -g @gltf-transform/cli`
- `gltf-validator` — `npm install -g gltf-validator`
- `usdzconvert` — macOS only, from Apple's Reality Converter tools
