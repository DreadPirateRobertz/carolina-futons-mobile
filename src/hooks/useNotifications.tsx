import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import {
  type NotificationPreferences,
  type NotificationType,
  DEFAULT_PREFERENCES,
  getDeepLinkForNotification,
} from '@/services/notifications';

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface NotificationState {
  permissionStatus: PermissionStatus;
  pushToken: string | null;
  preferences: NotificationPreferences;
  badgeCount: number;
}

type NotificationAction =
  | { type: 'SET_PERMISSION'; status: PermissionStatus }
  | { type: 'SET_TOKEN'; token: string }
  | { type: 'SET_PREFERENCES'; prefs: NotificationPreferences }
  | { type: 'TOGGLE_PREF'; key: keyof NotificationPreferences }
  | { type: 'SET_BADGE'; count: number }
  | { type: 'INCREMENT_BADGE' }
  | { type: 'CLEAR_BADGE' };

function notificationReducer(
  state: NotificationState,
  action: NotificationAction,
): NotificationState {
  switch (action.type) {
    case 'SET_PERMISSION':
      return { ...state, permissionStatus: action.status };
    case 'SET_TOKEN':
      return { ...state, pushToken: action.token };
    case 'SET_PREFERENCES':
      return { ...state, preferences: action.prefs };
    case 'TOGGLE_PREF':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          [action.key]: !state.preferences[action.key],
        },
      };
    case 'SET_BADGE':
      return { ...state, badgeCount: action.count };
    case 'INCREMENT_BADGE':
      return { ...state, badgeCount: state.badgeCount + 1 };
    case 'CLEAR_BADGE':
      return { ...state, badgeCount: 0 };
    default:
      return state;
  }
}

interface NotificationContextValue {
  permissionStatus: PermissionStatus;
  pushToken: string | null;
  preferences: NotificationPreferences;
  badgeCount: number;
  requestPermission: () => Promise<void>;
  togglePreference: (key: keyof NotificationPreferences) => void;
  setPreferences: (prefs: NotificationPreferences) => void;
  setBadgeCount: (count: number) => void;
  clearBadge: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

async function getProjectId(): Promise<string | undefined> {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId ??
    undefined
  );
}

async function registerForPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const projectId = await getProjectId();
  if (!projectId) return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, {
    permissionStatus: 'undetermined',
    pushToken: null,
    preferences: DEFAULT_PREFERENCES,
    badgeCount: 0,
  });

  const requestPermission = useCallback(async () => {
    // Check existing permission first
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      dispatch({ type: 'SET_PERMISSION', status: 'granted' });
      const token = await registerForPushToken();
      if (token) dispatch({ type: 'SET_TOKEN', token });
      return;
    }

    // Request permission
    const { status } = await Notifications.requestPermissionsAsync();
    const permStatus: PermissionStatus = status === 'granted' ? 'granted' : 'denied';
    dispatch({ type: 'SET_PERMISSION', status: permStatus });

    if (status === 'granted') {
      const token = await registerForPushToken();
      if (token) dispatch({ type: 'SET_TOKEN', token });
    }
  }, []);

  // Set up notification listeners
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      dispatch({ type: 'INCREMENT_BADGE' });
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (!data?.type) return;

      const deepLink = getDeepLinkForNotification(data.type as NotificationType, data);
      Linking.openURL(deepLink);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  const togglePreference = useCallback((key: keyof NotificationPreferences) => {
    dispatch({ type: 'TOGGLE_PREF', key });
  }, []);

  const setPreferences = useCallback((prefs: NotificationPreferences) => {
    dispatch({ type: 'SET_PREFERENCES', prefs });
  }, []);

  const setBadgeCount = useCallback((count: number) => {
    dispatch({ type: 'SET_BADGE', count });
  }, []);

  const clearBadge = useCallback(() => {
    dispatch({ type: 'CLEAR_BADGE' });
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      permissionStatus: state.permissionStatus,
      pushToken: state.pushToken,
      preferences: state.preferences,
      badgeCount: state.badgeCount,
      requestPermission,
      togglePreference,
      setPreferences,
      setBadgeCount,
      clearBadge,
    }),
    [state, requestPermission, togglePreference, setPreferences, setBadgeCount, clearBadge],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}
