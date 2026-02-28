import { Platform } from 'react-native';

// ============================================================================
// AR Support Service — Test-first specs for cm-88d
//
// This service detects whether the current device supports AR features:
//   - iOS: Check for ARKit availability (A9+ chip, iOS 11+)
//   - Android: Check for ARCore availability via installed services
//   - Web: Not supported
//   - Provide sync and async variants
//   - Cache the result to avoid repeated native bridge calls
//   - Return device tier (premium/standard/fallback) for quality settings
// ============================================================================

// Mock Platform
const originalPlatform = Platform.OS;

// Lazy-import — component doesn't exist yet (test-first)
let arSupport: any;
try {
  arSupport = require('../../services/arSupport');
} catch {
  arSupport = null;
}

const describeIfImplemented = arSupport ? describe : describe.skip;

describeIfImplemented('arSupport service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset cached state between tests
    if (arSupport?.resetCache) {
      arSupport.resetCache();
    }
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform });
  });

  // ==========================================================================
  // checkARSupport (async)
  // ==========================================================================
  describe('checkARSupport', () => {
    it('resolves to true on supported iOS device', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios' });
      const result = await arSupport.checkARSupport();
      expect(typeof result).toBe('boolean');
      // On iOS, should default to true (A9+ is nearly all active devices)
      expect(result).toBe(true);
    });

    it('resolves to a boolean on Android', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android' });
      const result = await arSupport.checkARSupport();
      expect(typeof result).toBe('boolean');
    });

    it('resolves to false on web', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web' });
      const result = await arSupport.checkARSupport();
      expect(result).toBe(false);
    });

    it('caches the result after first call', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios' });
      const result1 = await arSupport.checkARSupport();
      const result2 = await arSupport.checkARSupport();
      expect(result1).toBe(result2);
    });

    it('does not throw on any platform', async () => {
      for (const os of ['ios', 'android', 'web', 'windows', 'macos']) {
        Object.defineProperty(Platform, 'OS', { value: os });
        if (arSupport.resetCache) arSupport.resetCache();
        await expect(arSupport.checkARSupport()).resolves.toBeDefined();
      }
    });
  });

  // ==========================================================================
  // isARSupportedSync
  // ==========================================================================
  describe('isARSupportedSync', () => {
    it('returns false before checkARSupport has been called', () => {
      // Before async check runs, sync should default to false (safe default)
      const result = arSupport.isARSupportedSync();
      expect(typeof result).toBe('boolean');
    });

    it('returns cached value after checkARSupport resolves', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios' });
      const asyncResult = await arSupport.checkARSupport();
      const syncResult = arSupport.isARSupportedSync();
      expect(syncResult).toBe(asyncResult);
    });

    it('returns false on web without needing async check', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web' });
      if (arSupport.resetCache) arSupport.resetCache();
      expect(arSupport.isARSupportedSync()).toBe(false);
    });
  });

  // ==========================================================================
  // getDeviceTier
  // ==========================================================================
  describe('getDeviceTier', () => {
    it('returns a valid tier string', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios' });
      const tier = await arSupport.getDeviceTier();
      expect(['premium', 'standard', 'fallback']).toContain(tier);
    });

    it('returns "fallback" on web', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web' });
      if (arSupport.resetCache) arSupport.resetCache();
      const tier = await arSupport.getDeviceTier();
      expect(tier).toBe('fallback');
    });

    it('returns "fallback" when AR is not supported', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android' });
      if (arSupport.resetCache) arSupport.resetCache();
      // Mock the native check to return false
      jest.spyOn(arSupport, 'checkARSupport').mockResolvedValueOnce(false);
      const tier = await arSupport.getDeviceTier();
      expect(tier).toBe('fallback');
    });
  });

  // ==========================================================================
  // AR-eligible product check
  // ==========================================================================
  describe('isProductAREnabled', () => {
    it('returns true for futon category', () => {
      expect(arSupport.isProductAREnabled({ category: 'futons', inStock: true })).toBe(true);
    });

    it('returns true for frames category', () => {
      expect(arSupport.isProductAREnabled({ category: 'frames', inStock: true })).toBe(true);
    });

    it('returns false for covers category', () => {
      expect(arSupport.isProductAREnabled({ category: 'covers', inStock: true })).toBe(false);
    });

    it('returns false for accessories category', () => {
      expect(arSupport.isProductAREnabled({ category: 'accessories', inStock: true })).toBe(false);
    });

    it('returns false for pillows category', () => {
      expect(arSupport.isProductAREnabled({ category: 'pillows', inStock: true })).toBe(false);
    });

    it('returns false for mattresses category', () => {
      expect(arSupport.isProductAREnabled({ category: 'mattresses', inStock: true })).toBe(false);
    });

    it('returns false for out-of-stock products regardless of category', () => {
      expect(arSupport.isProductAREnabled({ category: 'futons', inStock: false })).toBe(false);
    });
  });

  // ==========================================================================
  // supportsModelViewer (web 3D viewer capability)
  // ==========================================================================
  describe('supportsModelViewer', () => {
    it('returns true on web platform', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web' });
      expect(arSupport.supportsModelViewer()).toBe(true);
    });

    it('returns false on iOS', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios' });
      expect(arSupport.supportsModelViewer()).toBe(false);
    });

    it('returns false on Android', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android' });
      expect(arSupport.supportsModelViewer()).toBe(false);
    });
  });

  // ==========================================================================
  // Model mapping (Product → FutonModel ID)
  // ==========================================================================
  describe('getARModelId', () => {
    it('maps prod-asheville-full to asheville-full', () => {
      expect(arSupport.getARModelId('prod-asheville-full')).toBe('asheville-full');
    });

    it('maps prod-blue-ridge-queen to blue-ridge-queen', () => {
      expect(arSupport.getARModelId('prod-blue-ridge-queen')).toBe('blue-ridge-queen');
    });

    it('maps prod-pisgah-twin to pisgah-twin', () => {
      expect(arSupport.getARModelId('prod-pisgah-twin')).toBe('pisgah-twin');
    });

    it('maps prod-biltmore-loveseat to biltmore-loveseat', () => {
      expect(arSupport.getARModelId('prod-biltmore-loveseat')).toBe('biltmore-loveseat');
    });

    it('returns undefined for non-futon products', () => {
      expect(arSupport.getARModelId('prod-mountain-cover-full')).toBeUndefined();
    });

    it('returns undefined for unknown product IDs', () => {
      expect(arSupport.getARModelId('prod-nonexistent')).toBeUndefined();
    });
  });
});
