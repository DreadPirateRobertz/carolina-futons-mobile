/**
 * Tests for the photo-to-3D generation pipeline helper functions.
 *
 * Tests the pure/deterministic parts of generate.ts:
 * - Photo discovery and validation
 * - Product slug generation
 * - Config loading patterns
 *
 * AI service integration is tested via dry-run mode (no API calls).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// We test the logic by extracting the patterns used in generate.ts.
// Since generate.ts is a CLI script (not a module), we test the patterns directly.

describe('generate pipeline', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('slugFromId', () => {
    function slugFromId(productId: string): string {
      return productId.replace(/^prod-/, '');
    }

    it('strips prod- prefix', () => {
      expect(slugFromId('prod-asheville-full')).toBe('asheville-full');
      expect(slugFromId('prod-murphy-queen-vertical')).toBe('murphy-queen-vertical');
    });

    it('returns unchanged if no prod- prefix', () => {
      expect(slugFromId('asheville-full')).toBe('asheville-full');
    });
  });

  describe('photo discovery', () => {
    const extensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic']);

    function findPhotos(dir: string): string[] {
      if (!fs.existsSync(dir)) return [];
      return fs
        .readdirSync(dir)
        .filter((f) => extensions.has(path.extname(f).toLowerCase()))
        .map((f) => path.join(dir, f))
        .sort();
    }

    it('finds jpg and png files', () => {
      const photoDir = path.join(tmpDir, 'product');
      fs.mkdirSync(photoDir);
      fs.writeFileSync(path.join(photoDir, 'front-closed.jpg'), '');
      fs.writeFileSync(path.join(photoDir, 'side-left.png'), '');
      fs.writeFileSync(path.join(photoDir, 'readme.txt'), '');

      const photos = findPhotos(photoDir);
      expect(photos).toHaveLength(2);
      expect(photos[0]).toContain('front-closed.jpg');
      expect(photos[1]).toContain('side-left.png');
    });

    it('returns empty for nonexistent directory', () => {
      expect(findPhotos(path.join(tmpDir, 'nope'))).toEqual([]);
    });

    it('returns empty for directory with no images', () => {
      const photoDir = path.join(tmpDir, 'empty');
      fs.mkdirSync(photoDir);
      fs.writeFileSync(path.join(photoDir, 'notes.txt'), '');
      expect(findPhotos(photoDir)).toEqual([]);
    });

    it('handles all supported extensions', () => {
      const photoDir = path.join(tmpDir, 'all-formats');
      fs.mkdirSync(photoDir);
      fs.writeFileSync(path.join(photoDir, 'a.jpg'), '');
      fs.writeFileSync(path.join(photoDir, 'b.jpeg'), '');
      fs.writeFileSync(path.join(photoDir, 'c.png'), '');
      fs.writeFileSync(path.join(photoDir, 'd.webp'), '');
      fs.writeFileSync(path.join(photoDir, 'e.heic'), '');

      expect(findPhotos(photoDir)).toHaveLength(5);
    });
  });

  describe('photo validation', () => {
    function validatePhotos(
      photos: string[],
      required: string[],
    ): { valid: boolean; missing: string[]; found: string[] } {
      const photoNames = photos.map((p) => path.basename(p, path.extname(p)).toLowerCase());
      const found = required.filter((r) => photoNames.some((n) => n.includes(r)));
      const missing = required.filter((r) => !photoNames.some((n) => n.includes(r)));
      return {
        valid: found.length >= Math.ceil(required.length * 0.5),
        missing,
        found,
      };
    }

    it('passes when all required photos present', () => {
      const photos = [
        '/photos/front-closed.jpg',
        '/photos/front-open.jpg',
        '/photos/side-left.jpg',
        '/photos/side-right.jpg',
      ];
      const required = ['front-closed', 'front-open', 'side-left', 'side-right'];

      const result = validatePhotos(photos, required);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.found).toEqual(required);
    });

    it('passes when >= 50% required photos present', () => {
      const photos = ['/photos/front-closed.jpg', '/photos/front-open.jpg'];
      const required = ['front-closed', 'front-open', 'side-left', 'side-right'];

      const result = validatePhotos(photos, required);
      expect(result.valid).toBe(true);
      expect(result.found).toEqual(['front-closed', 'front-open']);
      expect(result.missing).toEqual(['side-left', 'side-right']);
    });

    it('fails when < 50% required photos present', () => {
      const photos = ['/photos/front-closed.jpg'];
      const required = ['front-closed', 'front-open', 'side-left', 'side-right'];

      const result = validatePhotos(photos, required);
      expect(result.valid).toBe(false);
    });

    it('handles empty photo list', () => {
      const result = validatePhotos([], ['front-closed']);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['front-closed']);
    });
  });

  describe('config structure', () => {
    it('example config has required fields', () => {
      const examplePath = path.resolve(__dirname, '..', 'generate.config.json.example');
      expect(fs.existsSync(examplePath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(examplePath, 'utf-8'));
      expect(config.service).toBeDefined();
      expect(config.photosDir).toBeDefined();
      expect(config.outputDir).toBeDefined();
      expect(config.catalogPath).toBeDefined();
      expect(config.tripo).toBeDefined();
      expect(config.tripo.apiBase).toBeDefined();
      expect(config.meshy).toBeDefined();
      expect(config.meshy.apiBase).toBeDefined();
    });

    it('pipeline config has required fields', () => {
      const configPath = path.resolve(__dirname, '..', 'pipeline.config.json');
      expect(fs.existsSync(configPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config.inputDir).toBeDefined();
      expect(config.outputDir).toBeDefined();
      expect(config.cdnBase).toBeDefined();
      expect(config.formats.glb).toBeDefined();
      expect(config.formats.usdz).toBeDefined();
      expect(config.validation).toBeDefined();
      expect(config.tools).toBeDefined();
    });
  });

  describe('catalog-MASTER.json', () => {
    it('has products with required fields for pipeline', () => {
      const catalogPath = path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'src',
        'data',
        'catalog-MASTER.json',
      );
      const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

      expect(catalog.products).toBeDefined();
      expect(catalog.products.length).toBeGreaterThanOrEqual(10);

      for (const product of catalog.products) {
        expect(product.id).toBeDefined();
        expect(product.name).toBeDefined();
        expect(product.slug).toBeDefined();
        expect(product.dimensions).toBeDefined();
        expect(product.photoInputs).toBeDefined();
        expect(product.photoInputs.required).toBeDefined();
        expect(product.photoInputs.directory).toBeDefined();
        expect(product.modelSpec).toBeDefined();
        expect(product.modelSpec.targetTriangles).toBeGreaterThan(0);
        expect(product.modelSpec.targetTriangles).toBeLessThanOrEqual(100000);
      }
    });

    it('products are ordered by arPriority', () => {
      const catalogPath = path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'src',
        'data',
        'catalog-MASTER.json',
      );
      const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
      const priorities = catalog.products.map((p: any) => p.arPriority);

      for (let i = 1; i < priorities.length; i++) {
        expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i - 1]);
      }
    });
  });

  describe('models3d.ts coverage', () => {
    it('all catalog products have corresponding models3d entries', () => {
      const catalogPath = path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'src',
        'data',
        'catalog-MASTER.json',
      );
      const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

      // Read models3d.ts to extract product IDs
      const models3dPath = path.resolve(__dirname, '..', '..', '..', 'src', 'data', 'models3d.ts');
      const content = fs.readFileSync(models3dPath, 'utf-8');

      for (const product of catalog.products) {
        expect(content).toContain(product.id);
      }
    });
  });
});
