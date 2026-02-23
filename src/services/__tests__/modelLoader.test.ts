import { Platform } from 'react-native';

import {
  getModelUrl,
  getModelExtension,
  getCacheFilePath,
  getManifestPath,
  calculateCacheSize,
  MODEL_CACHE_BUDGET_BYTES,
  MODEL_CACHE_DIR,
  type ModelLoadStatus,
} from '../modelLoader';
import { MODELS_3D, type Model3DAsset } from '@/data/models3d';

// We test the pure/deterministic functions here.
// Functions that depend on expo-file-system (readManifest, loadModelForProduct, etc.)
// require integration tests with a real filesystem or a more elaborate mock setup.

const sampleAsset: Model3DAsset = MODELS_3D[0]; // Asheville

describe('modelLoader', () => {
  describe('getModelUrl', () => {
    it('returns USDZ URL on iOS', () => {
      const original = Platform.OS;
      (Platform as any).OS = 'ios';
      expect(getModelUrl(sampleAsset)).toBe(sampleAsset.usdzUrl);
      (Platform as any).OS = original;
    });

    it('returns GLB URL on Android', () => {
      const original = Platform.OS;
      (Platform as any).OS = 'android';
      expect(getModelUrl(sampleAsset)).toBe(sampleAsset.glbUrl);
      (Platform as any).OS = original;
    });
  });

  describe('getModelExtension', () => {
    it('returns usdz on iOS', () => {
      const original = Platform.OS;
      (Platform as any).OS = 'ios';
      expect(getModelExtension()).toBe('usdz');
      (Platform as any).OS = original;
    });

    it('returns glb on Android', () => {
      const original = Platform.OS;
      (Platform as any).OS = 'android';
      expect(getModelExtension()).toBe('glb');
      (Platform as any).OS = original;
    });
  });

  describe('getCacheFilePath', () => {
    it('builds path with product ID, hash, and extension', () => {
      const original = Platform.OS;
      (Platform as any).OS = 'ios';
      const path = getCacheFilePath('prod-asheville-full', 'abc123');
      expect(path).toBe(`${MODEL_CACHE_DIR}prod-asheville-full-abc123.usdz`);

      (Platform as any).OS = 'android';
      const pathAndroid = getCacheFilePath('prod-asheville-full', 'abc123');
      expect(pathAndroid).toBe(`${MODEL_CACHE_DIR}prod-asheville-full-abc123.glb`);

      (Platform as any).OS = original;
    });
  });

  describe('getManifestPath', () => {
    it('points to manifest.json inside cache dir', () => {
      expect(getManifestPath()).toBe(`${MODEL_CACHE_DIR}manifest.json`);
    });
  });

  describe('calculateCacheSize', () => {
    it('returns 0 for empty manifest', () => {
      expect(calculateCacheSize({ entries: [] })).toBe(0);
    });

    it('sums all entry sizes', () => {
      const manifest = {
        entries: [
          {
            productId: 'a',
            fileName: 'a.glb',
            contentHash: 'x',
            sizeBytes: 5_000_000,
            lastAccessedMs: Date.now(),
          },
          {
            productId: 'b',
            fileName: 'b.glb',
            contentHash: 'y',
            sizeBytes: 3_000_000,
            lastAccessedMs: Date.now(),
          },
        ],
      };
      expect(calculateCacheSize(manifest)).toBe(8_000_000);
    });
  });

  describe('MODEL_CACHE_BUDGET_BYTES', () => {
    it('is 200 MB', () => {
      expect(MODEL_CACHE_BUDGET_BYTES).toBe(200 * 1024 * 1024);
    });
  });

  describe('MODEL_CACHE_DIR', () => {
    it('ends with models3d/', () => {
      expect(MODEL_CACHE_DIR).toMatch(/models3d\/$/);
    });
  });

  describe('ModelLoadStatus type coverage', () => {
    it('idle status', () => {
      const status: ModelLoadStatus = { state: 'idle' };
      expect(status.state).toBe('idle');
    });

    it('checking-cache status', () => {
      const status: ModelLoadStatus = { state: 'checking-cache' };
      expect(status.state).toBe('checking-cache');
    });

    it('downloading status with progress', () => {
      const status: ModelLoadStatus = { state: 'downloading', progress: 0.5 };
      expect(status.state).toBe('downloading');
      expect(status.progress).toBe(0.5);
    });

    it('ready status with local URI', () => {
      const status: ModelLoadStatus = { state: 'ready', localUri: '/path/to/model.glb' };
      expect(status.state).toBe('ready');
      expect(status.localUri).toBe('/path/to/model.glb');
    });

    it('error status with message', () => {
      const status: ModelLoadStatus = { state: 'error', message: 'Network error' };
      expect(status.state).toBe('error');
      expect(status.message).toBe('Network error');
    });
  });
});
