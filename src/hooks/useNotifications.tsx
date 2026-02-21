import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { type NotificationPreferences, DEFAULT_PREFERENCES } from '@/services/notifications';

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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, {
    permissionStatus: 'undetermined',
    pushToken: null,
    preferences: DEFAULT_PREFERENCES,
    badgeCount: 0,
  });

  const requestPermission = useCallback(async () => {
    // In production: use Notifications.requestPermissionsAsync()
    // Mock: simulate granting permission
    dispatch({ type: 'SET_PERMISSION', status: 'granted' });
    dispatch({ type: 'SET_TOKEN', token: 'ExponentPushToken[mock-token-123]' });
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
