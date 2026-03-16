/**
 * Tests verifying that production code uses crashReporting instead of
 * bare console.log/warn/error calls.
 *
 * These tests cover the 4 unguarded console statements that would fire
 * in production builds (not wrapped in __DEV__).
 */

import * as crashReporting from '../crashReporting';

// Spy on crashReporting methods
jest.spyOn(crashReporting, 'captureException').mockImplementation(() => {});
jest.spyOn(crashReporting, 'captureMessage').mockImplementation(() => {});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('console cleanup — production console calls replaced with crashReporting', () => {
  describe('prefetch.ts', () => {
    it('uses crashReporting.captureMessage on cache priming failure, not console.warn', async () => {
      // Reset module to get fresh state
      jest.resetModules();

      // Mock AsyncStorage to fail
      jest.mock('@react-native-async-storage/async-storage', () => ({
        getItem: jest.fn(),
        setItem: jest.fn(() => Promise.reject(new Error('storage full'))),
      }));
      jest.mock('@/data/products', () => ({ PRODUCTS: [{ id: 'p1' }] }));
      jest.mock('@/data/collections', () => ({ COLLECTIONS: [{ id: 'c1' }] }));

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const cr = require('../crashReporting');
      const captureExSpy = jest.spyOn(cr, 'captureException').mockImplementation(() => {});

      const { prefetchCriticalData } = require('../prefetch');
      await prefetchCriticalData();

      // Should NOT use console.warn in production
      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[prefetch]'),
        expect.anything(),
      );
      // Should use crashReporting instead
      expect(captureExSpy).toHaveBeenCalledWith(
        expect.any(Error),
        'warning',
        expect.objectContaining({ action: 'prefetch-cache-prime' }),
      );

      warnSpy.mockRestore();
    });
  });

  describe('wixSdkClient.ts', () => {
    it('uses crashReporting.captureMessage when CLIENT_ID is missing, not console.warn', () => {
      jest.resetModules();

      const originalEnv = process.env.EXPO_PUBLIC_WIX_CLIENT_ID;
      process.env.EXPO_PUBLIC_WIX_CLIENT_ID = '';

      jest.mock('@wix/sdk', () => ({
        createClient: jest.fn(() => ({ fake: 'client' })),
        OAuthStrategy: jest.fn((opts: { clientId: string }) => ({ strategy: 'oauth', ...opts })),
      }));
      jest.mock('@wix/members', () => ({
        members: { fake: 'members-module' },
      }));

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const cr = require('../crashReporting');
      const captureMsgSpy = jest.spyOn(cr, 'captureMessage').mockImplementation(() => {});

      const { getWixSdkClient } = require('../wix/wixSdkClient');
      getWixSdkClient();

      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('EXPO_PUBLIC_WIX_CLIENT_ID'),
      );
      expect(captureMsgSpy).toHaveBeenCalledWith(
        expect.stringContaining('EXPO_PUBLIC_WIX_CLIENT_ID'),
        'warning',
      );

      process.env.EXPO_PUBLIC_WIX_CLIENT_ID = originalEnv;
      warnSpy.mockRestore();
    });
  });

  describe('purchases.ts', () => {
    it('uses crashReporting.captureMessage instead of console.warn for missing API key', () => {
      const fs = require('fs');
      const path = require('path');
      const source = fs.readFileSync(
        path.join(__dirname, '../purchases.ts'),
        'utf8',
      );

      // Should NOT have bare console.warn (outside __DEV__ guard)
      const lines = source.split('\n');
      const consoleWarnLines = lines.filter(
        (line: string, idx: number) => {
          if (!line.includes('console.warn')) return false;
          const prevLine = idx > 0 ? lines[idx - 1] : '';
          return !prevLine.includes('__DEV__') && !line.includes('__DEV__');
        },
      );
      expect(consoleWarnLines).toHaveLength(0);

      // Should import and use crashReporting
      expect(source).toMatch(/captureMessage/);
    });
  });

  describe('useProducts.ts', () => {
    it('uses crashReporting.captureException on Wix fetch error, not console.error', async () => {
      // This test verifies the source code directly — the hook's error path
      // should call captureException instead of console.error.
      // We verify by reading the source and checking for the pattern.
      const fs = require('fs');
      const path = require('path');
      const source = fs.readFileSync(
        path.join(__dirname, '../../hooks/useProducts.ts'),
        'utf8',
      );

      // Should NOT have bare console.error (outside __DEV__ guard)
      const lines = source.split('\n');
      const consoleErrorLines = lines.filter(
        (line: string, idx: number) => {
          if (!line.includes('console.error')) return false;
          // Check if previous line has __DEV__ guard
          const prevLine = idx > 0 ? lines[idx - 1] : '';
          return !prevLine.includes('__DEV__') && !line.includes('__DEV__');
        },
      );
      expect(consoleErrorLines).toHaveLength(0);

      // Should import and use crashReporting
      expect(source).toMatch(/captureException/);
    });
  });
});
