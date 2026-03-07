/**
 * Native Apple Sign-In wrapper using expo-apple-authentication.
 *
 * Provides availability checks and credential acquisition for iOS.
 * On non-iOS platforms, {@link isAppleAuthAvailable} returns `false`.
 */
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

export interface AppleCredential {
  identityToken: string;
  authorizationCode: string;
  email: string | null;
  fullName: string | null;
}

/** Returns `true` when native Apple Sign-In is available (iOS 13+). */
export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

/**
 * Presents the native Apple Sign-In sheet and returns the credential.
 *
 * Requests full-name and email scopes. Apple only returns the name/email
 * on the *first* sign-in for a given Apple ID + app pair; subsequent
 * calls return `null` for those fields.
 *
 * @throws If the user cancels or Apple returns no identity token.
 */
export async function signInWithApple(): Promise<AppleCredential> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple Sign-In failed: no identity token received');
  }

  const parts = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean);

  return {
    identityToken: credential.identityToken,
    authorizationCode: credential.authorizationCode ?? '',
    email: credential.email ?? null,
    fullName: parts.length > 0 ? parts.join(' ') : null,
  };
}
