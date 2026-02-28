import { WixAuthService } from '../wixAuth';
import type { WixTokens } from '../tokenStorage';

// --- Mocks ---

const mockTokens: WixTokens = {
  accessToken: { value: 'access-abc', expiresAt: Date.now() + 3600000 },
  refreshToken: { value: 'refresh-xyz', role: 'member' },
};

const mockAuth = {
  login: jest.fn(),
  register: jest.fn(),
  getMemberTokensForDirectLogin: jest.fn(),
  generateVisitorTokens: jest.fn(),
  setTokens: jest.fn(),
  getTokens: jest.fn(() => mockTokens),
  loggedIn: jest.fn(() => false),
  sendPasswordResetEmail: jest.fn(),
  generateOAuthData: jest.fn(),
  getAuthUrl: jest.fn(),
  getMemberTokens: jest.fn(),
  renewToken: jest.fn(),
  logout: jest.fn(() => ({ logoutUrl: 'https://wix.com/logout' })),
};

const mockMembers = {
  getCurrentMember: jest.fn(),
};

const mockClient = { auth: mockAuth, members: mockMembers };

jest.mock('../wixClient', () => ({
  getWixClient: () => mockClient,
}));

const tokenStore: Record<string, string> = {};
jest.mock('../tokenStorage', () => ({
  saveTokens: jest.fn(async (t: WixTokens) => {
    tokenStore['tokens'] = JSON.stringify(t);
  }),
  loadTokens: jest.fn(async () => {
    const raw = tokenStore['tokens'];
    return raw ? JSON.parse(raw) : null;
  }),
  clearTokens: jest.fn(async () => {
    delete tokenStore['tokens'];
  }),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `carolinafutons://${path}`),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}));

describe('WixAuthService', () => {
  let service: WixAuthService;

  beforeEach(() => {
    // Reset all auth mocks to defaults (clears custom mockImplementation overrides)
    Object.values(mockAuth).forEach((fn) => (fn as jest.Mock).mockReset());
    mockMembers.getCurrentMember.mockReset();
    // Restore defaults that tests rely on
    mockAuth.getTokens.mockReturnValue(mockTokens);
    mockAuth.loggedIn.mockReturnValue(false);
    mockAuth.logout.mockReturnValue({ logoutUrl: 'https://wix.com/logout' });
    // Reset tokenStore state (the mock implementations reference this directly)
    delete tokenStore['tokens'];
    service = new WixAuthService();
  });

  // --- loginWithEmail ---

  describe('loginWithEmail', () => {
    it('returns success and persists tokens on valid login', async () => {
      mockAuth.login.mockResolvedValue({
        loginState: 'SUCCESS',
        data: { sessionToken: 'session-123' },
      });
      mockAuth.getMemberTokensForDirectLogin.mockResolvedValue(mockTokens);
      // saveTokens verified via tokenStorageMock

      const result = await service.loginWithEmail('user@test.com', 'Password1');

      expect(mockAuth.login).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'Password1',
      });
      expect(mockAuth.getMemberTokensForDirectLogin).toHaveBeenCalledWith('session-123');
      expect(mockAuth.setTokens).toHaveBeenCalledWith(mockTokens);
      expect(tokenStore['tokens']).toBeDefined();
      expect(result).toEqual({ success: true });
    });

    it('returns error on invalid credentials', async () => {
      mockAuth.login.mockResolvedValue({
        loginState: 'FAILURE',
        errorCode: 'invalidPassword',
      });

      const result = await service.loginWithEmail('user@test.com', 'wrong');

      expect(result).toEqual({
        success: false,
        error: 'Invalid email or password',
      });
    });

    it('returns error when email verification required', async () => {
      mockAuth.login.mockResolvedValue({
        loginState: 'EMAIL_VERIFICATION_REQUIRED',
      });

      const result = await service.loginWithEmail('user@test.com', 'Password1');

      expect(result).toEqual({
        success: false,
        error: 'Please verify your email address before logging in',
        requiresVerification: true,
      });
    });

    it('returns error when owner approval required', async () => {
      mockAuth.login.mockResolvedValue({
        loginState: 'OWNER_APPROVAL_REQUIRED',
      });

      const result = await service.loginWithEmail('user@test.com', 'Password1');

      expect(result).toEqual({
        success: false,
        error: 'Your account is pending approval',
      });
    });

    it('handles network errors', async () => {
      mockAuth.login.mockRejectedValue(new Error('Network request failed'));

      const result = await service.loginWithEmail('user@test.com', 'Password1');

      expect(result).toEqual({
        success: false,
        error: 'Network request failed',
      });
    });

    it('handles unknown FAILURE errorCode', async () => {
      mockAuth.login.mockResolvedValue({
        loginState: 'FAILURE',
        errorCode: 'somethingUnknown',
      });

      const result = await service.loginWithEmail('user@test.com', 'Password1');

      expect(result).toEqual({
        success: false,
        error: 'Invalid email or password',
      });
    });
  });

  // --- register ---

  describe('register', () => {
    it('returns success and persists tokens on registration', async () => {
      mockAuth.register.mockResolvedValue({
        loginState: 'SUCCESS',
        data: { sessionToken: 'session-new' },
      });
      mockAuth.getMemberTokensForDirectLogin.mockResolvedValue(mockTokens);

      const result = await service.register('new@test.com', 'Password1', 'New User');

      expect(mockAuth.register).toHaveBeenCalledWith({
        email: 'new@test.com',
        password: 'Password1',
        profile: { nickname: 'New User' },
      });
      expect(result).toEqual({ success: true });
    });

    it('returns error when email already exists', async () => {
      mockAuth.register.mockResolvedValue({
        loginState: 'FAILURE',
        errorCode: 'emailAlreadyExists',
      });

      const result = await service.register('taken@test.com', 'Password1', 'User');

      expect(result).toEqual({
        success: false,
        error: 'An account with this email already exists',
      });
    });

    it('handles email verification required after registration', async () => {
      mockAuth.register.mockResolvedValue({
        loginState: 'EMAIL_VERIFICATION_REQUIRED',
      });

      const result = await service.register('new@test.com', 'Password1', 'User');

      expect(result).toEqual({
        success: false,
        error: 'Please check your email to verify your account',
        requiresVerification: true,
      });
    });

    it('handles owner approval required after registration', async () => {
      mockAuth.register.mockResolvedValue({
        loginState: 'OWNER_APPROVAL_REQUIRED',
      });

      const result = await service.register('new@test.com', 'Password1', 'User');

      expect(result).toEqual({
        success: false,
        error: 'Your account is pending approval',
      });
    });

    it('handles network errors', async () => {
      mockAuth.register.mockRejectedValue(new Error('Timeout'));

      const result = await service.register('new@test.com', 'Password1', 'User');

      expect(result).toEqual({ success: false, error: 'Timeout' });
    });
  });

  // --- loginWithOAuth ---

  describe('loginWithOAuth', () => {
    const oauthData = {
      state: 'state-123',
      codeVerifier: 'verifier',
      codeChallenge: 'challenge',
      redirectUri: 'carolinafutons://oauth/wix/callback',
      originalUrl: '',
    };

    it('opens browser and exchanges code for tokens on success', async () => {
      const { openAuthSessionAsync } = require('expo-web-browser');
      mockAuth.generateOAuthData.mockReturnValue(oauthData);
      mockAuth.getAuthUrl.mockResolvedValue({ authUrl: 'https://wix.com/auth?flow=1' });
      openAuthSessionAsync.mockResolvedValue({
        type: 'success',
        url: 'carolinafutons://oauth/wix/callback?code=auth-code-123&state=state-123',
      });
      mockAuth.getMemberTokens.mockResolvedValue(mockTokens);

      const result = await service.loginWithOAuth();

      expect(mockAuth.generateOAuthData).toHaveBeenCalledWith(
        'carolinafutons://oauth/wix/callback',
      );
      expect(openAuthSessionAsync).toHaveBeenCalledWith(
        'https://wix.com/auth?flow=1',
        'carolinafutons://oauth/wix/callback',
      );
      expect(mockAuth.getMemberTokens).toHaveBeenCalledWith(
        'auth-code-123',
        'state-123',
        oauthData,
      );
      expect(result).toEqual({ success: true });
    });

    it('returns cancelled when user dismisses browser', async () => {
      const { openAuthSessionAsync } = require('expo-web-browser');
      mockAuth.generateOAuthData.mockReturnValue(oauthData);
      mockAuth.getAuthUrl.mockResolvedValue({ authUrl: 'https://wix.com/auth' });
      openAuthSessionAsync.mockResolvedValue({ type: 'cancel' });

      const result = await service.loginWithOAuth();

      expect(result).toEqual({ success: false, error: 'Login cancelled' });
    });

    it('returns error when OAuth callback has error params', async () => {
      const { openAuthSessionAsync } = require('expo-web-browser');
      mockAuth.generateOAuthData.mockReturnValue(oauthData);
      mockAuth.getAuthUrl.mockResolvedValue({ authUrl: 'https://wix.com/auth' });
      openAuthSessionAsync.mockResolvedValue({
        type: 'success',
        url: 'carolinafutons://oauth/wix/callback?error=access_denied&error_description=User+denied',
      });

      const result = await service.loginWithOAuth();

      expect(result).toEqual({ success: false, error: 'User denied' });
    });

    it('handles network errors during OAuth flow', async () => {
      mockAuth.generateOAuthData.mockReturnValue(oauthData);
      mockAuth.getAuthUrl.mockRejectedValue(new Error('Network error'));

      const result = await service.loginWithOAuth();

      expect(result).toEqual({ success: false, error: 'Network error' });
    });
  });

  // --- sendPasswordReset ---

  describe('sendPasswordReset', () => {
    it('calls sendPasswordResetEmail with redirect URI', async () => {
      mockAuth.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.sendPasswordReset('user@test.com');

      expect(mockAuth.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@test.com',
        'carolinafutons://reset-password',
      );
      expect(result).toEqual({ success: true });
    });

    it('swallows errors to prevent email enumeration', async () => {
      mockAuth.sendPasswordResetEmail.mockRejectedValue(new Error('Unknown email'));

      const result = await service.sendPasswordReset('unknown@test.com');

      expect(result).toEqual({ success: true });
    });
  });

  // --- logout ---

  describe('logout', () => {
    it('clears stored tokens', async () => {
      tokenStore['tokens'] = JSON.stringify(mockTokens);

      await service.logout();

      expect(tokenStore['tokens']).toBeUndefined();
    });
  });

  // --- restoreSession ---

  describe('restoreSession', () => {
    it('restores tokens from storage and sets them on client', async () => {
      tokenStore['tokens'] = JSON.stringify(mockTokens);
      mockAuth.loggedIn.mockReturnValue(true);

      const result = await service.restoreSession();

      expect(mockAuth.setTokens).toHaveBeenCalledWith(mockTokens);
      expect(result).toBe(true);
    });

    it('returns false when no stored tokens', async () => {
      const result = await service.restoreSession();

      expect(result).toBe(false);
    });

    it('returns false and clears tokens when restore fails', async () => {
      tokenStore['tokens'] = JSON.stringify(mockTokens);
      mockAuth.setTokens.mockImplementation(() => {
        throw new Error('invalid token');
      });

      const result = await service.restoreSession();

      expect(result).toBe(false);
      expect(tokenStore['tokens']).toBeUndefined();
    });
  });

  // --- getCurrentMember ---

  describe('getCurrentMember', () => {
    it('returns mapped user when logged in', async () => {
      mockMembers.getCurrentMember.mockResolvedValue({
        member: {
          _id: 'member-123',
          loginEmail: 'real@user.com',
          profile: {
            nickname: 'Real User',
          },
        },
      });

      const user = await service.getCurrentMember();

      expect(user).toEqual({
        id: 'member-123',
        email: 'real@user.com',
        displayName: 'Real User',
        provider: 'wix',
      });
    });

    it('returns null when getCurrentMember fails', async () => {
      mockMembers.getCurrentMember.mockRejectedValue(new Error('Not authenticated'));

      const user = await service.getCurrentMember();

      expect(user).toBeNull();
    });

    it('handles missing profile fields by falling back to email', async () => {
      mockMembers.getCurrentMember.mockResolvedValue({
        member: {
          _id: 'member-456',
          loginEmail: 'minimal@user.com',
          profile: {},
        },
      });

      const user = await service.getCurrentMember();

      expect(user).toEqual({
        id: 'member-456',
        email: 'minimal@user.com',
        displayName: 'minimal@user.com',
        provider: 'wix',
      });
    });
  });

  // --- isLoggedIn ---

  describe('isLoggedIn', () => {
    it('delegates to client auth.loggedIn()', () => {
      mockAuth.loggedIn.mockReturnValue(true);
      expect(service.isLoggedIn()).toBe(true);

      mockAuth.loggedIn.mockReturnValue(false);
      expect(service.isLoggedIn()).toBe(false);
    });
  });

  // --- refreshSession ---

  describe('refreshSession', () => {
    it('renews token and persists new tokens', async () => {
      const newTokens: WixTokens = {
        accessToken: { value: 'new-access', expiresAt: Date.now() + 7200000 },
        refreshToken: { value: 'new-refresh', role: 'member' },
      };
      mockAuth.getTokens.mockReturnValue(mockTokens);
      mockAuth.renewToken.mockResolvedValue(newTokens);

      const result = await service.refreshSession();

      expect(mockAuth.renewToken).toHaveBeenCalledWith(mockTokens.refreshToken);
      expect(mockAuth.setTokens).toHaveBeenCalledWith(newTokens);
      expect(result).toBe(true);
    });

    it('returns false and clears tokens when refresh fails', async () => {
      tokenStore['tokens'] = JSON.stringify(mockTokens);
      mockAuth.getTokens.mockReturnValue(mockTokens);
      mockAuth.renewToken.mockRejectedValue(new Error('Token expired'));

      const result = await service.refreshSession();

      expect(result).toBe(false);
      expect(tokenStore['tokens']).toBeUndefined();
    });
  });
});
