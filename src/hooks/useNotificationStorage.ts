/**
 * @module useNotificationStorage
 *
 * Persists notification preferences to AsyncStorage so they survive
 * app restarts. Loads saved preferences on mount, falls back to
 * defaults if nothing stored or data is corrupted.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PREFERENCES, type NotificationPreferences } from '@/services/notifications';

const STORAGE_KEY = '@cfutons/notification_prefs';

export function useNotificationStorage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as NotificationPreferences;
          setPreferences(parsed);
        }
      } catch {
        // Corrupted data — fall back to defaults
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const savePreferences = useCallback(async (prefs: NotificationPreferences) => {
    setPreferences(prefs);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, []);

  return {
    preferences,
    isLoading,
    savePreferences,
  };
}
