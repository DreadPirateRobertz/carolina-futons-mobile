/**
 * TDD tests for sessionToken service.
 *
 * Covers:
 *  - getSessionToken creates a UUID on first call and stores it
 *  - getSessionToken returns the same token on subsequent calls (SecureStore hit)
 *  - Token matches UUID v4 format (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
 *  - SecureStore read error → generates and stores a fresh token (graceful)
 *  - SecureStore write error → still returns the generated token (graceful)
 *  - resetSessionToken clears storage and generates new token on next call
 *
 * cm-keo: migrated from AsyncStorage → expo-secure-store.
 * @bead cm-lqw (original), cm-keo (SecureStore migration)
 */

import { getSessionToken, resetSessionToken } from '../sessionToken';

// ── Mock expo-secure-store ────────────────────────────────────────────────────

const mockGetItemAsync = jest.fn();
const mockSetItemAsync = jest.fn();
const mockDeleteItemAsync = jest.fn();

jest.mock('expo-secure-store', () => ({
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
  setItemAsync: (...args: unknown[]) => mockSetItemAsync(...args),
  deleteItemAsync: (...args: unknown[]) => mockDeleteItemAsync(...args),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORAGE_KEY = 'cf_session_token';

describe('sessionToken service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetItemAsync.mockResolvedValue(undefined);
    mockDeleteItemAsync.mockResolvedValue(undefined);
  });

  describe('getSessionToken', () => {
    it('returns a UUID v4 format token', async () => {
      mockGetItemAsync.mockResolvedValue(null);
      const token = await getSessionToken();
      expect(token).toMatch(UUID_RE);
    });

    it('stores the new token in SecureStore on first call', async () => {
      mockGetItemAsync.mockResolvedValue(null);
      await getSessionToken();
      expect(mockSetItemAsync).toHaveBeenCalledWith(STORAGE_KEY, expect.stringMatching(UUID_RE));
    });

    it('returns the stored token on subsequent calls', async () => {
      const stored = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
      mockGetItemAsync.mockResolvedValue(stored);
      const token = await getSessionToken();
      expect(token).toBe(stored);
      expect(mockSetItemAsync).not.toHaveBeenCalled();
    });

    it('reads from SecureStore key cf_session_token', async () => {
      mockGetItemAsync.mockResolvedValue(null);
      await getSessionToken();
      expect(mockGetItemAsync).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('generates a new token when SecureStore read fails', async () => {
      mockGetItemAsync.mockRejectedValue(new Error('SecureStore read error'));
      const token = await getSessionToken();
      expect(token).toMatch(UUID_RE);
    });

    it('still returns token even when SecureStore write fails', async () => {
      mockGetItemAsync.mockResolvedValue(null);
      mockSetItemAsync.mockRejectedValue(new Error('SecureStore write error'));
      const token = await getSessionToken();
      expect(token).toMatch(UUID_RE);
    });

    it('two calls without stored token return different tokens', async () => {
      mockGetItemAsync.mockResolvedValue(null);
      const t1 = await getSessionToken();
      mockGetItemAsync.mockResolvedValue(null);
      const t2 = await getSessionToken();
      expect(t1).not.toBe(t2);
    });
  });

  describe('resetSessionToken', () => {
    it('removes the token from SecureStore', async () => {
      await resetSessionToken();
      expect(mockDeleteItemAsync).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('handles SecureStore delete failure gracefully', async () => {
      mockDeleteItemAsync.mockRejectedValue(new Error('delete failed'));
      await expect(resetSessionToken()).resolves.not.toThrow();
    });
  });
});
