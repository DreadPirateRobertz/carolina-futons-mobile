/**
 * TDD tests for sessionToken service.
 *
 * Covers:
 *  - getSessionToken creates a UUID on first call and stores it
 *  - getSessionToken returns the same token on subsequent calls (AsyncStorage hit)
 *  - Token matches UUID v4 format (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
 *  - AsyncStorage read error → generates and stores a fresh token (graceful)
 *  - AsyncStorage write error → still returns the generated token (graceful)
 *  - resetSessionToken clears storage and generates new token on next call
 *
 * @bead cm-lqw
 */

import { getSessionToken, resetSessionToken } from '../sessionToken';

// ── Mock AsyncStorage ─────────────────────────────────────────────────────────

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
  removeItem: (...args: unknown[]) => mockRemoveItem(...args),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORAGE_KEY = 'cf_session_token';

describe('sessionToken service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetItem.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue(undefined);
  });

  describe('getSessionToken', () => {
    it('returns a UUID v4 format token', async () => {
      mockGetItem.mockResolvedValue(null);
      const token = await getSessionToken();
      expect(token).toMatch(UUID_RE);
    });

    it('stores the new token in AsyncStorage on first call', async () => {
      mockGetItem.mockResolvedValue(null);
      await getSessionToken();
      expect(mockSetItem).toHaveBeenCalledWith(STORAGE_KEY, expect.stringMatching(UUID_RE));
    });

    it('returns the stored token on subsequent calls', async () => {
      const stored = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
      mockGetItem.mockResolvedValue(stored);
      const token = await getSessionToken();
      expect(token).toBe(stored);
      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it('reads from AsyncStorage key cf_session_token', async () => {
      mockGetItem.mockResolvedValue(null);
      await getSessionToken();
      expect(mockGetItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('generates a new token when AsyncStorage read fails', async () => {
      mockGetItem.mockRejectedValue(new Error('Storage read error'));
      const token = await getSessionToken();
      expect(token).toMatch(UUID_RE);
    });

    it('still returns token even when AsyncStorage write fails', async () => {
      mockGetItem.mockResolvedValue(null);
      mockSetItem.mockRejectedValue(new Error('Storage write error'));
      const token = await getSessionToken();
      expect(token).toMatch(UUID_RE);
    });

    it('two calls without stored token return different tokens', async () => {
      mockGetItem.mockResolvedValue(null);
      const t1 = await getSessionToken();
      mockGetItem.mockResolvedValue(null);
      const t2 = await getSessionToken();
      expect(t1).not.toBe(t2);
    });
  });

  describe('resetSessionToken', () => {
    it('removes the token from AsyncStorage', async () => {
      await resetSessionToken();
      expect(mockRemoveItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('handles AsyncStorage remove failure gracefully', async () => {
      mockRemoveItem.mockRejectedValue(new Error('remove failed'));
      await expect(resetSessionToken()).resolves.not.toThrow();
    });
  });
});
