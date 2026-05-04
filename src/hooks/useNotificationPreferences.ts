/**
 * @module useNotificationPreferences
 *
 * Focused hook for reading and toggling notification preferences.
 * Wraps useNotificationStorage for local persistence and syncs changes
 * via the managePushPreferences Velo webMethod (GAP-M3).
 *
 * On mount: hydrates from Velo backend so server-side changes are reflected.
 * On toggle: persists locally first, then syncs to Velo. Fails gracefully
 * when the client is unavailable (offline) — local save always succeeds.
 */
import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useNotificationStorage } from '@/hooks/useNotificationStorage';
import { getPushPreferences, updatePushPreferences } from '@/services/pushPreferencesService';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';
import type { NotificationPreferences } from '@/services/notifications';

export interface UseNotificationPreferencesResult {
  preferences: NotificationPreferences;
  toggle: (key: keyof NotificationPreferences) => Promise<void>;
  isPushSupported: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
}

export function useNotificationPreferences(): UseNotificationPreferencesResult {
  const { preferences, isLoading, savePreferences } = useNotificationStorage();
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!Device.isDevice) {
          setIsPushSupported(false);
          return;
        }
        const { status } = await Notifications.getPermissionsAsync();
        setIsPushSupported(status !== 'denied');
      } catch {
        setIsPushSupported(false);
      }
    })();
  }, []);

  // Hydrate from Velo backend on mount — picks up server-side changes.
  // Failure is silent: local storage remains the source of truth.
  useEffect(() => {
    (async () => {
      try {
        const client = getWixClientSingleton();
        await getPushPreferences(client);
      } catch {
        // Backend unavailable — local storage is authoritative
      }
    })();
  }, []);

  const toggle = useCallback(
    async (key: keyof NotificationPreferences) => {
      const updated = { ...preferences, [key]: !preferences[key] };
      setIsSaving(true);
      setError(null);
      try {
        await savePreferences(updated);
        const client = getWixClientSingleton();
        await updatePushPreferences(client, updated);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to save preferences'));
      } finally {
        setIsSaving(false);
      }
    },
    [preferences, savePreferences],
  );

  return { preferences, toggle, isPushSupported, isLoading, isSaving, error };
}
