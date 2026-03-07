import React from 'react';
import { Linking, Platform, Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationProvider, useNotifications } from '../useNotifications';
import { ANDROID_CHANNEL_CONFIG } from '@/services/notifications';

// --- Mock expo-notifications ---
const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetExpoPushTokenAsync = jest.fn();
const mockAddNotificationReceivedListener = jest.fn();
const mockAddNotificationResponseReceivedListener = jest.fn();
const mockAddPushTokenListener = jest.fn();
const mockSetNotificationChannelAsync = jest.fn();
const mockRemoveReceived = jest.fn();
const mockRemoveResponse = jest.fn();
const mockRemoveTokenListener = jest.fn();

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: (...args: any[]) => mockGetPermissionsAsync(...args),
  requestPermissionsAsync: (...args: any[]) => mockRequestPermissionsAsync(...args),
  getExpoPushTokenAsync: (...args: any[]) => mockGetExpoPushTokenAsync(...args),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: (...args: any[]) => mockSetNotificationChannelAsync(...args),
  addNotificationReceivedListener: (...args: any[]) => {
    mockAddNotificationReceivedListener(...args);
    return { remove: mockRemoveReceived };
  },
  addNotificationResponseReceivedListener: (...args: any[]) => {
    mockAddNotificationResponseReceivedListener(...args);
    return { remove: mockRemoveResponse };
  },
  addPushTokenListener: (...args: any[]) => {
    mockAddPushTokenListener(...args);
    return { remove: mockRemoveTokenListener };
  },
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
}));

const mockAsyncStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockAsyncStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockAsyncStorage[key] = value;
    return Promise.resolve();
  }),
}));

const mockRegisterPushToken = jest.fn().mockResolvedValue(undefined);
jest.mock('@/services/notifications', () => ({
  ...jest.requireActual('@/services/notifications'),
  registerPushToken: (...args: any[]) => mockRegisterPushToken(...args),
}));

const mockCaptureException = jest.fn();
jest.mock('@/services/crashReporting', () => ({
  captureException: (...args: any[]) => mockCaptureException(...args),
}));

jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

function NotifHarness() {
  const {
    permissionStatus,
    pushToken,
    preferences,
    badgeCount,
    requestPermission,
    togglePreference,
    setBadgeCount,
    clearBadge,
  } = useNotifications();

  return (
    <View>
      <Text testID="permission">{permissionStatus}</Text>
      <Text testID="token">{pushToken ?? ''}</Text>
      <Text testID="badge">{badgeCount}</Text>
      <Text testID="pref-orders">{String(preferences.orderUpdates)}</Text>
      <Text testID="pref-promos">{String(preferences.promotions)}</Text>
      <Text testID="pref-stock">{String(preferences.backInStock)}</Text>
      <Text testID="pref-cart">{String(preferences.cartReminders)}</Text>

      <TouchableOpacity testID="request" onPress={requestPermission} />
      <TouchableOpacity testID="toggle-orders" onPress={() => togglePreference('orderUpdates')} />
      <TouchableOpacity testID="toggle-cart" onPress={() => togglePreference('cartReminders')} />
      <TouchableOpacity testID="set-badge-5" onPress={() => setBadgeCount(5)} />
      <TouchableOpacity testID="clear-badge" onPress={clearBadge} />
    </View>
  );
}

function renderNotif() {
  return render(
    <NotificationProvider>
      <NotifHarness />
    </NotificationProvider>,
  );
}

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear stored preferences
    Object.keys(mockAsyncStorage).forEach((k) => delete mockAsyncStorage[k]);
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[test-token-abc]' });
    mockSetNotificationChannelAsync.mockResolvedValue(undefined);
    mockRegisterPushToken.mockResolvedValue(undefined);
  });

  describe('Initial state', () => {
    it('starts with undetermined permission', () => {
      const { getByTestId } = renderNotif();
      expect(getByTestId('permission').props.children).toBe('undetermined');
    });

    it('starts with no push token', () => {
      const { getByTestId } = renderNotif();
      expect(getByTestId('token').props.children).toBe('');
    });

    it('starts with 0 badge count', () => {
      const { getByTestId } = renderNotif();
      expect(getByTestId('badge').props.children).toBe(0);
    });

    it('has default preferences', () => {
      const { getByTestId } = renderNotif();
      expect(getByTestId('pref-orders').props.children).toBe('true');
      expect(getByTestId('pref-promos').props.children).toBe('true');
      expect(getByTestId('pref-stock').props.children).toBe('true');
      expect(getByTestId('pref-cart').props.children).toBe('false');
    });
  });

  describe('Request permission', () => {
    it('grants permission and sets token via expo-notifications', async () => {
      const { getByTestId } = renderNotif();
      fireEvent.press(getByTestId('request'));
      await waitFor(() => {
        expect(getByTestId('permission').props.children).toBe('granted');
      });
      expect(mockRequestPermissionsAsync).toHaveBeenCalled();
      expect(mockGetExpoPushTokenAsync).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'test-project-id' }),
      );
      expect(getByTestId('token').props.children).toBe('ExponentPushToken[test-token-abc]');
    });

    it('sets denied status when permission refused', async () => {
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const { getByTestId } = renderNotif();
      fireEvent.press(getByTestId('request'));
      await waitFor(() => {
        expect(getByTestId('permission').props.children).toBe('denied');
      });
      // Should not attempt to get token when denied
      expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
      expect(getByTestId('token').props.children).toBe('');
    });

    it('skips re-prompt if already granted', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });

      const { getByTestId } = renderNotif();
      fireEvent.press(getByTestId('request'));
      await waitFor(() => {
        expect(getByTestId('permission').props.children).toBe('granted');
      });
      // Should not re-prompt if already granted
      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
      expect(mockGetExpoPushTokenAsync).toHaveBeenCalled();
    });
  });

  describe('Android notification channels', () => {
    const originalOS = Platform.OS;

    afterEach(() => {
      (Platform as any).OS = originalOS;
    });

    it('creates all notification channels on Android when requesting permission', async () => {
      (Platform as any).OS = 'android';

      const { getByTestId } = renderNotif();
      fireEvent.press(getByTestId('request'));

      await waitFor(() => {
        expect(getByTestId('permission').props.children).toBe('granted');
      });

      // Should create one channel per notification type
      const channelConfigs = Object.values(ANDROID_CHANNEL_CONFIG);
      expect(mockSetNotificationChannelAsync).toHaveBeenCalledTimes(channelConfigs.length);

      for (const channel of channelConfigs) {
        expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(channel.id, {
          name: channel.name,
          description: channel.description,
          importance: channel.importance,
        });
      }
    });

    it('creates channels with correct importance levels', async () => {
      (Platform as any).OS = 'android';

      const { getByTestId } = renderNotif();
      fireEvent.press(getByTestId('request'));

      await waitFor(() => {
        expect(getByTestId('permission').props.children).toBe('granted');
      });

      // orders = HIGH (4), promotions = DEFAULT (3), back-in-stock = DEFAULT (3), cart-reminders = LOW (2)
      expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith('orders', expect.objectContaining({ importance: 4 }));
      expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith('promotions', expect.objectContaining({ importance: 3 }));
      expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith('back-in-stock', expect.objectContaining({ importance: 3 }));
      expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith('cart-reminders', expect.objectContaining({ importance: 2 }));
    });

    it('does not create channels on iOS', async () => {
      (Platform as any).OS = 'ios';

      const { getByTestId } = renderNotif();
      fireEvent.press(getByTestId('request'));

      await waitFor(() => {
        expect(getByTestId('permission').props.children).toBe('granted');
      });

      expect(mockSetNotificationChannelAsync).not.toHaveBeenCalled();
    });
  });

  describe('Notification listeners', () => {
    it('sets up received and response listeners on mount', () => {
      renderNotif();
      expect(mockAddNotificationReceivedListener).toHaveBeenCalledTimes(1);
      expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalledTimes(1);
    });

    it('removes listeners on unmount', () => {
      const { unmount } = renderNotif();
      unmount();
      expect(mockRemoveReceived).toHaveBeenCalled();
      expect(mockRemoveResponse).toHaveBeenCalled();
    });

    it('increments badge on foreground notification received', async () => {
      const { getByTestId } = renderNotif();

      // Get the received listener callback
      const receivedCallback = mockAddNotificationReceivedListener.mock.calls[0][0];

      // Simulate receiving a notification
      await waitFor(() => {
        receivedCallback({
          request: {
            content: {
              data: { type: 'order_update', orderId: 'ord-123' },
            },
          },
        });
      });

      await waitFor(() => {
        expect(getByTestId('badge').props.children).toBe(1);
      });
    });

    it('navigates via deep link when notification tapped', async () => {
      renderNotif();

      // Get the response listener callback
      const responseCallback = mockAddNotificationResponseReceivedListener.mock.calls[0][0];

      // Simulate tapping notification
      await waitFor(() => {
        responseCallback({
          actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
          notification: {
            request: {
              content: {
                data: { type: 'order_update', orderId: 'ord-456' },
              },
            },
          },
        });
      });

      expect(Linking.openURL).toHaveBeenCalledWith('carolinafutons://orders/ord-456');
    });
  });

  describe('Toggle preferences', () => {
    it('toggles orderUpdates off', () => {
      const { getByTestId } = renderNotif();
      expect(getByTestId('pref-orders').props.children).toBe('true');
      fireEvent.press(getByTestId('toggle-orders'));
      expect(getByTestId('pref-orders').props.children).toBe('false');
    });

    it('toggles cartReminders on', () => {
      const { getByTestId } = renderNotif();
      expect(getByTestId('pref-cart').props.children).toBe('false');
      fireEvent.press(getByTestId('toggle-cart'));
      expect(getByTestId('pref-cart').props.children).toBe('true');
    });

    it('toggles back and forth', () => {
      const { getByTestId } = renderNotif();
      fireEvent.press(getByTestId('toggle-orders'));
      expect(getByTestId('pref-orders').props.children).toBe('false');
      fireEvent.press(getByTestId('toggle-orders'));
      expect(getByTestId('pref-orders').props.children).toBe('true');
    });
  });

  describe('Badge count', () => {
    it('sets badge count', () => {
      const { getByTestId } = renderNotif();
      fireEvent.press(getByTestId('set-badge-5'));
      expect(getByTestId('badge').props.children).toBe(5);
    });

    it('clears badge count', () => {
      const { getByTestId } = renderNotif();
      fireEvent.press(getByTestId('set-badge-5'));
      fireEvent.press(getByTestId('clear-badge'));
      expect(getByTestId('badge').props.children).toBe(0);
    });
  });

  describe('Mount-time permission sync', () => {
    it('syncs granted permission status on mount', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });

      const { getByTestId } = renderNotif();
      await waitFor(() => {
        expect(getByTestId('permission').props.children).toBe('granted');
      });
      expect(getByTestId('token').props.children).toBe('ExponentPushToken[test-token-abc]');
    });

    it('syncs denied permission status on mount', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const { getByTestId } = renderNotif();
      await waitFor(() => {
        expect(getByTestId('permission').props.children).toBe('denied');
      });
    });

    it('stays undetermined when permission is undetermined', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });

      const { getByTestId } = renderNotif();
      // Give the mount effect time to run
      await act(async () => {});
      expect(getByTestId('permission').props.children).toBe('undetermined');
    });
  });

  describe('Preference persistence', () => {
    it('saves preferences to AsyncStorage on toggle', async () => {
      const { getByTestId } = renderNotif();
      await act(async () => {});

      fireEvent.press(getByTestId('toggle-orders'));

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          '@notification_preferences',
          expect.stringContaining('"orderUpdates":false'),
        );
      });
    });

    it('restores saved preferences on mount', async () => {
      mockAsyncStorage['@notification_preferences'] = JSON.stringify({
        orderUpdates: false,
        promotions: true,
        backInStock: false,
        cartReminders: true,
      });

      const { getByTestId } = renderNotif();
      await waitFor(() => {
        expect(getByTestId('pref-orders').props.children).toBe('false');
      });
      expect(getByTestId('pref-cart').props.children).toBe('true');
      expect(getByTestId('pref-stock').props.children).toBe('false');
    });
  });

  describe('Token refresh', () => {
    it('sets up push token listener on mount', () => {
      renderNotif();
      expect(mockAddPushTokenListener).toHaveBeenCalledTimes(1);
    });

    it('removes push token listener on unmount', () => {
      const { unmount } = renderNotif();
      unmount();
      expect(mockRemoveTokenListener).toHaveBeenCalled();
    });

    it('re-registers when push token changes', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
      const { getByTestId } = renderNotif();

      await waitFor(() => {
        expect(getByTestId('token').props.children).toBe('ExponentPushToken[test-token-abc]');
      });

      // Clear the initial registration call
      mockRegisterPushToken.mockClear();

      // Simulate token refresh from OS
      const tokenCallback = mockAddPushTokenListener.mock.calls[0][0];
      await act(async () => {
        tokenCallback({ data: 'ExponentPushToken[new-refreshed-token]' });
      });

      await waitFor(() => {
        expect(getByTestId('token').props.children).toBe('ExponentPushToken[new-refreshed-token]');
      });
      expect(mockRegisterPushToken).toHaveBeenCalledWith('ExponentPushToken[new-refreshed-token]');
    });

    it('does not re-register when token is unchanged', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
      const { getByTestId } = renderNotif();

      await waitFor(() => {
        expect(getByTestId('token').props.children).toBe('ExponentPushToken[test-token-abc]');
      });

      mockRegisterPushToken.mockClear();

      // Simulate token event with same token
      const tokenCallback = mockAddPushTokenListener.mock.calls[0][0];
      await act(async () => {
        tokenCallback({ data: 'ExponentPushToken[test-token-abc]' });
      });

      expect(mockRegisterPushToken).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('throws outside provider', () => {
      function Bad() {
        useNotifications();
        return null;
      }
      expect(() => render(<Bad />)).toThrow(
        'useNotifications must be used within a NotificationProvider',
      );
    });

    it('reports to crash reporting when mount-time token registration fails', async () => {
      const registrationError = new Error('Push token registration failed: 500');
      mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockRegisterPushToken.mockRejectedValue(registrationError);

      renderNotif();
      await waitFor(() => {
        expect(mockCaptureException).toHaveBeenCalledWith(registrationError);
      });
    });

    it('reports to crash reporting when requestPermission token registration fails', async () => {
      const registrationError = new Error('Push token registration failed: 500');
      mockRegisterPushToken.mockRejectedValue(registrationError);

      const { getByTestId } = renderNotif();
      fireEvent.press(getByTestId('request'));

      await waitFor(() => {
        expect(mockCaptureException).toHaveBeenCalledWith(registrationError);
      });
    });

    it('reports to crash reporting when already-granted requestPermission token registration fails', async () => {
      const registrationError = new Error('Push token registration failed: 500');
      mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockRegisterPushToken.mockRejectedValue(registrationError);

      const { getByTestId } = renderNotif();
      // Wait for mount-time registration to fail first
      await waitFor(() => {
        expect(mockCaptureException).toHaveBeenCalledTimes(1);
      });

      mockCaptureException.mockClear();
      fireEvent.press(getByTestId('request'));

      await waitFor(() => {
        expect(mockCaptureException).toHaveBeenCalledWith(registrationError);
      });
    });
  });
});
