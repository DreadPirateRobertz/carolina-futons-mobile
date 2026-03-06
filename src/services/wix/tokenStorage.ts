/**
 * @module tokenStorage
 *
 * Persists Wix OAuth tokens in expo-secure-store (Keychain on iOS,
 * Keystore on Android) so sessions survive app restarts without
 * forcing re-login.
 */
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'wix_auth_tokens';

export interface WixTokens {
  accessToken: { value: string; expiresAt: number };
  refreshToken: { value: string; role: 'visitor' | 'member' | 'none' };
}

export async function saveTokens(tokens: WixTokens): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
}

export async function loadTokens(): Promise<WixTokens | null> {
  try {
    const raw = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WixTokens;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
