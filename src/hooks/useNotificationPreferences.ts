/**
 * @module useNotificationPreferences
 *
 * Focused hook for reading and toggling notification preferences.
 * Wraps useNotificationStorage for local persistence and syncs changes
 * to the backend preferences endpoint. Gracefully handles unsupported
 * push environments (simulators, denied permission).
 */
import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useNotificationStorage } from '@/hooks/useNotificationStorage';
import type { NotificationPreferences } from '@/services/notifications';

const PREFERENCES_ENDPOINT = 'https://www.wixapis.com/v1/notifications/preferences';

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

  const toggle = useCallback(
    async (key: keyof NotificationPreferences) => {
      const updated = { ...preferences, [key]: !preferences[key] };
      setIsSaving(true);
      setError(null);
      try {
        await savePreferences(updated);
        const response = await fetch(PREFERENCES_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
        if (!response.ok) {
          throw new Error(`Preferences sync failed: ${response.status}`);
        }
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
