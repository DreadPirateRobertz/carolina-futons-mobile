/**
 * Tests for wix/config.ts — env-based Wix API configuration.
 *
 * In test/dev mode, __DEV__ is true, so isWixConfigured checks for
 * WIX_API_KEY (non-public) + EXPO_PUBLIC_WIX_SITE_ID.
 */

export {}; // Force module scope for TypeScript

const originalEnv = { ...process.env };

beforeEach(() => {
  jest.resetModules();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('isWixConfigured (__DEV__ mode)', () => {
  it('returns true when API key and site ID are set', () => {
    process.env.WIX_API_KEY = 'test-key';
    process.env.EXPO_PUBLIC_WIX_SITE_ID = 'test-site';
    const { isWixConfigured } = require('../config');
    expect(isWixConfigured()).toBe(true);
  });

  it('returns false when API key is missing', () => {
    delete process.env.WIX_API_KEY;
    process.env.EXPO_PUBLIC_WIX_SITE_ID = 'test-site';
    const { isWixConfigured } = require('../config');
    expect(isWixConfigured()).toBe(false);
  });

  it('returns false when site ID is missing', () => {
    process.env.WIX_API_KEY = 'test-key';
    delete process.env.EXPO_PUBLIC_WIX_SITE_ID;
    const { isWixConfigured } = require('../config');
    expect(isWixConfigured()).toBe(false);
  });

  it('returns false when API key is empty string', () => {
    process.env.WIX_API_KEY = '';
    process.env.EXPO_PUBLIC_WIX_SITE_ID = 'test-site';
    const { isWixConfigured } = require('../config');
    expect(isWixConfigured()).toBe(false);
  });

  it('returns false when site ID is empty string', () => {
    process.env.WIX_API_KEY = 'test-key';
    process.env.EXPO_PUBLIC_WIX_SITE_ID = '';
    const { isWixConfigured } = require('../config');
    expect(isWixConfigured()).toBe(false);
  });

  it('returns false when both are missing', () => {
    delete process.env.WIX_API_KEY;
    delete process.env.EXPO_PUBLIC_WIX_SITE_ID;
    const { isWixConfigured } = require('../config');
    expect(isWixConfigured()).toBe(false);
  });

  it('ignores EXPO_PUBLIC_WIX_API_KEY (old insecure var)', () => {
    process.env.EXPO_PUBLIC_WIX_API_KEY = 'exposed-key';
    delete process.env.WIX_API_KEY;
    process.env.EXPO_PUBLIC_WIX_SITE_ID = 'test-site';
    const { isWixConfigured } = require('../config');
    expect(isWixConfigured()).toBe(false);
  });
});

describe('getWixConfig', () => {
  it('returns config with non-public API key in dev', () => {
    process.env.WIX_API_KEY = 'my-key';
    process.env.EXPO_PUBLIC_WIX_SITE_ID = 'my-site';
    const { getWixConfig } = require('../config');
    const config = getWixConfig();
    expect(config.apiKey).toBe('my-key');
    expect(config.siteId).toBe('my-site');
  });

  it('defaults baseUrl to wixapis.com when no proxy or base URL set', () => {
    process.env.WIX_API_KEY = 'my-key';
    process.env.EXPO_PUBLIC_WIX_SITE_ID = 'my-site';
    delete process.env.EXPO_PUBLIC_WIX_PROXY_URL;
    delete process.env.EXPO_PUBLIC_WIX_BASE_URL;
    const { getWixConfig } = require('../config');
    expect(getWixConfig().baseUrl).toBe('https://www.wixapis.com');
  });

  it('uses proxy URL as baseUrl when proxy is configured', () => {
    process.env.WIX_API_KEY = 'my-key';
    process.env.EXPO_PUBLIC_WIX_SITE_ID = 'my-site';
    process.env.EXPO_PUBLIC_WIX_PROXY_URL = 'https://my-proxy.example.com';
    const { getWixConfig } = require('../config');
    const config = getWixConfig();
    expect(config.baseUrl).toBe('https://my-proxy.example.com');
    expect(config.proxyUrl).toBe('https://my-proxy.example.com');
  });

  it('returns empty apiKey and siteId when env vars are missing', () => {
    delete process.env.WIX_API_KEY;
    delete process.env.EXPO_PUBLIC_WIX_SITE_ID;
    const { getWixConfig } = require('../config');
    const config = getWixConfig();
    expect(config.apiKey).toBe('');
    expect(config.siteId).toBe('');
  });
});
