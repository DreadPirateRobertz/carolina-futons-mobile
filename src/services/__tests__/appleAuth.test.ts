/**
 * Tests for Apple Sign-In service (appleAuth.ts).
 *
 * Covers availability checks, credential acquisition, and error handling
 * for the native Apple Sign-In flow on iOS.
 */

import { Platform } from 'react-native';

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}));

import * as AppleAuthentication from 'expo-apple-authentication';
import { isAppleAuthAvailable, signInWithApple, type AppleCredential } from '../appleAuth';

const mockIsAvailable = AppleAuthentication.isAvailableAsync as jest.MockedFunction<
  typeof AppleAuthentication.isAvailableAsync
>;
const mockSignIn = AppleAuthentication.signInAsync as jest.MockedFunction<
  typeof AppleAuthentication.signInAsync
>;

describe('appleAuth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAppleAuthAvailable', () => {
    it('returns false on non-iOS platforms', async () => {
      const origOS = Platform.OS;
      (Platform as any).OS = 'android';

      const result = await isAppleAuthAvailable();
      expect(result).toBe(false);
      expect(mockIsAvailable).not.toHaveBeenCalled();

      (Platform as any).OS = origOS;
    });

    it('returns true on iOS when available', async () => {
      const origOS = Platform.OS;
      (Platform as any).OS = 'ios';
      mockIsAvailable.mockResolvedValue(true);

      const result = await isAppleAuthAvailable();
      expect(result).toBe(true);

      (Platform as any).OS = origOS;
    });

    it('returns false on iOS when not available', async () => {
      const origOS = Platform.OS;
      (Platform as any).OS = 'ios';
      mockIsAvailable.mockResolvedValue(false);

      const result = await isAppleAuthAvailable();
      expect(result).toBe(false);

      (Platform as any).OS = origOS;
    });
  });

  describe('signInWithApple', () => {
    it('returns credential with identity token, email, and full name', async () => {
      mockSignIn.mockResolvedValue({
        identityToken: 'mock-id-token',
        authorizationCode: 'mock-auth-code',
        email: 'apple@test.com',
        fullName: {
          givenName: 'John',
          familyName: 'Doe',
          namePrefix: null,
          nameSuffix: null,
          nickname: null,
          middleName: null,
        },
        user: 'user-id',
        realUserStatus: 1,
        state: null,
      });

      const result: AppleCredential = await signInWithApple();
      expect(result.identityToken).toBe('mock-id-token');
      expect(result.authorizationCode).toBe('mock-auth-code');
      expect(result.email).toBe('apple@test.com');
      expect(result.fullName).toBe('John Doe');
    });

    it('returns null email when Apple does not provide it', async () => {
      mockSignIn.mockResolvedValue({
        identityToken: 'mock-id-token',
        authorizationCode: 'mock-auth-code',
        email: null,
        fullName: null,
        user: 'user-id',
        realUserStatus: 1,
        state: null,
      });

      const result = await signInWithApple();
      expect(result.email).toBeNull();
      expect(result.fullName).toBeNull();
    });

    it('throws when no identity token is received', async () => {
      mockSignIn.mockResolvedValue({
        identityToken: null,
        authorizationCode: null,
        email: null,
        fullName: null,
        user: 'user-id',
        realUserStatus: 1,
        state: null,
      });

      await expect(signInWithApple()).rejects.toThrow('no identity token');
    });

    it('propagates errors from expo-apple-authentication', async () => {
      mockSignIn.mockRejectedValue(new Error('User cancelled'));

      await expect(signInWithApple()).rejects.toThrow('User cancelled');
    });

    it('returns empty authorizationCode when not provided', async () => {
      mockSignIn.mockResolvedValue({
        identityToken: 'mock-id-token',
        authorizationCode: null,
        email: null,
        fullName: null,
        user: 'user-id',
        realUserStatus: 1,
        state: null,
      });

      const result = await signInWithApple();
      expect(result.authorizationCode).toBe('');
    });

    it('handles partial name (given name only)', async () => {
      mockSignIn.mockResolvedValue({
        identityToken: 'mock-id-token',
        authorizationCode: 'code',
        email: null,
        fullName: {
          givenName: 'Jane',
          familyName: null,
          namePrefix: null,
          nameSuffix: null,
          nickname: null,
          middleName: null,
        },
        user: 'user-id',
        realUserStatus: 1,
        state: null,
      });

      const result = await signInWithApple();
      expect(result.fullName).toBe('Jane');
    });
  });
});
