/**
 * USDZ conversion pipeline tests — cm-88d.7
 *
 * Tests the GLB→USDZ conversion script, tool detection,
 * and catalog USDZ URL validation.
 */
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

const PIPELINE_DIR = path.resolve(__dirname, '..');
const SRC_DATA_DIR = path.resolve(__dirname, '../../../src/data');

describe('USDZ conversion script', () => {
  const scriptPath = path.join(PIPELINE_DIR, 'convert-usdz.sh');

  it('convert-usdz.sh exists and is executable', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    const stat = fs.statSync(scriptPath);
    // Check executable bit (owner)
    expect(stat.mode & 0o100).toBeTruthy();
  });

  it('has a usage/help output', () => {
    let output = '';
    try {
      output = execFileSync('bash', [scriptPath, '--help'], {
        encoding: 'utf-8',
        timeout: 10000,
      });
    } catch (e: any) {
      output = (e.stdout ?? '') + (e.stderr ?? '');
    }
    expect(output).toMatch(/usage|Usage|USAGE/i);
  });

  it('detects available conversion tools', () => {
    let output = '';
    try {
      output = execFileSync('bash', [scriptPath, '--check-tools'], {
        encoding: 'utf-8',
        timeout: 10000,
      });
    } catch (e: any) {
      output = (e.stdout ?? '') + (e.stderr ?? '');
    }
    // Should report which tools are available/missing
    expect(output).toMatch(/usdzconvert|reality-converter|blender|python/i);
  });

  it('supports --dry-run flag', () => {
    let output = '';
    try {
      output = execFileSync('bash', [scriptPath, '--dry-run', '--input', '/nonexistent.glb'], {
        encoding: 'utf-8',
        timeout: 10000,
      });
    } catch (e: any) {
      output = (e.stdout ?? '') + (e.stderr ?? '');
    }
    expect(output).toMatch(/dry.run/i);
  });
});

describe('pipeline config USDZ settings', () => {
  let config: any;

  beforeAll(() => {
    config = JSON.parse(
      fs.readFileSync(path.join(PIPELINE_DIR, 'pipeline.config.json'), 'utf-8'),
    );
  });

  it('has USDZ format configuration', () => {
    expect(config.formats.usdz).toBeDefined();
    expect(config.formats.usdz.maxSizeBytes).toBeGreaterThan(0);
    expect(config.formats.usdz.targetSizeBytes).toBeGreaterThan(0);
  });

  it('USDZ max > target size', () => {
    expect(config.formats.usdz.maxSizeBytes).toBeGreaterThan(
      config.formats.usdz.targetSizeBytes,
    );
  });

  it('specifies usdzconvert tool', () => {
    expect(config.tools.usdzconvert).toBeDefined();
  });
});

describe('models3d USDZ URLs', () => {
  let models3dContent: string;

  beforeAll(() => {
    models3dContent = fs.readFileSync(
      path.join(SRC_DATA_DIR, 'models3d.ts'),
      'utf-8',
    );
  });

  it('all entries have USDZ URLs ending in .usdz', () => {
    // Extract usdzUrl values
    const usdzUrls = models3dContent.match(/usdzUrl:\s*['"`]([^'"`]+)['"`]/g) ?? [];
    // Also match template literal ones
    const templateUrls = models3dContent.match(/usdzUrl:\s*`([^`]+)`/g) ?? [];
    const allUrls = [...usdzUrls, ...templateUrls];

    expect(allUrls.length).toBeGreaterThan(0);
    for (const url of allUrls) {
      expect(url).toMatch(/\.usdz/);
    }
  });

  it('asheville-full USDZ URL is a real model (not Apple teapot placeholder)', () => {
    // After cm-88d.7 lands, the asheville-full entry should no longer point
    // to Apple's teapot sample
    expect(models3dContent).not.toContain('teapot.usdz');
  });
});
