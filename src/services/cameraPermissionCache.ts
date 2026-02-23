/**
 * Camera permission state persistence across sessions.
 *
 * Caches the last-known permission state to AsyncStorage so the UI can
 * make instant decisions on mount (e.g., skip the permission prompt if
 * already granted, or show fallback immediately if previously denied).
 *
 * The cached state is advisory — the actual permission is still checked
 * via expo-camera's useCameraPermissions hook. This just eliminates
 * the flash of loading UI for returning users.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@cfutons/camera-permission';

export type CachedPermissionState = 'granted' | 'denied' | 'undetermined';

let _cached: CachedPermissionState | null = null;

/**
 * Load the cached permission state from AsyncStorage.
 * Returns 'undetermined' if nothing is cached or storage is unavailable.
 */
export async function loadCachedPermission(): Promise<CachedPermissionState> {
  if (_cached !== null) return _cached;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === 'granted' || stored === 'denied') {
      _cached = stored;
      return stored;
    }
  } catch {
    // AsyncStorage not available — operate without cache
  }

  _cached = 'undetermined';
  return 'undetermined';
}

/**
 * Persist the current permission state for next session.
 */
export async function saveCachedPermission(state: 'granted' | 'denied'): Promise<void> {
  _cached = state;

  try {
    await AsyncStorage.setItem(STORAGE_KEY, state);
  } catch {
    // Silently fail — cache is advisory
  }
}

/**
 * Get the in-memory cached state synchronously.
 * Returns null if loadCachedPermission() hasn't been called yet.
 */
export function getCachedPermissionSync(): CachedPermissionState | null {
  return _cached;
}

/**
 * Reset cached state. Used by tests.
 */
export function resetCache(): void {
  _cached = null;
}
