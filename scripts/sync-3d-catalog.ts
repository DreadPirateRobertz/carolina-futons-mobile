#!/usr/bin/env npx tsx
/**
 * 3D Model Catalog Sync — cfutons_mobile-ec9.11
 *
 * Reads the canonical shared/catalog-3d.json and generates platform-specific
 * modules:
 *   - TypeScript for mobile (src/data/models3d.ts)
 *   - JavaScript for web   (shared/models3d.web.js)
 *
 * Usage:
 *   npx tsx scripts/sync-3d-catalog.ts              # Generate to default paths
 *   npx tsx scripts/sync-3d-catalog.ts --check       # CI mode: verify in sync
 *   npx tsx scripts/sync-3d-catalog.ts --catalog <path> --ts-out <path> --js-out <path>
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

interface CatalogModel {
  productId: string;
  category: string;
  dimensions: { width: number; depth: number; height: number; unit: string };
  glbUrl: string | null;
  usdzUrl: string | null;
  fileSizeBytes: number;
  contentHash: string;
  hasFabricVariants: boolean;
}

interface Catalog {
  version: string;
  description: string;
  cdnBase: string;
  models: CatalogModel[];
}

function parseArgs(): {
  catalogPath: string;
  tsOut: string;
  jsOut: string;
  check: boolean;
} {
  const args = process.argv.slice(2);
  const root = path.resolve(__dirname, '..');

  const catalogIdx = args.indexOf('--catalog');
  const tsOutIdx = args.indexOf('--ts-out');
  const jsOutIdx = args.indexOf('--js-out');
  const check = args.includes('--check');

  return {
    catalogPath: catalogIdx !== -1
      ? args[catalogIdx + 1]
      : path.join(root, 'shared', 'catalog-3d.json'),
    tsOut: tsOutIdx !== -1
      ? args[tsOutIdx + 1]
      : path.join(root, 'src', 'data', 'models3d.ts'),
    jsOut: jsOutIdx !== -1
      ? args[jsOutIdx + 1]
      : path.join(root, 'shared', 'models3d.web.js'),
    check,
  };
}

function formatSize(bytes: number): string {
  // Format with underscores for readability: 7_200_000
  const str = bytes.toString();
  const parts: string[] = [];
  for (let i = str.length; i > 0; i -= 3) {
    parts.unshift(str.slice(Math.max(0, i - 3), i));
  }
  return parts.join('_');
}

function resolveGlbUrl(model: CatalogModel, cdnBase: string): string {
  if (model.glbUrl) {
    return `'${model.glbUrl}'`;
  }
  const slug = model.productId.replace(/^prod-/, '');
  return `\`\${MODEL_CDN_BASE}/glb/${slug}-${model.contentHash}.glb\``;
}

function resolveUsdzUrl(model: CatalogModel, cdnBase: string): string {
  if (model.usdzUrl) {
    return `'${model.usdzUrl}'`;
  }
  const slug = model.productId.replace(/^prod-/, '');
  return `\`\${MODEL_CDN_BASE}/usdz/${slug}-${model.contentHash}.usdz\``;
}

function generateTypeScript(catalog: Catalog): string {
  const lines: string[] = [];

  lines.push(`/**`);
  lines.push(` * 3D model asset catalog for AR "View in Your Room" feature.`);
  lines.push(` *`);
  lines.push(` * AUTO-GENERATED from shared/catalog-3d.json — do not edit manually.`);
  lines.push(` * Run: npx tsx scripts/sync-3d-catalog.ts`);
  lines.push(` *`);
  lines.push(` * Each product with AR support maps to a pair of 3D model files:`);
  lines.push(` * - USDZ for iOS AR Quick Look`);
  lines.push(` * - GLB for Android Scene Viewer / custom renderer`);
  lines.push(` *`);
  lines.push(` * Dimensions in meters (required by ARKit/ARCore for real-world scale).`);
  lines.push(` */`);
  lines.push(``);
  lines.push(`/** CDN base URL for 3D model assets */`);
  lines.push(`export const MODEL_CDN_BASE = '${catalog.cdnBase}';`);
  lines.push(``);
  lines.push(`export interface Model3DAsset {`);
  lines.push(`  /** Product ID — matches Product.id from products.ts */`);
  lines.push(`  productId: string;`);
  lines.push(`  /** GLB model URL (Android / cross-platform) */`);
  lines.push(`  glbUrl: string;`);
  lines.push(`  /** USDZ model URL (iOS AR Quick Look) */`);
  lines.push(`  usdzUrl: string;`);
  lines.push(`  /** Real-world dimensions in meters */`);
  lines.push(`  dimensions: {`);
  lines.push(`    width: number;`);
  lines.push(`    depth: number;`);
  lines.push(`    height: number;`);
  lines.push(`  };`);
  lines.push(`  /** Approximate file size in bytes (GLB) for download progress */`);
  lines.push(`  fileSizeBytes: number;`);
  lines.push(`  /** Content hash for cache busting */`);
  lines.push(`  contentHash: string;`);
  lines.push(`  /** Whether this model supports fabric variant swapping */`);
  lines.push(`  hasFabricVariants: boolean;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`/** Convert inches to meters */`);
  lines.push(`function inToM(inches: number): number {`);
  lines.push(`  return Math.round(inches * 0.0254 * 1000) / 1000;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`/**`);
  lines.push(` * 3D model catalog.`);
  lines.push(` * Only products with AR-suitable geometry are included (futons, frames, murphy-beds).`);
  lines.push(` * Covers, pillows, and small accessories are excluded from AR.`);
  lines.push(` */`);
  lines.push(`export const MODELS_3D: Model3DAsset[] = [`);

  // Group by category for readability
  const categories = ['murphy-beds', 'futons', 'frames'];
  const categoryComments: Record<string, string> = {
    'murphy-beds': '// --- Murphy Cabinet Beds ---',
    'futons': '// --- Futons & Frames ---',
    'frames': '',
  };

  let first = true;
  for (const cat of categories) {
    const models = catalog.models.filter((m) => m.category === cat);
    if (models.length === 0) continue;

    if (categoryComments[cat]) {
      if (!first) lines.push('');
      lines.push(`  ${categoryComments[cat]}`);
    }
    first = false;

    for (const model of models) {
      const slug = model.productId.replace(/^prod-/, '');
      const glbUrl = resolveGlbUrl(model, catalog.cdnBase);
      const usdzUrl = resolveUsdzUrl(model, catalog.cdnBase);

      lines.push(`  {`);

      // Add comment for real models
      if (model.glbUrl && model.glbUrl.includes('KhronosGroup')) {
        lines.push(`    // PoC: Real 3D model — KhronosGroup SheenChair (Wayfair, CC-BY-4.0)`);
      }

      lines.push(`    productId: '${model.productId}',`);
      lines.push(`    glbUrl: ${glbUrl},`);
      lines.push(`    usdzUrl: ${usdzUrl},`);
      lines.push(`    dimensions: { width: inToM(${model.dimensions.width}), depth: inToM(${model.dimensions.depth}), height: inToM(${model.dimensions.height}) },`);
      lines.push(`    fileSizeBytes: ${formatSize(model.fileSizeBytes)},`);
      lines.push(`    contentHash: '${model.contentHash}',`);
      lines.push(`    hasFabricVariants: ${model.hasFabricVariants},`);
      lines.push(`  },`);
    }
  }

  lines.push(`];`);
  lines.push(``);
  lines.push(`/** Look up 3D model asset for a product, returns undefined if no AR model exists */`);
  lines.push(`export function getModel3DForProduct(productId: string): Model3DAsset | undefined {`);
  lines.push(`  return MODELS_3D.find((m) => m.productId === productId);`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`/** Check whether a product has an AR model available */`);
  lines.push(`export function hasARModel(productId: string): boolean {`);
  lines.push(`  return MODELS_3D.some((m) => m.productId === productId);`);
  lines.push(`}`);
  lines.push(``);

  return lines.join('\n');
}

function resolveGlbUrlJs(model: CatalogModel, cdnBase: string): string {
  if (model.glbUrl) {
    return `'${model.glbUrl}'`;
  }
  const slug = model.productId.replace(/^prod-/, '');
  return `\`\${MODEL_CDN_BASE}/glb/${slug}-${model.contentHash}.glb\``;
}

function resolveUsdzUrlJs(model: CatalogModel, cdnBase: string): string {
  if (model.usdzUrl) {
    return `'${model.usdzUrl}'`;
  }
  const slug = model.productId.replace(/^prod-/, '');
  return `\`\${MODEL_CDN_BASE}/usdz/${slug}-${model.contentHash}.usdz\``;
}

function generateJavaScript(catalog: Catalog): string {
  const lines: string[] = [];

  lines.push(`/**`);
  lines.push(` * 3D model asset catalog for web platform.`);
  lines.push(` *`);
  lines.push(` * AUTO-GENERATED from shared/catalog-3d.json — do not edit manually.`);
  lines.push(` * Run: npx tsx scripts/sync-3d-catalog.ts`);
  lines.push(` */`);
  lines.push(``);
  lines.push(`const MODEL_CDN_BASE = '${catalog.cdnBase}';`);
  lines.push(``);
  lines.push(`function inToM(inches) {`);
  lines.push(`  return Math.round(inches * 0.0254 * 1000) / 1000;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`const MODELS_3D = [`);

  for (const model of catalog.models) {
    const glbUrl = resolveGlbUrlJs(model, catalog.cdnBase);
    const usdzUrl = resolveUsdzUrlJs(model, catalog.cdnBase);

    lines.push(`  {`);
    lines.push(`    productId: '${model.productId}',`);
    lines.push(`    glbUrl: ${glbUrl},`);
    lines.push(`    usdzUrl: ${usdzUrl},`);
    lines.push(`    dimensions: { width: inToM(${model.dimensions.width}), depth: inToM(${model.dimensions.depth}), height: inToM(${model.dimensions.height}) },`);
    lines.push(`    fileSizeBytes: ${model.fileSizeBytes},`);
    lines.push(`    contentHash: '${model.contentHash}',`);
    lines.push(`    hasFabricVariants: ${model.hasFabricVariants},`);
    lines.push(`  },`);
  }

  lines.push(`];`);
  lines.push(``);
  lines.push(`function getModel3DForProduct(productId) {`);
  lines.push(`  return MODELS_3D.find(function(m) { return m.productId === productId; });`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`function hasARModel(productId) {`);
  lines.push(`  return MODELS_3D.some(function(m) { return m.productId === productId; });`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`module.exports = { MODEL_CDN_BASE, MODELS_3D, getModel3DForProduct, hasARModel };`);
  lines.push(``);

  return lines.join('\n');
}

function main(): void {
  const { catalogPath, tsOut, jsOut, check } = parseArgs();

  if (!fs.existsSync(catalogPath)) {
    console.error(`Catalog not found: ${catalogPath}`);
    process.exit(1);
  }

  const catalog: Catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  console.log(`Catalog: ${catalog.models.length} models (v${catalog.version})`);

  const tsContent = generateTypeScript(catalog);
  const jsContent = generateJavaScript(catalog);

  if (check) {
    let mismatch = false;

    // Format TS content through prettier to match committed output
    const formattedTsContent = execFileSync(
      'npx',
      ['prettier', '--parser', 'typescript'],
      { input: tsContent, encoding: 'utf-8' },
    );

    if (fs.existsSync(tsOut)) {
      const existing = fs.readFileSync(tsOut, 'utf-8');
      if (existing !== formattedTsContent) {
        console.error(`MISMATCH: ${tsOut} is out of sync with ${catalogPath}`);
        mismatch = true;
      }
    } else {
      console.error(`MISSING: ${tsOut} does not exist`);
      mismatch = true;
    }

    if (fs.existsSync(jsOut)) {
      const existing = fs.readFileSync(jsOut, 'utf-8');
      if (existing !== jsContent) {
        console.error(`MISMATCH: ${jsOut} is out of sync with ${catalogPath}`);
        mismatch = true;
      }
    } else {
      console.error(`MISSING: ${jsOut} does not exist`);
      mismatch = true;
    }

    if (mismatch) {
      console.error('\nRun `npx tsx scripts/sync-3d-catalog.ts` to regenerate.');
      process.exit(1);
    }

    console.log('All generated files are in sync.');
    return;
  }

  // Write outputs
  fs.mkdirSync(path.dirname(tsOut), { recursive: true });
  fs.mkdirSync(path.dirname(jsOut), { recursive: true });

  fs.writeFileSync(tsOut, tsContent);
  execFileSync('npx', ['prettier', '--write', tsOut], { stdio: 'ignore' });
  console.log(`  Generated: ${tsOut}`);

  fs.writeFileSync(jsOut, jsContent);
  console.log(`  Generated: ${jsOut}`);
}

main();
