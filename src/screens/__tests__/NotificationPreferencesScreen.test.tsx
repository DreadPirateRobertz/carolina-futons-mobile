import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NotificationPreferencesScreen } from '../NotificationPreferencesScreen';
import { NotificationProvider } from '@/hooks/useNotifications';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { darkPalette, typography } from '@/theme/tokens';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'undetermined' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  setBadgeCountAsync: jest.fn().mockResolvedValue(true),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { MAX: 5 },
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
}));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
}));
jest.mock('@/hooks/useNotificationStorage', () => ({
  useNotificationStorage: () => ({
    preferences: {
      orderUpdates: true,
      promotions: true,
      backInStock: true,
      cartReminders: false,
      streakMilestone: true,
      questComplete: true,
      dailySpinReminder: false,
    },
    isLoading: false,
    savePreferences: jest.fn().mockResolvedValue(undefined),
  }),
}));

const mockToggle = jest.fn().mockResolvedValue(undefined);
const mockUseNotificationPreferences = jest.fn();
jest.mock('@/hooks/useNotificationPreferences', () => ({
  useNotificationPreferences: (...args: unknown[]) => mockUseNotificationPreferences(...args),
}));

const defaultGamifPrefs = {
  preferences: {
    orderUpdates: true,
    promotions: true,
    backInStock: true,
    cartReminders: false,
    streakMilestone: true,
    questComplete: true,
    dailySpinReminder: false,
  },
  toggle: mockToggle,
  isPushSupported: true,
  isLoading: false,
  isSaving: false,
  error: null,
};

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
  beforeEach(() => {
    mockUseNotificationPreferences.mockReturnValue(defaultGamifPrefs);
  });

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

  describe('Visual polish — consistent styling', () => {
    it('uses dark editorial background', () => {
      const { getByTestId } = renderNotifPrefs();
      const screen = getByTestId('notification-prefs-screen');
      const flat = [screen.props.style]
        .flat(Infinity)
        .reduce(
          (acc: Record<string, unknown>, s: Record<string, unknown> | undefined) =>
            s ? { ...acc, ...s } : acc,
          {},
        );
      expect(flat.backgroundColor).toBe(darkPalette.background);
    });

    it('header uses heading fontFamily', () => {
      const { getByTestId } = renderNotifPrefs();
      const header = getByTestId('notif-prefs-header');
      const styles = Array.isArray(header.props.style)
        ? Object.assign({}, ...header.props.style)
        : header.props.style;
      expect(styles.fontFamily).toBe(typography.headingFamily);
    });

    it('header uses light text on dark bg', () => {
      const { getByTestId } = renderNotifPrefs();
      const header = getByTestId('notif-prefs-header');
      const styles = Array.isArray(header.props.style)
        ? Object.assign({}, ...header.props.style)
        : header.props.style;
      expect(styles.color).toBe(darkPalette.textPrimary);
    });

    it('preference rows use dark surface background', () => {
      const { getByTestId } = renderNotifPrefs();
      const row = getByTestId('pref-row-order_update');
      const flat = [row.props.style]
        .flat(Infinity)
        .reduce(
          (acc: Record<string, unknown>, s: Record<string, unknown> | undefined) =>
            s ? { ...acc, ...s } : acc,
          {},
        );
      expect(flat.backgroundColor).toBe(darkPalette.surface);
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
      expect(getByTestId('enable-notifications-button').props.accessibilityLabel).toBe(
        'Enable push notifications',
      );
    });
  });

  describe('Gamification notifications', () => {
    describe('rendering', () => {
      it('renders gamification section header', () => {
        const { getByTestId } = renderNotifPrefs();
        expect(getByTestId('gamification-section-header')).toBeTruthy();
      });

      it('renders streak milestone toggle row', () => {
        const { getByTestId } = renderNotifPrefs();
        expect(getByTestId('pref-row-streak_milestone')).toBeTruthy();
      });

      it('renders quest complete toggle row', () => {
        const { getByTestId } = renderNotifPrefs();
        expect(getByTestId('pref-row-quest_complete')).toBeTruthy();
      });

      it('renders daily spin reminder toggle row', () => {
        const { getByTestId } = renderNotifPrefs();
        expect(getByTestId('pref-row-daily_spin_reminder')).toBeTruthy();
      });

      it('renders all three gamification toggle switches', () => {
        const { getByTestId } = renderNotifPrefs();
        expect(getByTestId('pref-toggle-streak_milestone')).toBeTruthy();
        expect(getByTestId('pref-toggle-quest_complete')).toBeTruthy();
        expect(getByTestId('pref-toggle-daily_spin_reminder')).toBeTruthy();
      });
    });

    describe('initial values', () => {
      it('streak milestone toggle starts enabled', () => {
        const { getByTestId } = renderNotifPrefs();
        expect(getByTestId('pref-toggle-streak_milestone').props.value).toBe(true);
      });

      it('quest complete toggle starts enabled', () => {
        const { getByTestId } = renderNotifPrefs();
        expect(getByTestId('pref-toggle-quest_complete').props.value).toBe(true);
      });

      it('daily spin reminder toggle starts disabled', () => {
        const { getByTestId } = renderNotifPrefs();
        expect(getByTestId('pref-toggle-daily_spin_reminder').props.value).toBe(false);
      });
    });

    describe('toggle interactions', () => {
      it('calls toggle with streakMilestone when pressed', async () => {
        const { getByTestId } = renderNotifPrefs();
        fireEvent(getByTestId('pref-toggle-streak_milestone'), 'valueChange', false);
        expect(mockToggle).toHaveBeenCalledWith('streakMilestone');
      });

      it('calls toggle with questComplete when pressed', async () => {
        const { getByTestId } = renderNotifPrefs();
        fireEvent(getByTestId('pref-toggle-quest_complete'), 'valueChange', false);
        expect(mockToggle).toHaveBeenCalledWith('questComplete');
      });

      it('calls toggle with dailySpinReminder when pressed', async () => {
        const { getByTestId } = renderNotifPrefs();
        fireEvent(getByTestId('pref-toggle-daily_spin_reminder'), 'valueChange', true);
        expect(mockToggle).toHaveBeenCalledWith('dailySpinReminder');
      });
    });

    describe('error state', () => {
      it('shows error message when toggle fails', () => {
        mockUseNotificationPreferences.mockReturnValueOnce({
          ...defaultGamifPrefs,
          error: new Error('Failed to save preferences'),
        });
        const { getByTestId } = renderNotifPrefs();
        expect(getByTestId('gamification-prefs-error')).toBeTruthy();
      });
    });

    describe('graceful handling when push not supported', () => {
      it('disables gamification toggles when isPushSupported is false', () => {
        mockUseNotificationPreferences.mockReturnValueOnce({
          ...defaultGamifPrefs,
          isPushSupported: false,
        });
        const { getByTestId } = renderNotifPrefs();
        expect(getByTestId('pref-toggle-streak_milestone').props.disabled).toBe(true);
        expect(getByTestId('pref-toggle-quest_complete').props.disabled).toBe(true);
        expect(getByTestId('pref-toggle-daily_spin_reminder').props.disabled).toBe(true);
      });
    });
  });
});
