/**
 * Tests for wixSdkClient.ts — SDK client singleton with env validation.
 */

export {}; // Force module scope for TypeScript

jest.mock('@wix/sdk', () => ({
  createClient: jest.fn(() => ({ fake: 'client' })),
  OAuthStrategy: jest.fn((opts: { clientId: string }) => ({ strategy: 'oauth', ...opts })),
}));

jest.mock('@wix/members', () => ({
  members: { fake: 'members-module' },
}));

const originalEnv = { ...process.env };

beforeEach(() => {
  jest.resetModules();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...originalEnv };
  jest.restoreAllMocks();
});

describe('getWixSdkClient', () => {
  it('creates a client when CLIENT_ID is set', () => {
    process.env.EXPO_PUBLIC_WIX_CLIENT_ID = 'valid-client-id';
    const { getWixSdkClient } = require('../wixSdkClient');
    const client = getWixSdkClient();
    expect(client).toBeDefined();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('returns same singleton on repeated calls', () => {
    process.env.EXPO_PUBLIC_WIX_CLIENT_ID = 'valid-client-id';
    const { getWixSdkClient } = require('../wixSdkClient');
    const a = getWixSdkClient();
    const b = getWixSdkClient();
    expect(a).toBe(b);
  });

  it('warns when CLIENT_ID is empty', () => {
    process.env.EXPO_PUBLIC_WIX_CLIENT_ID = '';
    const { getWixSdkClient } = require('../wixSdkClient');
    getWixSdkClient();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('EXPO_PUBLIC_WIX_CLIENT_ID'));
  });

  it('warns when CLIENT_ID is not set', () => {
    delete process.env.EXPO_PUBLIC_WIX_CLIENT_ID;
    const { getWixSdkClient } = require('../wixSdkClient');
    getWixSdkClient();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('EXPO_PUBLIC_WIX_CLIENT_ID'));
  });

  it('resetWixSdkClient clears the singleton', () => {
    process.env.EXPO_PUBLIC_WIX_CLIENT_ID = 'valid-client-id';
    const { getWixSdkClient, resetWixSdkClient } = require('../wixSdkClient');
    const a = getWixSdkClient();
    resetWixSdkClient();
    const b = getWixSdkClient();
    expect(a).not.toBe(b);
  });
});
