/**
 * Tests for wix/config.ts — env-based Wix API configuration.
 */

export {}; // Force module scope for TypeScript

// Cache original env values
const originalEnv = { ...process.env };

beforeEach(() => {
  jest.resetModules();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('isWixConfigured', () => {
  it('returns true when both API key and site ID are set', () => {
    process.env.EXPO_PUBLIC_WIX_API_KEY = 'test-key';
    process.env.EXPO_PUBLIC_WIX_SITE_ID = 'test-site';
    const { isWixConfigured } = require('../config');
    expect(isWixConfigured()).toBe(true);
  });

  it('returns false when API key is missing', () => {
    delete process.env.EXPO_PUBLIC_WIX_API_KEY;
    process.env.EXPO_PUBLIC_WIX_SITE_ID = 'test-site';
    const { isWixConfigured } = require('../config');
    expect(isWixConfigured()).toBe(false);
  });

  it('returns false when site ID is missing', () => {
    process.env.EXPO_PUBLIC_WIX_API_KEY = 'test-key';
    delete process.env.EXPO_PUBLIC_WIX_SITE_ID;
    const { isWixConfigured } = require('../config');
    expect(isWixConfigured()).toBe(false);
  });

  it('returns false when API key is empty string', () => {
    process.env.EXPO_PUBLIC_WIX_API_KEY = '';
    process.env.EXPO_PUBLIC_WIX_SITE_ID = 'test-site';
    const { isWixConfigured } = require('../config');
    expect(isWixConfigured()).toBe(false);
  });

  it('returns false when site ID is empty string', () => {
    process.env.EXPO_PUBLIC_WIX_API_KEY = 'test-key';
    process.env.EXPO_PUBLIC_WIX_SITE_ID = '';
    const { isWixConfigured } = require('../config');
    expect(isWixConfigured()).toBe(false);
  });

  it('returns false when both are missing', () => {
    delete process.env.EXPO_PUBLIC_WIX_API_KEY;
    delete process.env.EXPO_PUBLIC_WIX_SITE_ID;
    const { isWixConfigured } = require('../config');
    expect(isWixConfigured()).toBe(false);
  });
});

describe('getWixConfig', () => {
  it('returns config with env values', () => {
    process.env.EXPO_PUBLIC_WIX_API_KEY = 'my-key';
    process.env.EXPO_PUBLIC_WIX_SITE_ID = 'my-site';
    process.env.EXPO_PUBLIC_WIX_BASE_URL = 'https://custom.api.com';
    const { getWixConfig } = require('../config');
    expect(getWixConfig()).toEqual({
      apiKey: 'my-key',
      siteId: 'my-site',
      baseUrl: 'https://custom.api.com',
    });
  });

  it('defaults baseUrl to wixapis.com when not set', () => {
    process.env.EXPO_PUBLIC_WIX_API_KEY = 'my-key';
    process.env.EXPO_PUBLIC_WIX_SITE_ID = 'my-site';
    delete process.env.EXPO_PUBLIC_WIX_BASE_URL;
    const { getWixConfig } = require('../config');
    expect(getWixConfig().baseUrl).toBe('https://www.wixapis.com');
  });

  it('returns empty strings when env vars are missing', () => {
    delete process.env.EXPO_PUBLIC_WIX_API_KEY;
    delete process.env.EXPO_PUBLIC_WIX_SITE_ID;
    const { getWixConfig } = require('../config');
    const config = getWixConfig();
    expect(config.apiKey).toBe('');
    expect(config.siteId).toBe('');
  });
});
