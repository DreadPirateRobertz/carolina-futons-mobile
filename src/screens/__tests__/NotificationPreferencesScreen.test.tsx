import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NotificationPreferencesScreen } from '../NotificationPreferencesScreen';
import { NotificationProvider } from '@/hooks/useNotifications';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderNotifPrefs(
  props: Partial<React.ComponentProps<typeof NotificationPreferencesScreen>> = {},
) {
  return render(
    <ThemeProvider>
      <NotificationProvider>
        <NotificationPreferencesScreen {...props} />
      </NotificationProvider>
    </ThemeProvider>,
  );
}

describe('NotificationPreferencesScreen', () => {
  describe('Rendering', () => {
    it('renders with default testID', () => {
      const { getByTestId } = renderNotifPrefs();
      expect(getByTestId('notification-prefs-screen')).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = renderNotifPrefs({ testID: 'my-notif' });
      expect(getByTestId('my-notif')).toBeTruthy();
    });

    it('shows header', () => {
      const { getByTestId } = renderNotifPrefs();
      expect(getByTestId('notif-prefs-header')).toBeTruthy();
    });
  });

  describe('Permission prompt', () => {
    it('shows permission prompt when undetermined', () => {
      const { getByTestId } = renderNotifPrefs();
      expect(getByTestId('permission-prompt')).toBeTruthy();
    });

    it('shows enable button', () => {
      const { getByTestId } = renderNotifPrefs();
      expect(getByTestId('enable-notifications-button')).toBeTruthy();
    });

    it('hides permission prompt after granting', async () => {
      const { getByTestId, queryByTestId } = renderNotifPrefs();
      fireEvent.press(getByTestId('enable-notifications-button'));
      await waitFor(() => {
        expect(queryByTestId('permission-prompt')).toBeNull();
      });
    });
  });

  describe('Preference toggles', () => {
    it('renders all preference rows', () => {
      const { getByTestId } = renderNotifPrefs();
      expect(getByTestId('pref-row-order_update')).toBeTruthy();
      expect(getByTestId('pref-row-promotion')).toBeTruthy();
      expect(getByTestId('pref-row-back_in_stock')).toBeTruthy();
      expect(getByTestId('pref-row-cart_reminder')).toBeTruthy();
    });

    it('renders toggle switches', () => {
      const { getByTestId } = renderNotifPrefs();
      expect(getByTestId('pref-toggle-order_update')).toBeTruthy();
      expect(getByTestId('pref-toggle-promotion')).toBeTruthy();
      expect(getByTestId('pref-toggle-back_in_stock')).toBeTruthy();
      expect(getByTestId('pref-toggle-cart_reminder')).toBeTruthy();
    });

    it('order updates toggle starts enabled', () => {
      const { getByTestId } = renderNotifPrefs();
      expect(getByTestId('pref-toggle-order_update').props.value).toBe(true);
    });

    it('cart reminders toggle starts disabled', () => {
      const { getByTestId } = renderNotifPrefs();
      expect(getByTestId('pref-toggle-cart_reminder').props.value).toBe(false);
    });

    it('toggles a preference when switch pressed', () => {
      const { getByTestId } = renderNotifPrefs();
      const toggle = getByTestId('pref-toggle-order_update');
      expect(toggle.props.value).toBe(true);
      fireEvent(toggle, 'valueChange', false);
      expect(getByTestId('pref-toggle-order_update').props.value).toBe(false);
    });
  });

  describe('Back button', () => {
    it('renders back button when onBack provided', () => {
      const { getByTestId } = renderNotifPrefs({ onBack: jest.fn() });
      expect(getByTestId('notif-prefs-back')).toBeTruthy();
    });

    it('does not render back when onBack not provided', () => {
      const { queryByTestId } = renderNotifPrefs();
      expect(queryByTestId('notif-prefs-back')).toBeNull();
    });

    it('calls onBack when pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = renderNotifPrefs({ onBack });
      fireEvent.press(getByTestId('notif-prefs-back'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('toggles have accessibility labels', () => {
      const { getByTestId } = renderNotifPrefs();
      const toggle = getByTestId('pref-toggle-order_update');
      expect(toggle.props.accessibilityLabel).toContain('Order Updates');
      expect(toggle.props.accessibilityRole).toBe('switch');
    });

    it('enable button has accessibility label', () => {
      const { getByTestId } = renderNotifPrefs();
      expect(
        getByTestId('enable-notifications-button').props.accessibilityLabel,
      ).toBe('Enable push notifications');
    });
  });
});
