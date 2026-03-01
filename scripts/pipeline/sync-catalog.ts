#!/usr/bin/env npx tsx
/**
 * Catalog Sync — cm-9k2
 *
 * Reads the pipeline output manifest and generates updated TypeScript
 * source for src/data/models3d.ts with real content hashes and file sizes.
 *
 * Run after the pipeline processes new models to keep the app catalog in sync.
 *
 * Usage:
 *   npx tsx scripts/pipeline/sync-catalog.ts [--manifest <path>] [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';

interface ManifestModel {
  productId: string;
  glbUrl: string;
  usdzUrl: string | null;
  glbSizeBytes: number;
  usdzSizeBytes: number | null;
  contentHash: string;
}

interface Manifest {
  generatedAt: string;
  models: ManifestModel[];
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const manifestIdx = args.indexOf('--manifest');
  const manifestPath =
    manifestIdx !== -1 ? args[manifestIdx + 1] : path.resolve(__dirname, 'output', 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found: ${manifestPath}`);
    console.error('Run the pipeline first: npx tsx scripts/pipeline/convert.ts');
    process.exit(1);
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const models3dPath = path.resolve(__dirname, '../../src/data/models3d.ts');
  const currentContent = fs.readFileSync(models3dPath, 'utf-8');

  console.log(`Manifest: ${manifest.models.length} models (generated ${manifest.generatedAt})`);

  let updatedCount = 0;
  let newContent = currentContent;

  for (const model of manifest.models) {
    const slug = model.productId.replace(/^prod-/, '');

    // Update content hash
    const hashPattern = new RegExp(
      `(productId:\\s*'${model.productId}'[\\s\\S]*?contentHash:\\s*')([^']+)(')`,
    );
    if (hashPattern.test(newContent)) {
      const match = newContent.match(hashPattern);
      if (match && match[2] !== model.contentHash) {
        newContent = newContent.replace(hashPattern, `$1${model.contentHash}$3`);
        console.log(`  Updated hash: ${model.productId} ${match[2]} → ${model.contentHash}`);
        updatedCount++;
      }
    }

    // Update file size
    const sizePattern = new RegExp(
      `(productId:\\s*'${model.productId}'[\\s\\S]*?fileSizeBytes:\\s*)([\\d_]+)`,
    );
    if (sizePattern.test(newContent)) {
      const match = newContent.match(sizePattern);
      const currentSize = parseInt((match?.[2] ?? '0').replace(/_/g, ''), 10);
      if (currentSize !== model.glbSizeBytes) {
        const formatted = model.glbSizeBytes.toLocaleString('en-US').replace(/,/g, '_');
        newContent = newContent.replace(sizePattern, `$1${formatted}`);
        console.log(`  Updated size: ${model.productId} ${currentSize} → ${model.glbSizeBytes}`);
        updatedCount++;
      }
    }

    // Update GLB URL with new hash
    const bt = '`';
    const glbUrlPattern = new RegExp(
      "(productId:\\s*'" +
        model.productId +
        "'[\\s\\S]*?glbUrl:\\s*" +
        bt +
        ')([^' +
        bt +
        ']+)(' +
        bt +
        ')',
    );
    const expectedGlbUrl = '${MODEL_CDN_BASE}/glb/' + slug + '-' + model.contentHash + '.glb';
    if (glbUrlPattern.test(newContent)) {
      const match = newContent.match(glbUrlPattern);
      if (match && match[2] !== expectedGlbUrl) {
        newContent = newContent.replace(glbUrlPattern, '$1' + expectedGlbUrl + '$3');
        updatedCount++;
      }
    }

    // Update USDZ URL with new hash
    const usdzUrlPattern = new RegExp(
      "(productId:\\s*'" +
        model.productId +
        "'[\\s\\S]*?usdzUrl:\\s*" +
        bt +
        ')([^' +
        bt +
        ']+)(' +
        bt +
        ')',
    );
    const expectedUsdzUrl = '${MODEL_CDN_BASE}/usdz/' + slug + '-' + model.contentHash + '.usdz';
    if (usdzUrlPattern.test(newContent)) {
      const match = newContent.match(usdzUrlPattern);
      if (match && match[2] !== expectedUsdzUrl) {
        newContent = newContent.replace(usdzUrlPattern, '$1' + expectedUsdzUrl + '$3');
        updatedCount++;
      }
    }
  }

  if (updatedCount === 0) {
    console.log('No changes needed — catalog already in sync.');
    return;
  }

  if (dryRun) {
    console.log(`\n[dry-run] Would update ${updatedCount} field(s) in models3d.ts`);
    return;
  }

  fs.writeFileSync(models3dPath, newContent);
  console.log(`\nUpdated ${updatedCount} field(s) in models3d.ts`);
}

main();
