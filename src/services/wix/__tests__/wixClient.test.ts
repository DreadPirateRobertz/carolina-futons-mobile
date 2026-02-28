import { getWixClient, resetWixClient } from '../wixClient';

jest.mock('@wix/sdk', () => ({
  createClient: jest.fn(() => ({
    auth: {
      setTokens: jest.fn(),
      getTokens: jest.fn(() => ({
        accessToken: { value: '', expiresAt: 0 },
        refreshToken: { value: '', role: 'visitor' },
      })),
      loggedIn: jest.fn(() => false),
    },
  })),
  OAuthStrategy: jest.fn((opts: unknown) => ({ strategy: 'oauth', ...(opts as object) })),
}));

jest.mock('@wix/members', () => ({
  members: { queryMembers: jest.fn() },
}));

describe('WixClient', () => {
  beforeEach(() => {
    resetWixClient();
  });

  it('returns a client instance', () => {
    const client = getWixClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it('returns the same instance on subsequent calls (singleton)', () => {
    const a = getWixClient();
    const b = getWixClient();
    expect(a).toBe(b);
  });

  it('returns a new instance after reset', () => {
    const a = getWixClient();
    resetWixClient();
    const b = getWixClient();
    expect(a).not.toBe(b);
  });
});
