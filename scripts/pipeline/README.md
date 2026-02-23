# 3D Model Pipeline — cm-9k2

Converts vendor/AI-generated 3D models into AR-ready GLB + USDZ assets for the Carolina Futons mobile app.

## Quick Start

```bash
# Place raw .glb files in scripts/pipeline/input/
# File names must match product slug (e.g., murphy-queen-vertical.glb)

# Run the pipeline
npx tsx scripts/pipeline/convert.ts

# Validate output
npx tsx scripts/pipeline/validate.ts --dir scripts/pipeline/output

# Sync app catalog with pipeline output
npx tsx scripts/pipeline/sync-catalog.ts
```

## Pipeline Flow

```
input/{slug}.glb
    ↓
[gltf-transform optimize] → Draco compression + KTX2 textures
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
[sync-catalog] → Updates src/data/models3d.ts
```

## Commands

| Script | Purpose |
|--------|---------|
| `convert.ts` | Main pipeline — optimize, convert, validate |
| `validate.ts` | Standalone validation of .glb/.usdz files |
| `sync-catalog.ts` | Sync pipeline output → app TypeScript catalog |

### convert.ts flags

- `--dry-run` — Validate without converting
- `--skip-usdz` — Skip USDZ conversion (Linux/CI)
- `--product <id>` — Process single product

### validate.ts flags

- `--strict` — Treat warnings as errors
- `--dir <path>` — Validate all files in directory

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
