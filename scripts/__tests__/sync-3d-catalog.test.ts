/**
 * Tests for the 3D model catalog sync script.
 *
 * Validates:
 * - Canonical catalog-3d.json schema and data integrity
 * - Generated TypeScript module (mobile) matches catalog
 * - Generated JavaScript module (web) matches catalog
 * - CDN URL construction for models without explicit URLs
 * - Edge cases: empty catalog, missing fields, malformed data
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';

const SHARED_DIR = path.resolve(__dirname, '../../shared');
const CATALOG_PATH = path.join(SHARED_DIR, 'catalog-3d.json');

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
  cdnBase: string;
  models: CatalogModel[];
}

// --- catalog-3d.json schema validation ---

describe('shared/catalog-3d.json schema', () => {
  let catalog: Catalog;

  beforeAll(() => {
    catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  });

  it('has required top-level fields', () => {
    expect(catalog.version).toBeDefined();
    expect(catalog.cdnBase).toBeDefined();
    expect(catalog.models).toBeDefined();
    expect(Array.isArray(catalog.models)).toBe(true);
  });

  it('has a valid CDN base URL', () => {
    expect(catalog.cdnBase).toMatch(/^https:\/\//);
    expect(catalog.cdnBase).not.toMatch(/\/$/); // no trailing slash
  });

  it('contains 11 models', () => {
    expect(catalog.models).toHaveLength(11);
  });

  it('has unique product IDs', () => {
    const ids = catalog.models.map((m) => m.productId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each([
    'productId', 'category', 'dimensions', 'fileSizeBytes',
    'contentHash', 'hasFabricVariants',
  ])('all models have required field: %s', (field) => {
    for (const model of catalog.models) {
      expect(model).toHaveProperty(field);
    }
  });

  it('all models have dimensions in inches', () => {
    for (const model of catalog.models) {
      expect(model.dimensions.unit).toBe('inches');
      expect(model.dimensions.width).toBeGreaterThan(0);
      expect(model.dimensions.depth).toBeGreaterThan(0);
      expect(model.dimensions.height).toBeGreaterThan(0);
    }
  });

  it('all models have valid file sizes (1-20 MB)', () => {
    for (const model of catalog.models) {
      expect(model.fileSizeBytes).toBeGreaterThan(1_000_000);
      expect(model.fileSizeBytes).toBeLessThan(20_000_000);
    }
  });

  it('all models have non-empty content hashes', () => {
    for (const model of catalog.models) {
      expect(model.contentHash.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('models with explicit glbUrl use absolute https URLs', () => {
    for (const model of catalog.models) {
      if (model.glbUrl !== null) {
        expect(model.glbUrl).toMatch(/^https:\/\//);
        expect(model.glbUrl).toMatch(/\.glb$/);
      }
    }
  });

  it('has expected category distribution', () => {
    const categories = catalog.models.reduce((acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    expect(categories['murphy-beds']).toBe(6);
    expect(categories['futons']).toBe(4);
    expect(categories['frames']).toBe(1);
  });
});

// --- sync script output validation ---

describe('sync-3d-catalog output', () => {
  let tmpDir: string;
  const SYNC_SCRIPT = path.resolve(__dirname, '../sync-3d-catalog.ts');

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-sync-'));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('sync script exists', () => {
    expect(fs.existsSync(SYNC_SCRIPT)).toBe(true);
  });

  it('generates TypeScript mobile module', () => {
    const tsOut = path.join(tmpDir, 'models3d.ts');
    const jsOut = path.join(tmpDir, 'models3d.web.js');

    execFileSync('npx', [
      'tsx', SYNC_SCRIPT,
      '--catalog', CATALOG_PATH,
      '--ts-out', tsOut,
      '--js-out', jsOut,
    ], { cwd: path.resolve(__dirname, '../..'), timeout: 30000 });

    expect(fs.existsSync(tsOut)).toBe(true);
    const tsContent = fs.readFileSync(tsOut, 'utf-8');

    // Must export MODELS_3D array
    expect(tsContent).toContain('export const MODELS_3D');
    // Must export helper functions
    expect(tsContent).toContain('export function getModel3DForProduct');
    expect(tsContent).toContain('export function hasARModel');
    // Must contain all 11 product IDs
    const catalog: Catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
    for (const model of catalog.models) {
      expect(tsContent).toContain(model.productId);
    }
    // Must have CDN base constant
    expect(tsContent).toContain('MODEL_CDN_BASE');
    // Must contain Model3DAsset interface
    expect(tsContent).toContain('export interface Model3DAsset');
  });

  it('generates JavaScript web module', () => {
    const jsOut = path.join(tmpDir, 'models3d.web.js');
    expect(fs.existsSync(jsOut)).toBe(true);
    const jsContent = fs.readFileSync(jsOut, 'utf-8');

    // Must export models array
    expect(jsContent).toContain('MODELS_3D');
    // Must export CDN base
    expect(jsContent).toContain('MODEL_CDN_BASE');
    // Must contain all product IDs
    const catalog: Catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
    for (const model of catalog.models) {
      expect(jsContent).toContain(model.productId);
    }
    // Must be valid JS (no TypeScript syntax)
    expect(jsContent).not.toContain('interface ');
    expect(jsContent).not.toContain(': Model3DAsset');
    expect(jsContent).not.toMatch(/:\s*string[;\s]/);
  });

  it('TypeScript output has dimensions in meters via inToM', () => {
    const tsOut = path.join(tmpDir, 'models3d.ts');
    const tsContent = fs.readFileSync(tsOut, 'utf-8');
    expect(tsContent).toContain('inToM');
  });

  it('constructs CDN URLs for models without explicit URLs', () => {
    const tsOut = path.join(tmpDir, 'models3d.ts');
    const tsContent = fs.readFileSync(tsOut, 'utf-8');

    // Murphy queen vertical has no explicit URL, should use CDN convention
    expect(tsContent).toContain('murphy-queen-vertical-q1r2s3.glb');
    expect(tsContent).toContain('murphy-queen-vertical-q1r2s3.usdz');
  });

  it('preserves explicit URLs from catalog', () => {
    const tsOut = path.join(tmpDir, 'models3d.ts');
    const tsContent = fs.readFileSync(tsOut, 'utf-8');

    // Asheville full has an explicit KhronosGroup GLB URL
    expect(tsContent).toContain('KhronosGroup');
    expect(tsContent).toContain('SheenChair.glb');
  });

  it('JS and TS outputs contain identical product IDs', () => {
    const tsOut = path.join(tmpDir, 'models3d.ts');
    const jsOut = path.join(tmpDir, 'models3d.web.js');
    const tsContent = fs.readFileSync(tsOut, 'utf-8');
    const jsContent = fs.readFileSync(jsOut, 'utf-8');

    const catalog: Catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
    for (const model of catalog.models) {
      expect(tsContent).toContain(model.productId);
      expect(jsContent).toContain(model.productId);
    }
  });
});

// --- catalog consistency checks ---

describe('catalog-3d.json ↔ catalog-MASTER.json consistency', () => {
  it('all catalog-MASTER products appear in catalog-3d.json', () => {
    const master = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../src/data/catalog-MASTER.json'), 'utf-8'),
    );
    const catalog: Catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
    const catalogIds = new Set(catalog.models.map((m) => m.productId));

    for (const product of master.products) {
      expect(catalogIds.has(product.id)).toBe(true);
    }
  });

  it('dimensions match between catalog-3d.json and catalog-MASTER.json', () => {
    const master = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../src/data/catalog-MASTER.json'), 'utf-8'),
    );
    const catalog: Catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
    const catalogMap = new Map(catalog.models.map((m) => [m.productId, m]));

    for (const product of master.products) {
      const model = catalogMap.get(product.id);
      if (!model) continue;

      // Get the first dimension config from master (closed for murphy, sofa for futons)
      const firstConfig = Object.keys(product.dimensions)[0];
      const masterDims = product.dimensions[firstConfig];

      expect(model.dimensions.width).toBe(masterDims.width);
      expect(model.dimensions.depth).toBe(masterDims.depth);
      expect(model.dimensions.height).toBe(masterDims.height);
    }
  });
});

// --- --check mode for CI ---

describe('sync --check mode (CI validation)', () => {
  it('exits 0 when generated files match', () => {
    const SYNC_SCRIPT = path.resolve(__dirname, '../sync-3d-catalog.ts');

    expect(() => {
      execFileSync('npx', ['tsx', SYNC_SCRIPT, '--check'], {
        cwd: path.resolve(__dirname, '../..'),
        timeout: 30000,
      });
    }).not.toThrow();
  });
});
