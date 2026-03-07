/**
 * @module googleAuth
 *
 * Google OAuth configuration and token utilities for expo-auth-session.
 * Handles Google ID token decoding and session persistence via SecureStore.
 */
import * as SecureStore from 'expo-secure-store';

const GOOGLE_SESSION_KEY = 'google_auth_session';

/** Google OAuth client IDs sourced from environment variables. */
export const googleAuthConfig = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
};

/** Returns true when at least the web client ID is configured. */
export function isGoogleAuthConfigured(): boolean {
  return googleAuthConfig.webClientId.length > 0;
}

/** Decoded claims from a Google ID token. */
export interface GoogleIdTokenClaims {
  sub: string;
  email: string;
  name: string;
}

/**
 * Decodes a Google ID token JWT payload without signature verification.
 * Signature verification is handled upstream by the expo-auth-session provider.
 */
export function decodeGoogleIdToken(idToken: string): GoogleIdTokenClaims {
  const payload = idToken.split('.')[1];
  // Convert base64url to base64
  let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad === 2) base64 += '==';
  else if (pad === 3) base64 += '=';

  const decoded = JSON.parse(atob(base64));
  return {
    sub: decoded.sub ?? '',
    email: decoded.email ?? '',
    name: decoded.name ?? decoded.email ?? '',
  };
}

export async function saveGoogleSession(idToken: string): Promise<void> {
  await SecureStore.setItemAsync(GOOGLE_SESSION_KEY, idToken);
}

export async function loadGoogleSession(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(GOOGLE_SESSION_KEY);
  } catch {
    return null;
  }
}

export async function clearGoogleSession(): Promise<void> {
  await SecureStore.deleteItemAsync(GOOGLE_SESSION_KEY);
}
