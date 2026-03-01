/**
 * Refactor verification tests: screens must import types/constants from hooks,
 * not directly from @/data/ modules. This ensures the hook abstraction layer
 * is the single entry point for data, making Wix API migration seamless.
 *
 * Tests verify by reading source files and checking import statements.
 */
import * as fs from 'fs';
import * as path from 'path';

const SCREENS_DIR = path.resolve(__dirname, '..');

function getScreenImports(filename: string): string[] {
  const content = fs.readFileSync(path.join(SCREENS_DIR, filename), 'utf-8');
  return content
    .split('\n')
    .filter((line) => line.match(/^\s*import\s/) && line.includes('@/data/'));
}

describe('Screen refactor: no direct @/data/ imports', () => {
  const screens = [
    'WishlistScreen.tsx',
    'ShopScreen.tsx',
    'OrderHistoryScreen.tsx',
    'OrderDetailScreen.tsx',
    'CategoryScreen.tsx',
    'ARScreen.tsx',
    'ProductDetailScreen.tsx',
    'StoreLocatorScreen.tsx',
    'StoreDetailScreen.tsx',
  ];

  for (const screen of screens) {
    it(`${screen} does not import from @/data/`, () => {
      const dataImports = getScreenImports(screen);
      expect(dataImports).toEqual([]);
    });
  }
});

describe('Hook re-exports', () => {
  it('useOrders re-exports ORDER_STATUS_CONFIG', () => {
    const exports = require('@/hooks/useOrders');
    expect(exports.ORDER_STATUS_CONFIG).toBeDefined();
    expect(exports.ORDER_STATUS_CONFIG.processing).toBeDefined();
    expect(exports.ORDER_STATUS_CONFIG.shipped).toBeDefined();
    expect(exports.ORDER_STATUS_CONFIG.delivered).toBeDefined();
    expect(exports.ORDER_STATUS_CONFIG.cancelled).toBeDefined();
  });

  it('useStores re-exports store utilities', () => {
    const exports = require('@/hooks/useStores');
    expect(exports.calculateDistance).toBeDefined();
    expect(exports.isStoreOpen).toBeDefined();
    expect(exports.formatPhone).toBeDefined();
    expect(exports.APPOINTMENT_TYPES).toBeDefined();
  });

  it('useFutonModels re-exports inchesToFeetDisplay', () => {
    const exports = require('@/hooks/useFutonModels');
    expect(exports.inchesToFeetDisplay).toBeDefined();
    expect(exports.inchesToFeetDisplay(72)).toBe("6'");
  });
});
