#!/usr/bin/env npx tsx
/**
 * 3D Model Validator — cm-9k2
 *
 * Validates 3D model files against AR quality targets.
 * Can be run standalone or as part of the conversion pipeline.
 *
 * Usage:
 *   npx tsx scripts/pipeline/validate.ts <file.glb|file.usdz> [--strict]
 *   npx tsx scripts/pipeline/validate.ts --dir <output-dir>
 */

import { execSync } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface QualitySpec {
  maxTriangles: number;
  targetTriangles: number;
  maxGlbSizeBytes: number;
  maxUsdzSizeBytes: number;
  targetGlbSizeBytes: number;
  targetUsdzSizeBytes: number;
}

const DEFAULT_SPEC: QualitySpec = {
  maxTriangles: 100_000,
  targetTriangles: 65_000,
  maxGlbSizeBytes: 20 * 1024 * 1024,
  maxUsdzSizeBytes: 25 * 1024 * 1024,
  targetGlbSizeBytes: 8 * 1024 * 1024,
  targetUsdzSizeBytes: 15 * 1024 * 1024,
};

interface Report {
  file: string;
  format: 'glb' | 'usdz' | 'unknown';
  sizeBytes: number;
  contentHash: string;
  triangleCount: number | null;
  errors: string[];
  warnings: string[];
  passed: boolean;
}

function hash(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').slice(0, 6);
}

function validateFile(filePath: string, spec: QualitySpec, strict: boolean): Report {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const format = ext === 'glb' || ext === 'gltf' ? 'glb' : ext === 'usdz' ? 'usdz' : 'unknown';
  const size = fs.statSync(filePath).size;
  const errors: string[] = [];
  const warnings: string[] = [];
  let triangleCount: number | null = null;

  if (format === 'unknown') {
    errors.push(`Unsupported format: .${ext}`);
    return {
      file: filePath,
      format,
      sizeBytes: size,
      contentHash: hash(filePath),
      triangleCount,
      errors,
      warnings,
      passed: false,
    };
  }

  // Size validation
  const maxSize = format === 'glb' ? spec.maxGlbSizeBytes : spec.maxUsdzSizeBytes;
  const targetSize = format === 'glb' ? spec.targetGlbSizeBytes : spec.targetUsdzSizeBytes;

  if (size > maxSize) {
    errors.push(
      `File size ${(size / 1e6).toFixed(1)}MB exceeds hard limit ${(maxSize / 1e6).toFixed(0)}MB`,
    );
  } else if (size > targetSize) {
    const msg = `File size ${(size / 1e6).toFixed(1)}MB exceeds target ${(targetSize / 1e6).toFixed(0)}MB`;
    if (strict) {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  // GLB-specific: run gltf-validator
  if (format === 'glb') {
    try {
      const output = execSync(`npx gltf-validator "${filePath}" --format json 2>/dev/null`, {
        encoding: 'utf-8',
        timeout: 30000,
      });
      const report = JSON.parse(output);

      if (report.issues?.numErrors > 0) {
        errors.push(`glTF spec errors: ${report.issues.numErrors}`);
        for (const issue of report.issues.messages?.filter((m: any) => m.severity === 0) ?? []) {
          errors.push(`  ${issue.message}`);
        }
      }

      if (report.info?.totalTriangleCount !== undefined) {
        triangleCount = report.info.totalTriangleCount;
        if (triangleCount! > spec.maxTriangles) {
          errors.push(`Triangle count ${triangleCount} exceeds max ${spec.maxTriangles}`);
        } else if (triangleCount! > spec.targetTriangles) {
          const msg = `Triangle count ${triangleCount} exceeds target ${spec.targetTriangles}`;
          if (strict) {
            errors.push(msg);
          } else {
            warnings.push(msg);
          }
        }
      }
    } catch {
      warnings.push('gltf-validator not available');
    }
  }

  return {
    file: filePath,
    format,
    sizeBytes: size,
    contentHash: hash(filePath),
    triangleCount,
    errors,
    warnings,
    passed: errors.length === 0,
  };
}

function printReport(report: Report): void {
  const status = report.passed ? '✓ PASS' : '✗ FAIL';
  console.log(`\n${status}  ${path.basename(report.file)}`);
  console.log(`  Format: ${report.format.toUpperCase()}`);
  console.log(`  Size: ${(report.sizeBytes / 1e6).toFixed(2)} MB`);
  console.log(`  Hash: ${report.contentHash}`);
  if (report.triangleCount !== null) {
    console.log(`  Triangles: ${report.triangleCount.toLocaleString()}`);
  }
  for (const e of report.errors) console.log(`  ✗ ${e}`);
  for (const w of report.warnings) console.log(`  ⚠ ${w}`);
}

function main(): void {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const dirMode = args.includes('--dir');

  let files: string[];

  if (dirMode) {
    const dir = args[args.indexOf('--dir') + 1];
    if (!dir || !fs.existsSync(dir)) {
      console.error('Usage: validate.ts --dir <output-dir>');
      process.exit(1);
    }
    files = [];
    for (const sub of ['glb', 'usdz']) {
      const subDir = path.join(dir, sub);
      if (fs.existsSync(subDir)) {
        files.push(...fs.readdirSync(subDir).map((f) => path.join(subDir, f)));
      }
    }
  } else {
    files = args.filter((a) => !a.startsWith('--') && fs.existsSync(a));
  }

  if (files.length === 0) {
    console.error('No files to validate.');
    console.error('Usage: validate.ts <file.glb> [--strict]');
    console.error('       validate.ts --dir <output-dir>');
    process.exit(1);
  }

  console.log(`Validating ${files.length} file(s)${strict ? ' (strict mode)' : ''}...`);

  const reports = files.map((f) => validateFile(f, DEFAULT_SPEC, strict));
  reports.forEach(printReport);

  const passed = reports.filter((r) => r.passed).length;
  const failed = reports.filter((r) => !r.passed).length;

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);

  if (failed > 0) process.exit(1);
}

main();
