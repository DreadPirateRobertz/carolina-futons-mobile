import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NotificationProvider, useNotifications } from '../useNotifications';

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
    it('grants permission and sets token', async () => {
      const { getByTestId } = renderNotif();
      fireEvent.press(getByTestId('request'));
      await waitFor(() => {
        expect(getByTestId('permission').props.children).toBe('granted');
      });
      expect(getByTestId('token').props.children).toContain('ExponentPushToken');
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
  });
});
