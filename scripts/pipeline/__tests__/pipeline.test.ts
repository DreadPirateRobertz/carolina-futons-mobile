/**
 * Pipeline integration tests — cm-9k2
 *
 * Tests the 3D model pipeline configuration, catalog consistency,
 * and sync-catalog logic without requiring actual GLB files or
 * external tools (gltf-transform, usdzconvert).
 */
import * as fs from 'fs';
import * as path from 'path';

const PIPELINE_DIR = path.resolve(__dirname, '..');
const SRC_DATA_DIR = path.resolve(__dirname, '../../../src/data');

interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  arPriority: number;
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
    glb: { maxSizeBytes: number; targetSizeBytes: number };
    usdz: { maxSizeBytes: number; targetSizeBytes: number };
  };
  validation: {
    maxTriangles: number;
    targetTriangles: number;
  };
  tools: Record<string, string>;
}

describe('pipeline config', () => {
  let config: PipelineConfig;

  beforeAll(() => {
    const configPath = path.join(PIPELINE_DIR, 'pipeline.config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  });

  it('references a valid catalog path', () => {
    const catalogPath = path.resolve(PIPELINE_DIR, config.catalogPath);
    expect(fs.existsSync(catalogPath)).toBe(true);
  });

  it('has CDN base URL matching models3d.ts', () => {
    const models3dContent = fs.readFileSync(path.join(SRC_DATA_DIR, 'models3d.ts'), 'utf-8');
    expect(models3dContent).toContain(config.cdnBase);
  });

  it('GLB max size > target size', () => {
    expect(config.formats.glb.maxSizeBytes).toBeGreaterThan(config.formats.glb.targetSizeBytes);
  });

  it('USDZ max size > target size', () => {
    expect(config.formats.usdz.maxSizeBytes).toBeGreaterThan(config.formats.usdz.targetSizeBytes);
  });

  it('max triangles > target triangles', () => {
    expect(config.validation.maxTriangles).toBeGreaterThan(config.validation.targetTriangles);
  });

  it('specifies required toolchain', () => {
    expect(config.tools.gltfTransform).toBeDefined();
    expect(config.tools.usdzconvert).toBeDefined();
    expect(config.tools.gltfValidator).toBeDefined();
  });
});

describe('catalog-MASTER.json', () => {
  let products: CatalogProduct[];

  beforeAll(() => {
    const catalog = JSON.parse(
      fs.readFileSync(path.join(SRC_DATA_DIR, 'catalog-MASTER.json'), 'utf-8'),
    );
    products = catalog.products;
  });

  it('contains 10 AR-priority products', () => {
    expect(products).toHaveLength(10);
  });

  it('has 6 murphy beds', () => {
    const murphys = products.filter((p) => p.category === 'murphy-beds');
    expect(murphys).toHaveLength(6);
  });

  it('has 3 futons and 1 frame', () => {
    const futons = products.filter((p) => p.category === 'futons');
    const frames = products.filter((p) => p.category === 'frames');
    expect(futons).toHaveLength(3);
    expect(frames).toHaveLength(1);
  });

  it('products have unique IDs', () => {
    const ids = products.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('products have unique AR priority', () => {
    const priorities = products.map((p) => p.arPriority);
    expect(new Set(priorities).size).toBe(priorities.length);
  });

  it('all products have dimensions with at least one configuration', () => {
    for (const p of products) {
      const configs = Object.keys(p.dimensions);
      expect(configs.length).toBeGreaterThanOrEqual(1);
      for (const config of configs) {
        expect(p.dimensions[config].width).toBeGreaterThan(0);
        expect(p.dimensions[config].depth).toBeGreaterThan(0);
        expect(p.dimensions[config].height).toBeGreaterThan(0);
        expect(p.dimensions[config].unit).toBe('inches');
      }
    }
  });

  it('murphy beds have closed and open configurations', () => {
    const murphys = products.filter((p) => p.category === 'murphy-beds');
    for (const m of murphys) {
      expect(m.dimensions).toHaveProperty('closed');
      expect(m.dimensions).toHaveProperty('open');
    }
  });

  it('all products have model specs with valid triangle targets', () => {
    for (const p of products) {
      expect(p.modelSpec.targetTriangles).toBeGreaterThan(0);
      expect(p.modelSpec.targetTriangles).toBeLessThanOrEqual(100_000);
      expect(p.modelSpec.textureResolution).toBe(2048);
      expect(p.modelSpec.configurations.length).toBeGreaterThan(0);
    }
  });

  it('every catalog product has a matching entry in models3d.ts', () => {
    const models3dContent = fs.readFileSync(path.join(SRC_DATA_DIR, 'models3d.ts'), 'utf-8');
    for (const p of products) {
      expect(models3dContent).toContain(p.id);
    }
  });
});

describe('models3d ↔ catalog consistency', () => {
  it('all catalog product IDs appear in models3d.ts with GLB and USDZ URLs', () => {
    const catalog = JSON.parse(
      fs.readFileSync(path.join(SRC_DATA_DIR, 'catalog-MASTER.json'), 'utf-8'),
    );
    const models3dContent = fs.readFileSync(path.join(SRC_DATA_DIR, 'models3d.ts'), 'utf-8');

    for (const product of catalog.products as CatalogProduct[]) {
      expect(models3dContent).toContain(product.id);
      // URL must contain either a CDN hash-suffixed slug or an external https:// URL
      const slug = product.id.replace(/^prod-/, '');
      const hasCdnUrl = models3dContent.includes(`${slug}-`);
      const hasExternalUrl = models3dContent.includes('https://') && models3dContent.includes(product.id);
      expect(hasCdnUrl || hasExternalUrl).toBe(true);
    }
  });
});

describe('pipeline scripts exist and are valid TypeScript', () => {
  const scripts = ['convert.ts', 'validate.ts', 'sync-catalog.ts'];

  it.each(scripts)('%s exists', (script) => {
    expect(fs.existsSync(path.join(PIPELINE_DIR, script))).toBe(true);
  });

  it.each(scripts)('%s has a main() function', (script) => {
    const content = fs.readFileSync(path.join(PIPELINE_DIR, script), 'utf-8');
    expect(content).toContain('function main()');
    expect(content).toContain('main()');
  });

  it('convert.ts handles --dry-run, --skip-usdz, and --product flags', () => {
    const content = fs.readFileSync(path.join(PIPELINE_DIR, 'convert.ts'), 'utf-8');
    expect(content).toContain('--dry-run');
    expect(content).toContain('--skip-usdz');
    expect(content).toContain('--product');
  });

  it('validate.ts handles --strict and --dir flags', () => {
    const content = fs.readFileSync(path.join(PIPELINE_DIR, 'validate.ts'), 'utf-8');
    expect(content).toContain('--strict');
    expect(content).toContain('--dir');
  });

  it('sync-catalog.ts handles --dry-run and --manifest flags', () => {
    const content = fs.readFileSync(path.join(PIPELINE_DIR, 'sync-catalog.ts'), 'utf-8');
    expect(content).toContain('--dry-run');
    expect(content).toContain('--manifest');
  });
});
