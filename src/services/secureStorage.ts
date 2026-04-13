/**
 * @module secureStorage
 *
 * Thin wrapper around expo-secure-store for sensitive key/value data.
 * Use for tokens, member/session identifiers, anything the keychain should hold.
 * Do NOT use for large payloads, UI preferences, or cache — use AsyncStorage.
 *
 * Errors are logged and swallowed so auth flows degrade gracefully if the
 * keychain is unavailable; callers receive `null` on read failure.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SECURE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  MEMBER_ID: 'member_id',
  SESSION_ID: 'session_id',
} as const;

function requireKey(key: string): void {
  if (!key || typeof key !== 'string') {
    throw new Error('secureStorage: key must be a non-empty string');
  }
}

export async function saveSecure(key: string, value: string): Promise<void> {
  requireKey(key);
  if (value == null) return;
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error('[secureStorage] saveSecure failed:', error);
  }
}

export async function loadSecure(key: string): Promise<string | null> {
  requireKey(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error('[secureStorage] loadSecure failed:', error);
    return null;
  }
}

export async function deleteSecure(key: string): Promise<void> {
  requireKey(key);
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error('[secureStorage] deleteSecure failed:', error);
  }
}

/**
 * Migrate a value previously stored in AsyncStorage into SecureStore.
 * Returns true if a value was migrated, false otherwise. Only removes the
 * legacy AsyncStorage entry if the secure save succeeded, so we never lose
 * the value on keychain failure.
 */
export async function migrateFromAsyncStorage(key: string): Promise<boolean> {
  requireKey(key);
  const legacy = await AsyncStorage.getItem(key);
  if (legacy == null) return false;
  try {
    await SecureStore.setItemAsync(key, legacy);
  } catch (error) {
    console.error('[secureStorage] migration save failed:', error);
    return false;
  }
  await AsyncStorage.removeItem(key);
  return true;
}
