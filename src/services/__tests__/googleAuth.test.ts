import {
  decodeGoogleIdToken,
  isGoogleAuthConfigured,
  saveGoogleSession,
  loadGoogleSession,
  clearGoogleSession,
} from '../googleAuth';

jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    getItemAsync: jest.fn(async (key: string) => store[key] ?? null),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
    __store: store,
  };
});

// Helper: build a fake JWT with given payload
function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${body}.fakesig`;
}

describe('googleAuth', () => {
  describe('decodeGoogleIdToken', () => {
    it('decodes a Google ID token payload', () => {
      const token = fakeJwt({
        sub: '12345',
        email: 'user@gmail.com',
        name: 'Test User',
      });

      const claims = decodeGoogleIdToken(token);

      expect(claims.sub).toBe('12345');
      expect(claims.email).toBe('user@gmail.com');
      expect(claims.name).toBe('Test User');
    });

    it('falls back name to email when name is missing', () => {
      const token = fakeJwt({ sub: '12345', email: 'user@gmail.com' });

      const claims = decodeGoogleIdToken(token);

      expect(claims.name).toBe('user@gmail.com');
    });

    it('returns empty strings for missing claims', () => {
      const token = fakeJwt({});

      const claims = decodeGoogleIdToken(token);

      expect(claims.sub).toBe('');
      expect(claims.email).toBe('');
      expect(claims.name).toBe('');
    });
  });

  describe('isGoogleAuthConfigured', () => {
    const origEnv = process.env;

    afterEach(() => {
      process.env = origEnv;
    });

    it('returns true when web client ID is set', () => {
      process.env = { ...origEnv, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'some-id' };
      // Re-import to pick up env change — but the module caches config at import.
      // The test in jest.config.js sets this before import, so isGoogleAuthConfigured
      // should reflect the test environment value.
      expect(isGoogleAuthConfigured()).toBe(true);
    });
  });

  describe('session persistence', () => {
    const SecureStore = require('expo-secure-store');

    beforeEach(() => {
      const store = SecureStore.__store as Record<string, string>;
      for (const key of Object.keys(store)) delete store[key];
    });

    it('saves and loads a Google session', async () => {
      await saveGoogleSession('test-id-token');
      const loaded = await loadGoogleSession();
      expect(loaded).toBe('test-id-token');
    });

    it('returns null when no session stored', async () => {
      const loaded = await loadGoogleSession();
      expect(loaded).toBeNull();
    });

    it('clears the stored session', async () => {
      await saveGoogleSession('test-id-token');
      await clearGoogleSession();
      const loaded = await loadGoogleSession();
      expect(loaded).toBeNull();
    });
  });
});
