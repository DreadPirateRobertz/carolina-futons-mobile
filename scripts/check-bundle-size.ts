#!/usr/bin/env npx tsx
/**
 * check-bundle-size — hq-792
 *
 * Checks the size of a Metro JS bundle against a configurable budget.
 * Exits 0 when under budget, exits 1 when over — CI fails on overage.
 *
 * Usage:
 *   npx tsx scripts/check-bundle-size.ts <bundle-path> [--limit=<KB>]
 *
 * Default limit: 500 KB
 *
 * CI usage (in .github/workflows/ci.yml):
 *   1. Build bundle:  npx react-native bundle --entry-file index.js \
 *                       --bundle-output /tmp/cf-bundle.js \
 *                       --platform android --dev false
 *   2. Check size:    npx tsx scripts/check-bundle-size.ts /tmp/cf-bundle.js
 */

import * as fs from 'fs';

/** Default JS bundle size budget: 500 KB */
export const BUNDLE_SIZE_LIMIT_BYTES = 500 * 1024;

export interface BundleSizeResult {
  passed: boolean;
  actualBytes: number;
  limitBytes: number;
  budgetRemaining: number; // negative when over budget
  formattedSize: string;
  formattedLimit: string;
  message: string;
}

/**
 * Format a byte count as a human-readable string.
 * Uses B, KB, or MB depending on magnitude.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Check the size of a bundle file against a byte limit.
 *
 * @param bundlePath - Absolute or relative path to the bundle file
 * @param limitBytes - Budget limit in bytes (default: BUNDLE_SIZE_LIMIT_BYTES)
 * @throws if the bundle file does not exist
 */
export function checkBundleSize(
  bundlePath: string,
  limitBytes: number = BUNDLE_SIZE_LIMIT_BYTES,
): BundleSizeResult {
  if (!fs.existsSync(bundlePath)) {
    throw new Error(`Bundle file not found: ${bundlePath}`);
  }

  const { size: actualBytes } = fs.statSync(bundlePath);
  const budgetRemaining = limitBytes - actualBytes;
  const passed = actualBytes <= limitBytes;
  const formattedSize = formatBytes(actualBytes);
  const formattedLimit = formatBytes(limitBytes);

  const status = passed ? '✅ PASSED' : '❌ FAILED';
  const budgetLine = passed
    ? `${formatBytes(budgetRemaining)} remaining`
    : `${formatBytes(-budgetRemaining)} over budget`;

  const message = `${status} — Bundle: ${formattedSize} / Limit: ${formattedLimit} (${budgetLine})`;

  return {
    passed,
    actualBytes,
    limitBytes,
    budgetRemaining,
    formattedSize,
    formattedLimit,
    message,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  const args = process.argv.slice(2);
  const bundlePath = args.find((a) => !a.startsWith('--'));
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limitKB = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
  const limitBytes = limitKB !== undefined ? limitKB * 1024 : BUNDLE_SIZE_LIMIT_BYTES;

  if (!bundlePath) {
    console.error('Usage: check-bundle-size.ts <bundle-path> [--limit=<KB>]');
    process.exit(1);
  }

  let result: BundleSizeResult;
  try {
    result = checkBundleSize(bundlePath, limitBytes);
  } catch (err: unknown) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  console.log(result.message);

  // Emit GitHub Actions step summary if available
  if (process.env.GITHUB_STEP_SUMMARY) {
    const icon = result.passed ? '✅' : '❌';
    const summary = [
      `## ${icon} JS Bundle Size Check`,
      `| | |`,
      `|---|---|`,
      `| **Bundle size** | ${result.formattedSize} |`,
      `| **Budget** | ${result.formattedLimit} |`,
      `| **Status** | ${result.passed ? 'Under budget' : `Over budget by ${formatBytes(-result.budgetRemaining)}`} |`,
    ].join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  }

  process.exit(result.passed ? 0 : 1);
}
