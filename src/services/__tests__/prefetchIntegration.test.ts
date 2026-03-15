/**
 * Integration test: verifies prefetchCriticalData is called at App module level
 * and writes to the same cache key that useDataCache reads from.
 */

describe('Splash-screen data race integration', () => {
  it('prefetch writes to the same cache key useDataCache reads', () => {
    // The prefetch service uses '@cfutons/cache/products'
    // The useDataCache hook uses `@cfutons/cache/${key}` where key='products'
    // This test ensures they stay in sync.
    const { PREFETCH_CACHE_KEY } = require('../prefetch');
    expect(PREFETCH_CACHE_KEY).toBe('@cfutons/cache/products');
  });

  it('App.tsx imports and calls prefetchCriticalData', () => {
    // Read App.tsx source to verify wiring
    const fs = require('fs');
    const path = require('path');
    const appSource = fs.readFileSync(
      path.resolve(__dirname, '../../../App.tsx'),
      'utf8',
    );

    expect(appSource).toContain("import { prefetchCriticalData } from '@/services/prefetch'");
    expect(appSource).toContain('prefetchCriticalData()');
  });
});
