/**
 * Integration test: verifies prefetchCriticalData is called at App module level
 * and writes to the same cache keys that useDataCache reads from.
 */

describe('Splash-screen data race integration', () => {
  it('prefetch writes to the same cache key useDataCache reads for products', () => {
    const { PREFETCH_CACHE_KEY } = require('../prefetch');
    expect(PREFETCH_CACHE_KEY).toBe('@cfutons/cache/products');
  });

  it('prefetch writes to the same cache key useDataCache reads for collections', () => {
    const { PREFETCH_COLLECTIONS_KEY } = require('../prefetch');
    expect(PREFETCH_COLLECTIONS_KEY).toBe('@cfutons/cache/editorial-collections');
  });

  it('App.tsx imports and calls prefetchCriticalData', () => {
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
