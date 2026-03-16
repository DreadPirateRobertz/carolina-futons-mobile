import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

import { isAppleAuthAvailable, signInWithApple } from '../appleAuth';

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}));

describe('appleAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAppleAuthAvailable', () => {
    it('returns false on Android', async () => {
      const origOS = Platform.OS;
      (Platform as any).OS = 'android';
      const result = await isAppleAuthAvailable();
      expect(result).toBe(false);
      expect(AppleAuthentication.isAvailableAsync).not.toHaveBeenCalled();
      (Platform as any).OS = origOS;
    });

    it('returns true on iOS when available', async () => {
      const origOS = Platform.OS;
      (Platform as any).OS = 'ios';
      (AppleAuthentication.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      const result = await isAppleAuthAvailable();
      expect(result).toBe(true);
      (Platform as any).OS = origOS;
    });

    it('returns false on iOS when not available (old device)', async () => {
      const origOS = Platform.OS;
      (Platform as any).OS = 'ios';
      (AppleAuthentication.isAvailableAsync as jest.Mock).mockResolvedValue(false);
      const result = await isAppleAuthAvailable();
      expect(result).toBe(false);
      (Platform as any).OS = origOS;
    });
  });

  describe('signInWithApple', () => {
    it('returns credential on successful sign-in', async () => {
      (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
        identityToken: 'apple-id-token-123',
        authorizationCode: 'auth-code-456',
        email: 'user@icloud.com',
        fullName: { givenName: 'Jane', familyName: 'Doe' },
      });

      const result = await signInWithApple();

      expect(result).toEqual({
        identityToken: 'apple-id-token-123',
        authorizationCode: 'auth-code-456',
        email: 'user@icloud.com',
        fullName: 'Jane Doe',
      });
      expect(AppleAuthentication.signInAsync).toHaveBeenCalledWith({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
    });

    it('returns null email/fullName on subsequent sign-ins (Apple only provides on first)', async () => {
      (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
        identityToken: 'apple-id-token-789',
        authorizationCode: 'auth-code-abc',
        email: null,
        fullName: { givenName: null, familyName: null },
      });

      const result = await signInWithApple();

      expect(result.email).toBeNull();
      expect(result.fullName).toBeNull();
    });

    it('returns empty string for authorizationCode when not provided', async () => {
      (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
        identityToken: 'token',
        authorizationCode: null,
        email: null,
        fullName: null,
      });

      const result = await signInWithApple();
      expect(result.authorizationCode).toBe('');
    });

    it('throws when no identity token received', async () => {
      (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
        identityToken: null,
        authorizationCode: null,
        email: null,
        fullName: null,
      });

      await expect(signInWithApple()).rejects.toThrow(
        'Apple Sign-In failed: no identity token received',
      );
    });

    it('throws when user cancels the sign-in sheet', async () => {
      (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValue(
        new Error('The user canceled the authorization attempt'),
      );

      await expect(signInWithApple()).rejects.toThrow('canceled');
    });

    it('handles partial name (only given name)', async () => {
      (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
        identityToken: 'token',
        authorizationCode: 'code',
        email: 'test@icloud.com',
        fullName: { givenName: 'Jane', familyName: null },
      });

      const result = await signInWithApple();
      expect(result.fullName).toBe('Jane');
    });

    it('handles partial name (only family name)', async () => {
      (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
        identityToken: 'token',
        authorizationCode: 'code',
        email: null,
        fullName: { givenName: null, familyName: 'Doe' },
      });

      const result = await signInWithApple();
      expect(result.fullName).toBe('Doe');
    });
  });
});
