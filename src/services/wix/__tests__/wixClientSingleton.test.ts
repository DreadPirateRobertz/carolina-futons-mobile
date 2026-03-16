import { getWixClientSingleton, resetWixClientSingleton } from '../wixClientSingleton';
import { WixClient } from '../wixClient';

// Control isWixConfigured and getWixConfig from tests
let mockConfigured = true;
jest.mock('../config', () => ({
  isWixConfigured: () => mockConfigured,
  getWixConfig: () => ({
    apiKey: 'test-api-key',
    siteId: 'test-site-id',
    baseUrl: 'https://www.wixapis.com',
  }),
}));

beforeEach(() => {
  mockConfigured = true;
  resetWixClientSingleton();
});

describe('getWixClientSingleton', () => {
  it('returns a WixClient when configured', () => {
    const client = getWixClientSingleton();
    expect(client).toBeInstanceOf(WixClient);
  });

  it('returns null when not configured', () => {
    mockConfigured = false;
    const client = getWixClientSingleton();
    expect(client).toBeNull();
  });

  it('returns the same instance on repeated calls', () => {
    const a = getWixClientSingleton();
    const b = getWixClientSingleton();
    expect(a).toBe(b);
  });

  it('creates a new instance after reset', () => {
    const a = getWixClientSingleton();
    resetWixClientSingleton();
    const b = getWixClientSingleton();
    expect(a).not.toBe(b);
    expect(b).toBeInstanceOf(WixClient);
  });
});
