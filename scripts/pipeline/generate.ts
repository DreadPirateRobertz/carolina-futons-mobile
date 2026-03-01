#!/usr/bin/env npx tsx
/**
 * Photo-to-3D Model Generation — cm-9k2
 *
 * Converts product photos into initial GLB models using AI services.
 * This is the first step in the pipeline, before convert.ts optimizes them.
 *
 * Pipeline flow:
 *   photos/{slug}/*.jpg  →  [generate.ts]  →  input/{slug}.glb
 *                                                    ↓
 *                                              [convert.ts]
 *                                                    ↓
 *                                              output/glb/ + output/usdz/
 *
 * Supported services (configured in generate.config.json):
 *   - tripo: Tripo v3.0 API — best hard-surface quality ($0.25/model)
 *   - meshy: Meshy API — good all-around ($0.60/model)
 *   - local: Skip generation, expect pre-placed GLB in input/ (for vendor-provided models)
 *
 * Usage:
 *   npx tsx scripts/pipeline/generate.ts [--product <id>] [--service <name>] [--dry-run]
 *
 * Prerequisites:
 *   - Product photos in photos/{slug}/ directory (see catalog-MASTER.json photoInputs)
 *   - API key in generate.config.json or environment variable
 */

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
  photoInputs: {
    required: string[];
    directory: string;
  };
  modelSpec: {
    targetTriangles: number;
    textureResolution: number;
    configurations: string[];
    hasFabricVariants: boolean;
  };
}

interface GenerateConfig {
  service: 'tripo' | 'meshy' | 'local';
  photosDir: string;
  outputDir: string;
  catalogPath: string;
  tripo: {
    apiKey: string;
    apiBase: string;
    modelVersion: string;
    outputFormat: string;
    targetTriangles: number;
    textureResolution: number;
    pollIntervalMs: number;
    timeoutMs: number;
  };
  meshy: {
    apiKey: string;
    apiBase: string;
    topology: string;
    targetPolycount: number;
    textureResolution: number;
    pollIntervalMs: number;
    timeoutMs: number;
  };
}

interface GenerationResult {
  productId: string;
  slug: string;
  service: string;
  outputPath: string | null;
  photosUsed: string[];
  skipped: boolean;
  error?: string;
  durationMs?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string): void {
  console.log(`[generate] ${msg}`);
}

function warn(msg: string): void {
  console.warn(`[generate] ⚠ ${msg}`);
}

function error(msg: string): void {
  console.error(`[generate] ✗ ${msg}`);
}

function success(msg: string): void {
  console.log(`[generate] ✓ ${msg}`);
}

function slugFromId(productId: string): string {
  return productId.replace(/^prod-/, '');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Discover available photos for a product.
 * Returns absolute paths to all image files found.
 */
function findProductPhotos(photosDir: string, product: CatalogProduct): string[] {
  const dir = path.resolve(photosDir, product.photoInputs.directory);
  if (!fs.existsSync(dir)) return [];

  const extensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic']);
  return fs
    .readdirSync(dir)
    .filter((f) => extensions.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(dir, f))
    .sort();
}

/**
 * Validate that required photos exist for a product.
 */
function validatePhotos(
  photos: string[],
  product: CatalogProduct,
): { valid: boolean; missing: string[]; found: string[] } {
  const photoNames = photos.map((p) => path.basename(p, path.extname(p)).toLowerCase());
  const required = product.photoInputs.required;
  const found = required.filter((r) => photoNames.some((n) => n.includes(r)));
  const missing = required.filter((r) => !photoNames.some((n) => n.includes(r)));

  return {
    valid: found.length >= Math.ceil(required.length * 0.5), // Need at least 50% of required photos
    missing,
    found,
  };
}

// ---------------------------------------------------------------------------
// Service: Tripo v3.0
// ---------------------------------------------------------------------------

async function generateWithTripo(
  photos: string[],
  product: CatalogProduct,
  outputPath: string,
  config: GenerateConfig['tripo'],
): Promise<void> {
  if (!config.apiKey || config.apiKey === 'YOUR_TRIPO_API_KEY') {
    throw new Error(
      'Tripo API key not configured. Set tripo.apiKey in generate.config.json or TRIPO_API_KEY env var.',
    );
  }

  // Step 1: Upload images
  log(`Uploading ${photos.length} photos to Tripo...`);
  const imageTokens: string[] = [];

  for (const photo of photos.slice(0, 8)) {
    // Tripo accepts up to 8 images
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(photo);
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
    formData.append('file', blob, path.basename(photo));

    const uploadRes = await fetch(`${config.apiBase}/v2/openapi/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: formData,
    });

    if (!uploadRes.ok) {
      throw new Error(`Tripo upload failed (${uploadRes.status}): ${await uploadRes.text()}`);
    }

    const uploadData = (await uploadRes.json()) as { data: { image_token: string } };
    imageTokens.push(uploadData.data.image_token);
  }

  // Step 2: Create generation task
  log('Starting 3D generation task...');
  const taskRes = await fetch(`${config.apiBase}/v2/openapi/task`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'image_to_model',
      file: {
        type: 'multi_image',
        file_tokens: imageTokens,
      },
      model_version: config.modelVersion,
      face_limit: config.targetTriangles,
      texture: true,
      texture_resolution: config.textureResolution,
      pbr: true,
    }),
  });

  if (!taskRes.ok) {
    throw new Error(`Tripo task creation failed (${taskRes.status}): ${await taskRes.text()}`);
  }

  const taskData = (await taskRes.json()) as { data: { task_id: string } };
  const taskId = taskData.data.task_id;
  log(`Task created: ${taskId}`);

  // Step 3: Poll for completion
  const deadline = Date.now() + config.timeoutMs;
  let modelUrl: string | null = null;

  while (Date.now() < deadline) {
    await sleep(config.pollIntervalMs);

    const statusRes = await fetch(`${config.apiBase}/v2/openapi/task/${taskId}`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });

    if (!statusRes.ok) {
      warn(`Status check failed (${statusRes.status}), retrying...`);
      continue;
    }

    const statusData = (await statusRes.json()) as {
      data: { status: string; progress: number; output?: { model?: string } };
    };

    const { status, progress, output } = statusData.data;
    log(`  Status: ${status} (${Math.round(progress * 100)}%)`);

    if (status === 'success' && output?.model) {
      modelUrl = output.model;
      break;
    } else if (status === 'failed') {
      throw new Error('Tripo generation failed');
    }
  }

  if (!modelUrl) {
    throw new Error('Tripo generation timed out');
  }

  // Step 4: Download model
  log('Downloading generated model...');
  const modelRes = await fetch(modelUrl);
  if (!modelRes.ok) {
    throw new Error(`Model download failed (${modelRes.status})`);
  }

  const modelBuffer = Buffer.from(await modelRes.arrayBuffer());
  fs.writeFileSync(outputPath, modelBuffer);
  success(`Downloaded: ${path.basename(outputPath)} (${(modelBuffer.length / 1e6).toFixed(1)}MB)`);
}

// ---------------------------------------------------------------------------
// Service: Meshy
// ---------------------------------------------------------------------------

async function generateWithMeshy(
  photos: string[],
  product: CatalogProduct,
  outputPath: string,
  config: GenerateConfig['meshy'],
): Promise<void> {
  if (!config.apiKey || config.apiKey === 'YOUR_MESHY_API_KEY') {
    throw new Error(
      'Meshy API key not configured. Set meshy.apiKey in generate.config.json or MESHY_API_KEY env var.',
    );
  }

  // Step 1: Upload primary image
  const primaryPhoto = photos[0]; // Meshy uses a single primary image
  log(`Uploading primary photo to Meshy: ${path.basename(primaryPhoto)}`);

  const fileBuffer = fs.readFileSync(primaryPhoto);
  const base64Image = fileBuffer.toString('base64');
  const mimeType = primaryPhoto.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

  // Step 2: Create image-to-3D task
  log('Starting image-to-3D generation...');
  const taskRes = await fetch(`${config.apiBase}/openapi/v2/image-to-3d`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: `data:${mimeType};base64,${base64Image}`,
      topology: config.topology,
      target_polycount: config.targetPolycount,
      should_remesh: true,
    }),
  });

  if (!taskRes.ok) {
    throw new Error(`Meshy task creation failed (${taskRes.status}): ${await taskRes.text()}`);
  }

  const taskData = (await taskRes.json()) as { result: string };
  const taskId = taskData.result;
  log(`Task created: ${taskId}`);

  // Step 3: Poll for completion
  const deadline = Date.now() + config.timeoutMs;
  let modelUrl: string | null = null;

  while (Date.now() < deadline) {
    await sleep(config.pollIntervalMs);

    const statusRes = await fetch(`${config.apiBase}/openapi/v2/image-to-3d/${taskId}`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });

    if (!statusRes.ok) {
      warn(`Status check failed (${statusRes.status}), retrying...`);
      continue;
    }

    const statusData = (await statusRes.json()) as {
      status: string;
      progress: number;
      model_urls?: { glb?: string };
    };

    log(`  Status: ${statusData.status} (${statusData.progress}%)`);

    if (statusData.status === 'SUCCEEDED' && statusData.model_urls?.glb) {
      modelUrl = statusData.model_urls.glb;
      break;
    } else if (statusData.status === 'FAILED') {
      throw new Error('Meshy generation failed');
    }
  }

  if (!modelUrl) {
    throw new Error('Meshy generation timed out');
  }

  // Step 4: Download model
  log('Downloading generated model...');
  const modelRes = await fetch(modelUrl);
  if (!modelRes.ok) {
    throw new Error(`Model download failed (${modelRes.status})`);
  }

  const modelBuffer = Buffer.from(await modelRes.arrayBuffer());
  fs.writeFileSync(outputPath, modelBuffer);
  success(`Downloaded: ${path.basename(outputPath)} (${(modelBuffer.length / 1e6).toFixed(1)}MB)`);
}

// ---------------------------------------------------------------------------
// Service: Local (vendor-provided models)
// ---------------------------------------------------------------------------

function handleLocalModel(product: CatalogProduct, outputPath: string, inputDir: string): void {
  const slug = slugFromId(product.id);
  const localGlb = path.join(inputDir, `${slug}.glb`);

  if (fs.existsSync(localGlb)) {
    // Already in place — nothing to do
    success(`Local model found: ${slug}.glb`);
    return;
  }

  throw new Error(
    `No local GLB found at ${localGlb}. Place vendor model there or use an AI service.`,
  );
}

// ---------------------------------------------------------------------------
// Main Process
// ---------------------------------------------------------------------------

async function processProduct(
  product: CatalogProduct,
  config: GenerateConfig,
  service: string,
  dryRun: boolean,
): Promise<GenerationResult> {
  const slug = slugFromId(product.id);
  const outputPath = path.join(config.outputDir, `${slug}.glb`);
  const startMs = Date.now();

  // Check if output already exists
  if (fs.existsSync(outputPath)) {
    log(`GLB already exists for ${slug}, skipping (delete to regenerate)`);
    return {
      productId: product.id,
      slug,
      service,
      outputPath,
      photosUsed: [],
      skipped: true,
    };
  }

  // For 'local' service, just check input dir
  if (service === 'local') {
    try {
      if (!dryRun) handleLocalModel(product, outputPath, config.outputDir);
      return {
        productId: product.id,
        slug,
        service: 'local',
        outputPath: fs.existsSync(outputPath) ? outputPath : null,
        photosUsed: [],
        skipped: dryRun,
      };
    } catch (e) {
      return {
        productId: product.id,
        slug,
        service: 'local',
        outputPath: null,
        photosUsed: [],
        skipped: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // Find and validate photos
  const photos = findProductPhotos(config.photosDir, product);
  if (photos.length === 0) {
    return {
      productId: product.id,
      slug,
      service,
      outputPath: null,
      photosUsed: [],
      skipped: true,
      error: `No photos found in ${product.photoInputs.directory}`,
    };
  }

  const photoCheck = validatePhotos(photos, product);
  if (!photoCheck.valid) {
    warn(`${slug}: Missing required photos: ${photoCheck.missing.join(', ')}`);
    warn(`${slug}: Found: ${photoCheck.found.join(', ')}`);
  }

  if (dryRun) {
    log(`[dry-run] Would generate ${slug} using ${service} (${photos.length} photos)`);
    return {
      productId: product.id,
      slug,
      service,
      outputPath: null,
      photosUsed: photos,
      skipped: true,
    };
  }

  // Generate via selected service
  try {
    if (service === 'tripo') {
      await generateWithTripo(photos, product, outputPath, {
        ...config.tripo,
        apiKey: process.env.TRIPO_API_KEY ?? config.tripo.apiKey,
      });
    } else if (service === 'meshy') {
      await generateWithMeshy(photos, product, outputPath, {
        ...config.meshy,
        apiKey: process.env.MESHY_API_KEY ?? config.meshy.apiKey,
      });
    }

    return {
      productId: product.id,
      slug,
      service,
      outputPath,
      photosUsed: photos,
      skipped: false,
      durationMs: Date.now() - startMs,
    };
  } catch (e) {
    return {
      productId: product.id,
      slug,
      service,
      outputPath: null,
      photosUsed: photos,
      skipped: false,
      error: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - startMs,
    };
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const productFilter = args.includes('--product') ? args[args.indexOf('--product') + 1] : null;
  const serviceOverride = args.includes('--service') ? args[args.indexOf('--service') + 1] : null;

  // Load config
  const configPath = path.join(__dirname, 'generate.config.json');
  if (!fs.existsSync(configPath)) {
    error(`Config not found: ${configPath}`);
    error('Copy generate.config.json.example and fill in API keys.');
    process.exit(1);
  }
  const config: GenerateConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // Resolve relative paths
  config.photosDir = path.resolve(__dirname, config.photosDir);
  config.outputDir = path.resolve(__dirname, config.outputDir);
  config.catalogPath = path.resolve(__dirname, config.catalogPath);

  const service = serviceOverride ?? config.service;

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

  // Ensure output dir
  fs.mkdirSync(config.outputDir, { recursive: true });

  log(
    `Photo-to-3D generation — ${products.length} product(s) via ${service}${dryRun ? ' [DRY RUN]' : ''}`,
  );
  log(`Photos: ${config.photosDir}`);
  log(`Output: ${config.outputDir}`);

  const results: GenerationResult[] = [];

  for (const product of products) {
    log(`--- ${product.id}: ${product.name} ---`);
    const result = await processProduct(product, config, service, dryRun);
    results.push(result);

    if (result.error) {
      error(`${result.slug}: ${result.error}`);
    } else if (result.skipped) {
      log(`${result.slug}: skipped`);
    } else {
      success(`${result.slug}: generated (${((result.durationMs ?? 0) / 1000).toFixed(0)}s)`);
    }
  }

  // Summary
  const generated = results.filter((r) => !r.skipped && !r.error);
  const failed = results.filter((r) => !r.skipped && r.error);
  const skipped = results.filter((r) => r.skipped);

  log('');
  log('=== Generation Summary ===');
  log(`Generated: ${generated.length}/${products.length}`);
  log(`Skipped: ${skipped.length}`);
  log(`Failed: ${failed.length}`);

  if (generated.length > 0) {
    log('');
    log('Next step: npx tsx scripts/pipeline/convert.ts');
  }

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  error(e.message ?? e);
  process.exit(1);
});
