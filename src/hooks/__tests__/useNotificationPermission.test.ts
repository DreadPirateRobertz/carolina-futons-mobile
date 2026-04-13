// src/hooks/__tests__/useNotificationPermission.test.ts
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';

import * as Notifications from 'expo-notifications';
import { useNotificationPermission } from '../useNotificationPermission';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

const ASKED_KEY = '@cf_notif_asked';

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as never);
});

it('returns undetermined status on first load', async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
  const { result } = renderHook(() => useNotificationPermission());
  await act(async () => {});
  expect(result.current.status).toBe('undetermined');
  expect(result.current.hasAskedBefore).toBe(false);
});

it('requestPermission stores asked flag and returns granted', async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
  (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  const { result } = renderHook(() => useNotificationPermission());
  await act(async () => {});
  let returned: string | undefined;
  await act(async () => {
    returned = await result.current.requestPermission();
  });
  expect(returned).toBe('granted');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(ASKED_KEY, 'true');
  expect(result.current.status).toBe('granted');
});

it('openSettings calls Linking.openSettings', async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
  const { result } = renderHook(() => useNotificationPermission());
  await act(async () => {});
  await act(async () => {
    await result.current.openSettings();
  });
  expect(Linking.openSettings).toHaveBeenCalled();
});

it('hasAskedBefore is true when AsyncStorage flag is set', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
  const { result } = renderHook(() => useNotificationPermission());
  await act(async () => {});
  expect(result.current.hasAskedBefore).toBe(true);
});

it('does not throw when AsyncStorage fails on init', async () => {
  (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('storage error'));
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
  const { result } = renderHook(() => useNotificationPermission());
  await act(async () => {});
  expect(result.current.status).toBe('undetermined'); // stays at initial default
});
