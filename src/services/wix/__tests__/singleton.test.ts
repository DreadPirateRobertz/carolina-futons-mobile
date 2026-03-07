import { getWixClientInstance, resetWixClientInstance } from '../singleton';
import { WixClient } from '../wixClient';

// Mock config module
jest.mock('../config', () => ({
  isWixConfigured: jest.fn(),
  getWixConfig: jest.fn(() => ({
    apiKey: 'test-key',
    siteId: 'test-site',
    baseUrl: 'https://test.wixapis.com',
  })),
}));

const { isWixConfigured } = require('../config') as { isWixConfigured: jest.Mock };

describe('WixClient singleton', () => {
  beforeEach(() => {
    resetWixClientInstance();
    isWixConfigured.mockReset();
  });

  it('returns null when Wix is not configured', () => {
    isWixConfigured.mockReturnValue(false);
    expect(getWixClientInstance()).toBeNull();
  });

  it('returns a WixClient instance when configured', () => {
    isWixConfigured.mockReturnValue(true);
    const client = getWixClientInstance();
    expect(client).toBeInstanceOf(WixClient);
  });

  it('returns the same instance on subsequent calls', () => {
    isWixConfigured.mockReturnValue(true);
    const a = getWixClientInstance();
    const b = getWixClientInstance();
    expect(a).toBe(b);
  });

  it('resets the instance', () => {
    isWixConfigured.mockReturnValue(true);
    const a = getWixClientInstance();
    resetWixClientInstance();
    const b = getWixClientInstance();
    expect(a).not.toBe(b);
  });

  it('returns null after reset if config becomes unavailable', () => {
    isWixConfigured.mockReturnValue(true);
    expect(getWixClientInstance()).toBeInstanceOf(WixClient);
    resetWixClientInstance();
    isWixConfigured.mockReturnValue(false);
    expect(getWixClientInstance()).toBeNull();
  });
});
