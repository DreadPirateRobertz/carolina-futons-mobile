/**
 * @module sessionToken
 *
 * Persistent session token for cross-device cart sync — bead cm-lqw.
 *
 * Generates a UUID v4 on first launch and stores it in expo-secure-store
 * (Keychain on iOS, Keystore-backed on Android) under `cf_session_token`.
 * Guest carts are keyed by this token. On login the guest cart is merged
 * into the member cart and the session token is retained for future guest
 * sessions after logout.
 *
 * cm-keo: migrated from AsyncStorage to SecureStore so the session UUID
 * is protected by hardware-backed encryption on Android (was unencrypted).
 */

import * as SecureStore from 'expo-secure-store';
import { captureException } from '@/services/crashReporting';

export const SESSION_TOKEN_KEY = 'cf_session_token';

function uuid4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Returns the persisted session token, creating and storing one if absent.
 * Gracefully handles SecureStore errors — always returns a token.
 */
export async function getSessionToken(): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
    if (stored) return stored;
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)));
  }

  const token = uuid4();

  try {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)));
  }

  return token;
}

/**
 * Clears the stored session token. A new one will be generated on next
 * call to `getSessionToken`. Useful for testing or explicit session reset.
 */
export async function resetSessionToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)));
  }
}
