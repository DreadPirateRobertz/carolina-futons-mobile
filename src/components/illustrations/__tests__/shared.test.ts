import {
  buildCBezierMountainPath,
  buildBirds,
  buildPineTrees,
  buildFlora,
  MOUNTAIN_LAYER_CONFIGS,
  GRADIENT_PRESETS_MULTI,
} from '../shared';

describe('shared illustration utilities', () => {
  describe('buildCBezierMountainPath', () => {
    it('returns a valid SVG path starting with M and ending with Z', () => {
      const path = buildCBezierMountainPath(200, 0.4, 42);
      expect(path).toMatch(/^M0,200/);
      expect(path).toMatch(/Z$/);
    });

    it('uses C-curve bezier segments', () => {
      const path = buildCBezierMountainPath(200, 0.5, 1);
      expect(path).toContain('C');
    });

    it('produces different paths for different seeds', () => {
      const path1 = buildCBezierMountainPath(200, 0.5, 1);
      const path2 = buildCBezierMountainPath(200, 0.5, 2);
      expect(path1).not.toBe(path2);
    });
  });

  describe('MOUNTAIN_LAYER_CONFIGS', () => {
    it('has 7 layers', () => {
      expect(MOUNTAIN_LAYER_CONFIGS).toHaveLength(7);
    });

    it('each layer has name, baseHeight, and seed', () => {
      for (const layer of MOUNTAIN_LAYER_CONFIGS) {
        expect(layer).toHaveProperty('name');
        expect(layer).toHaveProperty('baseHeight');
        expect(layer).toHaveProperty('seed');
      }
    });

    it('layers progress from distant (high) to front (low)', () => {
      const heights = MOUNTAIN_LAYER_CONFIGS.map((l) => l.baseHeight);
      for (let i = 1; i < heights.length; i++) {
        expect(heights[i]).toBeGreaterThanOrEqual(heights[i - 1]);
      }
    });
  });

  describe('GRADIENT_PRESETS_MULTI', () => {
    it('has sunrise and sunset presets', () => {
      expect(GRADIENT_PRESETS_MULTI).toHaveProperty('sunrise');
      expect(GRADIENT_PRESETS_MULTI).toHaveProperty('sunset');
    });

    it('each preset has 5+ stops', () => {
      expect(GRADIENT_PRESETS_MULTI.sunrise.length).toBeGreaterThanOrEqual(5);
      expect(GRADIENT_PRESETS_MULTI.sunset.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('detail element builders', () => {
    it('buildBirds returns array of bird configs', () => {
      const birds = buildBirds(1440, 200);
      expect(birds.length).toBeGreaterThanOrEqual(3);
      for (const bird of birds) {
        expect(bird).toHaveProperty('path');
        expect(bird).toHaveProperty('strokeWidth');
      }
    });

    it('buildPineTrees returns array of tree configs', () => {
      const trees = buildPineTrees(1440, 200);
      expect(trees.length).toBeGreaterThanOrEqual(2);
      for (const tree of trees) {
        expect(tree).toHaveProperty('trunk');
        expect(tree).toHaveProperty('canopyLayers');
      }
    });

    it('buildFlora returns array of flora configs', () => {
      const flora = buildFlora(1440, 200);
      expect(flora.length).toBeGreaterThanOrEqual(3);
      for (const item of flora) {
        expect(item).toHaveProperty('stem');
        expect(item).toHaveProperty('bloom');
      }
    });
  });
});
