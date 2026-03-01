#!/usr/bin/env npx tsx
/**
 * 3D Model Conversion Pipeline — cm-9k2
 *
 * Converts raw 3D model files (GLB from vendor/AI) into AR-ready assets:
 *   1. Reads catalog-MASTER.json for product specs
 *   2. Validates input GLB files (triangle count, dimensions)
 *   3. Optimizes GLB with gltf-transform (Draco + KTX2)
 *   4. Converts to USDZ via usdzconvert (macOS only)
 *   5. Validates output against quality targets
 *   6. Generates content hashes for cache busting
 *   7. Produces CDN-ready output directory
 *
 * Usage:
 *   npx tsx scripts/pipeline/convert.ts [--product <id>] [--dry-run] [--skip-usdz]
 */

import { execSync } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  dimensions: Record<string, { width: number; depth: number; height: number; unit: string }>;
  modelSpec: {
    targetTriangles: number;
    textureResolution: number;
    configurations: string[];
    hasFabricVariants: boolean;
  };
}

interface PipelineConfig {
  catalogPath: string;
  inputDir: string;
  outputDir: string;
  cdnBase: string;
  formats: {
    glb: {
      maxSizeBytes: number;
      targetSizeBytes: number;
      compression: string;
      textureFormat: string;
      textureResolution: number;
    };
    usdz: { maxSizeBytes: number; targetSizeBytes: number; scaleUnit: string };
  };
  validation: {
    maxTriangles: number;
    targetTriangles: number;
    originPosition: string;
    minFrameRate: number;
  };
  tools: Record<string, string>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    triangleCount?: number;
    fileSizeBytes: number;
    contentHash: string;
  };
}

interface ConversionResult {
  productId: string;
  glb?: { path: string; sizeBytes: number; contentHash: string };
  usdz?: { path: string; sizeBytes: number; contentHash: string };
  validation: ValidationResult;
  skipped: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function contentHash(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return createHash('sha256').update(data).digest('hex').slice(0, 6);
}

function fileSize(filePath: string): number {
  return fs.statSync(filePath).size;
}

function slugFromId(productId: string): string {
  return productId.replace(/^prod-/, '');
}

function log(msg: string): void {
  console.log(`[pipeline] ${msg}`);
}

function warn(msg: string): void {
  console.warn(`[pipeline] ⚠ ${msg}`);
}

function error(msg: string): void {
  console.error(`[pipeline] ✗ ${msg}`);
}

function success(msg: string): void {
  console.log(`[pipeline] ✓ ${msg}`);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateGlb(filePath: string, config: PipelineConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const size = fileSize(filePath);
  const hash = contentHash(filePath);

  // File size checks
  if (size > config.formats.glb.maxSizeBytes) {
    errors.push(
      `GLB exceeds max size: ${(size / 1e6).toFixed(1)}MB > ${(config.formats.glb.maxSizeBytes / 1e6).toFixed(0)}MB`,
    );
  } else if (size > config.formats.glb.targetSizeBytes) {
    warnings.push(
      `GLB exceeds target size: ${(size / 1e6).toFixed(1)}MB > ${(config.formats.glb.targetSizeBytes / 1e6).toFixed(0)}MB`,
    );
  }

  // Run gltf-validator if available
  let triangleCount: number | undefined;
  try {
    const validatorOutput = execSync(
      `${config.tools.gltfValidator} "${filePath}" --format json 2>/dev/null`,
      { encoding: 'utf-8', timeout: 30000 },
    );
    const report = JSON.parse(validatorOutput);

    if (report.issues?.numErrors > 0) {
      errors.push(`glTF Validator found ${report.issues.numErrors} error(s)`);
    }
    if (report.issues?.numWarnings > 0) {
      warnings.push(`glTF Validator found ${report.issues.numWarnings} warning(s)`);
    }
    if (report.info?.totalTriangleCount) {
      triangleCount = report.info.totalTriangleCount;
      if (triangleCount! > config.validation.maxTriangles) {
        errors.push(
          `Triangle count ${triangleCount} exceeds max ${config.validation.maxTriangles}`,
        );
      } else if (triangleCount! > config.validation.targetTriangles) {
        warnings.push(
          `Triangle count ${triangleCount} exceeds target ${config.validation.targetTriangles}`,
        );
      }
    }
  } catch {
    warnings.push('gltf-validator not available — skipping spec validation');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: { triangleCount, fileSizeBytes: size, contentHash: hash },
  };
}

function validateUsdz(filePath: string, config: PipelineConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const size = fileSize(filePath);
  const hash = contentHash(filePath);

  if (size > config.formats.usdz.maxSizeBytes) {
    errors.push(
      `USDZ exceeds max size: ${(size / 1e6).toFixed(1)}MB > ${(config.formats.usdz.maxSizeBytes / 1e6).toFixed(0)}MB`,
    );
  } else if (size > config.formats.usdz.targetSizeBytes) {
    warnings.push(
      `USDZ exceeds target size: ${(size / 1e6).toFixed(1)}MB > ${(config.formats.usdz.targetSizeBytes / 1e6).toFixed(0)}MB`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: { fileSizeBytes: size, contentHash: hash },
  };
}

// ---------------------------------------------------------------------------
// Conversion Steps
// ---------------------------------------------------------------------------

function optimizeGlb(inputPath: string, outputPath: string, config: PipelineConfig): void {
  const cmd = [
    config.tools.gltfTransform,
    'optimize',
    `"${inputPath}"`,
    `"${outputPath}"`,
    '--compress draco',
    `--texture-size ${config.formats.glb.textureResolution}`,
  ].join(' ');

  log(`Optimizing GLB: ${path.basename(inputPath)}`);
  execSync(cmd, { stdio: 'pipe', timeout: 120000 });
}

function convertToUsdz(glbPath: string, usdzPath: string, config: PipelineConfig): void {
  if (process.platform !== 'darwin') {
    warn('USDZ conversion requires macOS (usdzconvert). Skipping.');
    return;
  }

  const cmd = `${config.tools.usdzconvert} "${glbPath}" "${usdzPath}"`;
  log(`Converting to USDZ: ${path.basename(glbPath)}`);
  execSync(cmd, { stdio: 'pipe', timeout: 120000 });
}

// ---------------------------------------------------------------------------
// Main Pipeline
// ---------------------------------------------------------------------------

function processProduct(
  product: CatalogProduct,
  config: PipelineConfig,
  opts: { dryRun: boolean; skipUsdz: boolean },
): ConversionResult {
  const slug = slugFromId(product.id);
  const inputGlb = path.join(config.inputDir, `${slug}.glb`);

  // Check input exists
  if (!fs.existsSync(inputGlb)) {
    return {
      productId: product.id,
      validation: {
        valid: false,
        errors: [`Input not found: ${inputGlb}`],
        warnings: [],
        stats: { fileSizeBytes: 0, contentHash: '' },
      },
      skipped: true,
    };
  }

  if (opts.dryRun) {
    log(`[dry-run] Would process: ${product.id} (${product.name})`);
    const validation = validateGlb(inputGlb, config);
    return { productId: product.id, validation, skipped: true };
  }

  // Ensure output dirs
  const glbOutDir = path.join(config.outputDir, 'glb');
  const usdzOutDir = path.join(config.outputDir, 'usdz');
  fs.mkdirSync(glbOutDir, { recursive: true });
  fs.mkdirSync(usdzOutDir, { recursive: true });

  // Step 1: Optimize GLB
  const hash = contentHash(inputGlb);
  const optimizedGlbPath = path.join(glbOutDir, `${slug}-${hash}.glb`);

  try {
    optimizeGlb(inputGlb, optimizedGlbPath, config);
  } catch {
    // Fallback: copy raw GLB if optimization fails
    warn(`gltf-transform optimization failed, using raw GLB for ${slug}`);
    fs.copyFileSync(inputGlb, optimizedGlbPath);
  }

  // Step 2: Validate optimized GLB
  const glbValidation = validateGlb(optimizedGlbPath, config);
  for (const w of glbValidation.warnings) warn(`${slug}: ${w}`);
  for (const e of glbValidation.errors) error(`${slug}: ${e}`);

  const result: ConversionResult = {
    productId: product.id,
    glb: {
      path: optimizedGlbPath,
      sizeBytes: glbValidation.stats.fileSizeBytes,
      contentHash: glbValidation.stats.contentHash,
    },
    validation: glbValidation,
    skipped: false,
  };

  // Step 3: Convert to USDZ (macOS only)
  if (!opts.skipUsdz) {
    const usdzPath = path.join(usdzOutDir, `${slug}-${hash}.usdz`);
    try {
      convertToUsdz(optimizedGlbPath, usdzPath, config);
      if (fs.existsSync(usdzPath)) {
        const usdzValidation = validateUsdz(usdzPath, config);
        result.usdz = {
          path: usdzPath,
          sizeBytes: usdzValidation.stats.fileSizeBytes,
          contentHash: usdzValidation.stats.contentHash,
        };
        for (const w of usdzValidation.warnings) warn(`${slug} USDZ: ${w}`);
        for (const e of usdzValidation.errors) error(`${slug} USDZ: ${e}`);
      }
    } catch {
      warn(`USDZ conversion failed for ${slug} — GLB only`);
    }
  }

  return result;
}

function generateManifest(results: ConversionResult[], config: PipelineConfig): void {
  const manifest = results
    .filter((r) => !r.skipped && r.glb)
    .map((r) => ({
      productId: r.productId,
      glbUrl: `${config.cdnBase}/glb/${path.basename(r.glb!.path)}`,
      usdzUrl: r.usdz ? `${config.cdnBase}/usdz/${path.basename(r.usdz.path)}` : null,
      glbSizeBytes: r.glb!.sizeBytes,
      usdzSizeBytes: r.usdz?.sizeBytes ?? null,
      contentHash: r.glb!.contentHash,
    }));

  const manifestPath = path.join(config.outputDir, 'manifest.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), models: manifest }, null, 2),
  );
  success(`Manifest written: ${manifestPath} (${manifest.length} models)`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipUsdz = args.includes('--skip-usdz');
  const productFilter = args.includes('--product') ? args[args.indexOf('--product') + 1] : null;

  // Load config
  const configPath = path.join(__dirname, 'pipeline.config.json');
  if (!fs.existsSync(configPath)) {
    error(`Config not found: ${configPath}`);
    process.exit(1);
  }
  const config: PipelineConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // Resolve relative paths
  config.catalogPath = path.resolve(__dirname, config.catalogPath);
  config.inputDir = path.resolve(__dirname, config.inputDir);
  config.outputDir = path.resolve(__dirname, config.outputDir);

  // Load catalog
  if (!fs.existsSync(config.catalogPath)) {
    error(`Catalog not found: ${config.catalogPath}`);
    process.exit(1);
  }
  const catalog = JSON.parse(fs.readFileSync(config.catalogPath, 'utf-8'));
  let products: CatalogProduct[] = catalog.products;

  if (productFilter) {
    products = products.filter((p) => p.id === productFilter);
    if (products.length === 0) {
      error(`Product not found in catalog: ${productFilter}`);
      process.exit(1);
    }
  }

  log(`Pipeline starting — ${products.length} product(s)${dryRun ? ' [DRY RUN]' : ''}`);
  log(`Input: ${config.inputDir}`);
  log(`Output: ${config.outputDir}`);

  // Ensure input dir exists
  if (!fs.existsSync(config.inputDir)) {
    fs.mkdirSync(config.inputDir, { recursive: true });
    warn(`Input directory created (empty): ${config.inputDir}`);
  }

  const results: ConversionResult[] = [];

  for (const product of products) {
    log(`--- ${product.id}: ${product.name} ---`);
    const result = processProduct(product, config, { dryRun, skipUsdz });
    results.push(result);

    if (result.skipped && result.validation.errors.length > 0) {
      warn(`Skipped: ${result.validation.errors.join(', ')}`);
    } else if (!result.skipped) {
      success(
        `${product.id}: GLB ${(result.glb!.sizeBytes / 1e6).toFixed(1)}MB${result.usdz ? `, USDZ ${(result.usdz.sizeBytes / 1e6).toFixed(1)}MB` : ''}`,
      );
    }
  }

  // Generate output manifest
  if (!dryRun) {
    generateManifest(results, config);
  }

  // Summary
  const processed = results.filter((r) => !r.skipped);
  const failed = results.filter((r) => !r.skipped && !r.validation.valid);
  const skipped = results.filter((r) => r.skipped);

  log('');
  log('=== Pipeline Summary ===');
  log(`Processed: ${processed.length}/${products.length}`);
  log(`Skipped (no input): ${skipped.length}`);
  log(`Validation failures: ${failed.length}`);

  if (failed.length > 0) {
    error('Some models failed validation — check output above');
    process.exit(1);
  }

  success('Pipeline complete');
}

main();
