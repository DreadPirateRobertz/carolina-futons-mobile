import { saveTokens, loadTokens, clearTokens } from '../tokenStorage';

const store: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key: string) => {
    return Promise.resolve(store[key] ?? null);
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete store[key];
    return Promise.resolve();
  }),
}));

const mockTokens = {
  accessToken: { value: 'access-123', expiresAt: Date.now() + 3600000 },
  refreshToken: { value: 'refresh-456', role: 'member' as const },
};

describe('tokenStorage', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it('saves and loads tokens', async () => {
    await saveTokens(mockTokens);
    const loaded = await loadTokens();
    expect(loaded).toEqual(mockTokens);
  });

  it('returns null when no tokens stored', async () => {
    const loaded = await loadTokens();
    expect(loaded).toBeNull();
  });

  it('returns null for corrupted data', async () => {
    store['wix_auth_tokens'] = 'not-json{{{';
    const loaded = await loadTokens();
    expect(loaded).toBeNull();
  });

  it('clears tokens', async () => {
    await saveTokens(mockTokens);
    await clearTokens();
    const loaded = await loadTokens();
    expect(loaded).toBeNull();
  });
});
