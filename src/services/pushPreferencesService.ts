/**
 * @module pushPreferencesService
 *
 * Mobile caller for the Velo webMethod /_functions/managePushPreferences.
 * Reads and writes user push notification preferences via the app's own
 * backend, replacing the generic Wix notifications API endpoint.
 *
 * GET  → returns current NotificationPreferences for the authenticated member
 * POST → persists updated preferences, returns { success: boolean }
 *
 * Callers are responsible for handling offline/null-client cases before
 * invoking these functions.
 */
import type { NotificationPreferences } from '@/services/notifications';

const ENDPOINT = '/_functions/managePushPreferences';

interface WixClientLike {
  callFunction: <T>(path: string, method: 'GET' | 'POST', body?: unknown) => Promise<T>;
}

interface GetPreferencesResponse {
  preferences: NotificationPreferences;
}

interface UpdatePreferencesResponse {
  success: boolean;
  error?: string;
}

export async function getPushPreferences(client: WixClientLike): Promise<NotificationPreferences> {
  const response = await client.callFunction<GetPreferencesResponse>(ENDPOINT, 'GET');
  if (!response.preferences) {
    throw new Error('managePushPreferences: response missing preferences field');
  }
  return response.preferences;
}

export async function updatePushPreferences(
  client: WixClientLike,
  preferences: NotificationPreferences,
): Promise<void> {
  const response = await client.callFunction<UpdatePreferencesResponse>(ENDPOINT, 'POST', {
    preferences,
  });
  if (!response.success) {
    throw new Error(`managePushPreferences: update failed — ${response.error ?? 'unknown error'}`);
  }
}
