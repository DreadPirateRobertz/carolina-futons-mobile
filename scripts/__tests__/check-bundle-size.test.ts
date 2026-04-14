/**
 * Tests for scripts/check-bundle-size.ts — hq-792
 *
 * TDD — written BEFORE implementation.
 *
 * The bundle-size check script:
 *  - Reads the file size of a Metro-produced JS bundle
 *  - Compares against a configurable byte limit (default 500 KB)
 *  - Exits 0 when under budget, exits 1 when over budget
 *  - Prints a human-readable size + pass/fail line to stdout
 *  - Handles missing bundle file gracefully (exits 1 with clear message)
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  checkBundleSize,
  formatBytes,
  BundleSizeResult,
  BUNDLE_SIZE_LIMIT_BYTES,
} from '../check-bundle-size';

// ---------------------------------------------------------------------------
// formatBytes utility
// ---------------------------------------------------------------------------

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes < 1 KB', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats exact kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.00 KB');
  });

  it('formats fractional kilobytes', () => {
    expect(formatBytes(1536)).toBe('1.50 KB');
  });

  it('formats exact megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
  });

  it('formats 500 KB correctly', () => {
    expect(formatBytes(500 * 1024)).toBe('500.00 KB');
  });

  it('formats values > 1 MB', () => {
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.50 MB');
  });
});

// ---------------------------------------------------------------------------
// BUNDLE_SIZE_LIMIT_BYTES constant
// ---------------------------------------------------------------------------

describe('BUNDLE_SIZE_LIMIT_BYTES', () => {
  it('is exactly 500 KB', () => {
    expect(BUNDLE_SIZE_LIMIT_BYTES).toBe(500 * 1024);
  });
});

// ---------------------------------------------------------------------------
// checkBundleSize — logic tests (no real bundle file needed)
// ---------------------------------------------------------------------------

describe('checkBundleSize', () => {
  let tmpDir: string;
  let bundlePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-bundle-test-'));
    bundlePath = path.join(tmpDir, 'bundle.js');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeBundleOfSize(bytes: number): void {
    fs.writeFileSync(bundlePath, Buffer.alloc(bytes, 'x'));
  }

  // ── Pass cases ────────────────────────────────────────────────────────────

  it('passes when bundle is exactly at the limit', () => {
    writeBundleOfSize(500 * 1024);
    const result = checkBundleSize(bundlePath, 500 * 1024);
    expect(result.passed).toBe(true);
  });

  it('passes when bundle is under the limit', () => {
    writeBundleOfSize(400 * 1024);
    const result = checkBundleSize(bundlePath, 500 * 1024);
    expect(result.passed).toBe(true);
  });

  it('passes when bundle is 1 byte under the limit', () => {
    writeBundleOfSize(500 * 1024 - 1);
    const result = checkBundleSize(bundlePath, 500 * 1024);
    expect(result.passed).toBe(true);
  });

  // ── Fail cases ────────────────────────────────────────────────────────────

  it('fails when bundle is 1 byte over the limit', () => {
    writeBundleOfSize(500 * 1024 + 1);
    const result = checkBundleSize(bundlePath, 500 * 1024);
    expect(result.passed).toBe(false);
  });

  it('fails when bundle is significantly over the limit', () => {
    writeBundleOfSize(750 * 1024);
    const result = checkBundleSize(bundlePath, 500 * 1024);
    expect(result.passed).toBe(false);
  });

  // ── Result fields ─────────────────────────────────────────────────────────

  it('returns the actual size in bytes', () => {
    writeBundleOfSize(300 * 1024);
    const result = checkBundleSize(bundlePath, 500 * 1024);
    expect(result.actualBytes).toBe(300 * 1024);
  });

  it('returns the limit in bytes', () => {
    writeBundleOfSize(300 * 1024);
    const result = checkBundleSize(bundlePath, 500 * 1024);
    expect(result.limitBytes).toBe(500 * 1024);
  });

  it('returns a human-readable size string', () => {
    writeBundleOfSize(400 * 1024);
    const result = checkBundleSize(bundlePath, 500 * 1024);
    expect(result.formattedSize).toBe('400.00 KB');
  });

  it('returns a human-readable limit string', () => {
    writeBundleOfSize(400 * 1024);
    const result = checkBundleSize(bundlePath, 500 * 1024);
    expect(result.formattedLimit).toBe('500.00 KB');
  });

  it('result message contains the size and limit', () => {
    writeBundleOfSize(400 * 1024);
    const result = checkBundleSize(bundlePath, 500 * 1024);
    expect(result.message).toMatch(/400\.00 KB/);
    expect(result.message).toMatch(/500\.00 KB/);
  });

  it('result message says PASSED when under budget', () => {
    writeBundleOfSize(400 * 1024);
    const result = checkBundleSize(bundlePath, 500 * 1024);
    expect(result.message).toMatch(/pass/i);
  });

  it('result message says FAILED when over budget', () => {
    writeBundleOfSize(600 * 1024);
    const result = checkBundleSize(bundlePath, 500 * 1024);
    expect(result.message).toMatch(/fail|over/i);
  });

  it('result includes remaining budget when passing', () => {
    writeBundleOfSize(400 * 1024);
    const result = checkBundleSize(bundlePath, 500 * 1024);
    expect(result.budgetRemaining).toBe(100 * 1024);
  });

  it('result includes overage bytes when failing', () => {
    writeBundleOfSize(600 * 1024);
    const result = checkBundleSize(bundlePath, 500 * 1024);
    expect(result.budgetRemaining).toBe(-(100 * 1024));
  });

  // ── Missing file ──────────────────────────────────────────────────────────

  it('throws when bundle file does not exist', () => {
    expect(() => checkBundleSize(path.join(tmpDir, 'nonexistent.js'), 500 * 1024)).toThrow(
      /not found|no such file|does not exist/i,
    );
  });

  // ── Custom limit ─────────────────────────────────────────────────────────

  it('respects a custom byte limit', () => {
    writeBundleOfSize(200 * 1024);
    const passWith250 = checkBundleSize(bundlePath, 250 * 1024);
    expect(passWith250.passed).toBe(true);

    const failWith100 = checkBundleSize(bundlePath, 100 * 1024);
    expect(failWith100.passed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CLI integration — runs the script as a subprocess
// ---------------------------------------------------------------------------

describe('check-bundle-size CLI', () => {
  const { execFileSync, spawnSync } = require('child_process');
  let tmpDir: string;
  let bundlePath: string;
  const scriptPath = path.resolve(__dirname, '../check-bundle-size.ts');

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-bundle-cli-'));
    bundlePath = path.join(tmpDir, 'bundle.js');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 0 when bundle is under 500 KB', () => {
    fs.writeFileSync(bundlePath, Buffer.alloc(400 * 1024, 'x'));
    const result = spawnSync('npx', ['tsx', scriptPath, bundlePath], { encoding: 'utf8' });
    expect(result.status).toBe(0);
  });

  it('exits 1 when bundle is over 500 KB', () => {
    fs.writeFileSync(bundlePath, Buffer.alloc(600 * 1024, 'x'));
    const result = spawnSync('npx', ['tsx', scriptPath, bundlePath], { encoding: 'utf8' });
    expect(result.status).toBe(1);
  });

  it('prints bundle size to stdout', () => {
    fs.writeFileSync(bundlePath, Buffer.alloc(400 * 1024, 'x'));
    const result = spawnSync('npx', ['tsx', scriptPath, bundlePath], { encoding: 'utf8' });
    expect(result.stdout).toMatch(/400\.00 KB/);
  });

  it('exits 1 with error message when bundle file is missing', () => {
    const result = spawnSync('npx', ['tsx', scriptPath, path.join(tmpDir, 'missing.js')], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toMatch(/not found|no such|missing/i);
  });

  it('accepts --limit flag to override threshold', () => {
    fs.writeFileSync(bundlePath, Buffer.alloc(200 * 1024, 'x'));
    // passes with default 500KB
    const pass = spawnSync('npx', ['tsx', scriptPath, bundlePath, '--limit=250'], {
      encoding: 'utf8',
    });
    expect(pass.status).toBe(0);

    // fails with 100KB limit
    const fail = spawnSync('npx', ['tsx', scriptPath, bundlePath, '--limit=100'], {
      encoding: 'utf8',
    });
    expect(fail.status).toBe(1);
  });
});
