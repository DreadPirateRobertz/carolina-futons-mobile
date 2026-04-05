/**
 * Tests for securityAudit — cm-keo
 *
 * AC:
 *  1. auditAsyncStorage returns clean result when no suspicious keys present
 *  2. auditAsyncStorage flags keys matching sensitive patterns (token, secret, password, apikey, auth)
 *  3. auditAsyncStorage ignores non-sensitive keys (onboarding, cart, prefs, etc.)
 *  4. auditAsyncStorage handles AsyncStorage.getAllKeys failure gracefully
 *  5. runSecurityAudit calls captureException with warning when violations found
 *  6. runSecurityAudit does NOT call captureException when no violations
 *  7. SESSION_TOKEN_KEY is excluded from the audit (it's a non-sensitive UUID)
 */

import { auditAsyncStorage, runSecurityAudit } from '../securityAudit';

// --- Mocks ---

const mockGetAllKeys = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getAllKeys: (...args: unknown[]) => mockGetAllKeys(...args),
}));

const mockCaptureException = jest.fn();
jest.mock('@/services/crashReporting', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

// --- Tests ---

describe('securityAudit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllKeys.mockResolvedValue([]);
  });

  // --- auditAsyncStorage ---

  describe('auditAsyncStorage', () => {
    it('returns empty violations when no keys present', async () => {
      mockGetAllKeys.mockResolvedValue([]);
      const result = await auditAsyncStorage();
      expect(result.violations).toHaveLength(0);
      expect(result.clean).toBe(true);
    });

    it('returns clean for known safe keys', async () => {
      mockGetAllKeys.mockResolvedValue([
        '@carolina_futons_onboarding_complete',
        '@carolina_futons_style_preferences',
        '@post_purchase_review_push:order-123',
        '@carolina_futons_onboarding_style',
        'cf_session_token',
      ]);
      const result = await auditAsyncStorage();
      expect(result.clean).toBe(true);
    });

    it('flags a key containing "token" as suspicious', async () => {
      mockGetAllKeys.mockResolvedValue(['my_auth_token']);
      const result = await auditAsyncStorage();
      expect(result.violations).toContain('my_auth_token');
      expect(result.clean).toBe(false);
    });

    it('flags a key containing "secret" as suspicious', async () => {
      mockGetAllKeys.mockResolvedValue(['api_secret_key']);
      const result = await auditAsyncStorage();
      expect(result.violations).toContain('api_secret_key');
    });

    it('flags a key containing "password" as suspicious', async () => {
      mockGetAllKeys.mockResolvedValue(['saved_password']);
      const result = await auditAsyncStorage();
      expect(result.violations).toContain('saved_password');
    });

    it('flags a key containing "apikey" (case-insensitive) as suspicious', async () => {
      mockGetAllKeys.mockResolvedValue(['wix_ApiKey_cache']);
      const result = await auditAsyncStorage();
      expect(result.violations).toContain('wix_ApiKey_cache');
    });

    it('flags a key containing "bearer" as suspicious', async () => {
      mockGetAllKeys.mockResolvedValue(['bearer_cache']);
      const result = await auditAsyncStorage();
      expect(result.violations).toContain('bearer_cache');
    });

    it('does NOT flag cf_session_token (non-sensitive UUID)', async () => {
      mockGetAllKeys.mockResolvedValue(['cf_session_token']);
      const result = await auditAsyncStorage();
      expect(result.violations).not.toContain('cf_session_token');
      expect(result.clean).toBe(true);
    });

    it('returns multiple violations when multiple suspicious keys found', async () => {
      mockGetAllKeys.mockResolvedValue(['my_token', 'user_password', '@safe_key']);
      const result = await auditAsyncStorage();
      expect(result.violations).toContain('my_token');
      expect(result.violations).toContain('user_password');
      expect(result.violations).not.toContain('@safe_key');
    });

    it('handles AsyncStorage.getAllKeys failure gracefully — returns clean with error', async () => {
      mockGetAllKeys.mockRejectedValue(new Error('storage error'));
      const result = await auditAsyncStorage();
      expect(result.clean).toBe(true);
      expect(result.error).toMatch(/storage error/);
    });
  });

  // --- runSecurityAudit ---

  describe('runSecurityAudit', () => {
    it('calls captureException with warning severity when violations found', async () => {
      mockGetAllKeys.mockResolvedValue(['leaked_token_key']);
      await runSecurityAudit();
      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.any(Error),
        'warning',
        expect.objectContaining({ violations: 'leaked_token_key' }),
      );
    });

    it('does not call captureException when audit is clean', async () => {
      mockGetAllKeys.mockResolvedValue(['@carolina_futons_onboarding_complete']);
      await runSecurityAudit();
      expect(mockCaptureException).not.toHaveBeenCalled();
    });

    it('resolves without throwing even if audit errors', async () => {
      mockGetAllKeys.mockRejectedValue(new Error('catastrophic storage failure'));
      await expect(runSecurityAudit()).resolves.not.toThrow();
    });
  });
});
