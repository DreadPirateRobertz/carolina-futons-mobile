# 3D Model Pipeline — cm-9k2

Converts product photos into AR-ready GLB + USDZ assets for the Carolina Futons mobile app.

## Quick Start

```bash
# Step 1: Place product photos in photos/{slug}/ directories
# Photo names should match catalog-MASTER.json photoInputs.required

# Step 2: Generate initial GLB from photos (via AI service)
npx tsx scripts/pipeline/generate.ts

# Step 3: Optimize GLB + convert to USDZ
npx tsx scripts/pipeline/convert.ts

# Step 4: Validate output
npx tsx scripts/pipeline/validate.ts --dir scripts/pipeline/output

# Step 5: Sync app catalog with pipeline output
npx tsx scripts/pipeline/sync-catalog.ts
```

## Pipeline Flow

```
photos/{slug}/*.jpg
    |
[generate.ts] -> Photo-to-3D via AI service (Tripo/Meshy)
    |
input/{slug}.glb
    |
[convert.ts] -> gltf-transform optimize (Draco + KTX2)
    |
output/glb/{slug}-{hash}.glb
    |
[usdzconvert] -> macOS only
    |
output/usdz/{slug}-{hash}.usdz
    |
[validation] -> Triangle count, file size, glTF spec
    |
output/manifest.json -> CDN-ready URLs + hashes
    |
[sync-catalog] -> Updates src/data/models3d.ts
```

## Commands

| Script | Purpose |
|--------|---------|
| `generate.ts` | Photo-to-3D generation via AI services |
| `convert.ts` | Optimize GLB + convert to USDZ |
| `validate.ts` | Standalone validation of .glb/.usdz files |
| `sync-catalog.ts` | Sync pipeline output -> app TypeScript catalog |

### generate.ts flags

- `--dry-run` — List products and photos without generating
- `--product <id>` — Generate single product
- `--service <name>` — Override service (`tripo`, `meshy`, `local`)

### convert.ts flags

- `--dry-run` — Validate without converting
- `--skip-usdz` — Skip USDZ conversion (Linux/CI)
- `--product <id>` — Process single product

### validate.ts flags

- `--strict` — Treat warnings as errors
- `--dir <path>` — Validate all files in directory

## AI Service Configuration

Copy `generate.config.json` and set your API keys:

| Service | Cost/Model | Quality | Multi-Image |
|---------|-----------|---------|-------------|
| **Tripo v3.0** | $0.25 | Best hard-surface | Yes (up to 8) |
| **Meshy** | $0.60 | Good all-around | Single image |
| **local** | Free | N/A | N/A (vendor-provided GLB) |

API keys can be set in `generate.config.json` or via environment variables:
- `TRIPO_API_KEY`
- `MESHY_API_KEY`

## Quality Targets

| Metric | Target | Hard Limit |
|--------|--------|------------|
| Triangles | 65,000 | 100,000 |
| GLB size | 8 MB | 20 MB |
| USDZ size | 15 MB | 25 MB |
| Texture | 2048x2048 | -- |

## Directory Structure

```
scripts/pipeline/
  generate.ts            # Photo-to-3D generation
  generate.config.json   # AI service API keys
  convert.ts             # GLB optimization + USDZ conversion
  validate.ts            # Quality validation
  sync-catalog.ts        # Sync manifest -> app catalog
  pipeline.config.json   # Convert/validate config
  photos/                # Product photos (organized by slug)
    murphy-queen-vertical/
      front-closed.jpg
      front-open.jpg
      ...
  input/                 # Raw GLB from generation or vendor
  output/                # Optimized GLB + USDZ output
    glb/
    usdz/
    manifest.json
```

## Prerequisites

- Node.js 18+
- `npx tsx` (included in devDependencies)
- `@gltf-transform/cli` — `npm install -g @gltf-transform/cli`
- `gltf-validator` — `npm install -g gltf-validator`
- `usdzconvert` — macOS only, from Apple's Reality Converter tools
- Tripo or Meshy API key (for photo-to-3D generation)
