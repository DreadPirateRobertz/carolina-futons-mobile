// src/hooks/useNotificationPermission.ts
import { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ASKED_KEY = '@cf_notif_asked';

// Mirrors expo-notifications PermissionStatus enum values
export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface NotificationPermissionResult {
  status: PermissionStatus;
  hasAskedBefore: boolean;
  requestPermission: () => Promise<PermissionStatus>;
  openSettings: () => Promise<void>;
}

export function useNotificationPermission(): NotificationPermissionResult {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');
  const [hasAskedBefore, setHasAskedBefore] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [{ status: currentStatus }, askedFlag] = await Promise.all([
          Notifications.getPermissionsAsync(),
          AsyncStorage.getItem(ASKED_KEY),
        ]);
        setStatus(currentStatus as PermissionStatus);
        setHasAskedBefore(askedFlag === 'true');
      } catch (err) {
        // Permission check failed — leave as undetermined
      }
    }
    init();
  }, []);

  const requestPermission = useCallback(async (): Promise<PermissionStatus> => {
    try {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      await AsyncStorage.setItem(ASKED_KEY, 'true');
      setStatus(newStatus as PermissionStatus);
      setHasAskedBefore(true);
      return newStatus as PermissionStatus;
    } catch {
      return 'denied';
    }
  }, []);

  const openSettings = useCallback(async (): Promise<void> => {
    try {
      await Linking.openSettings();
    } catch {
      // openSettings failure is non-fatal
    }
  }, []);

  return { status, hasAskedBefore, requestPermission, openSettings };
}
