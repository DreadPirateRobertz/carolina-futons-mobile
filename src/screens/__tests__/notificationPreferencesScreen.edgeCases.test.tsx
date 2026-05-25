/**
 * NotificationPreferencesScreen deeper edge-case tests — cm-svj
 *
 * Covers gaps in notificationPreferencesScreen.test.tsx:
 * - Individual category toggle interactions (all 9 notification types)
 * - Toggle state persistence (UI reflects updated preferences on re-render)
 * - All-on state (all preferences simultaneously true)
 * - Permission denied flow — text content, core toggles remain usable
 * - Network error on save + error clearing behavior
 * - Optimistic UI rollback (error banner shown; user can retry)
 * - isSaving disabled + accessibility state on gamification toggles
 * - Missing prefKey graceful handling (priceDropAlerts, cartRecovery undefined)
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NotificationPreferencesScreen } from '../NotificationPreferencesScreen';
import { NotificationProvider } from '@/hooks/useNotifications';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Mocks ─────────────────────────────────────────────────────────────────────

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
      priceDropAlerts: true,
      cartReminders: false,
      cartRecovery: false,
      streakMilestone: true,
      questComplete: true,
      dailySpinReminder: false,
    },
    isLoading: false,
    savePreferences: jest.fn().mockResolvedValue(undefined),
  }),
}));

const mockTogglePreference = jest.fn();
const mockRequestPermission = jest.fn().mockResolvedValue(undefined);
const mockUseNotifications = jest.fn();
jest.mock('@/hooks/useNotifications', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => children,
  useNotifications: (...args: unknown[]) => mockUseNotifications(...args),
}));

const mockToggle = jest.fn().mockResolvedValue(undefined);
const mockUseNotificationPreferences = jest.fn();
jest.mock('@/hooks/useNotificationPreferences', () => ({
  useNotificationPreferences: (...args: unknown[]) => mockUseNotificationPreferences(...args),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const allPreferencesOn = {
  orderUpdates: true,
  promotions: true,
  backInStock: true,
  priceDropAlerts: true,
  cartReminders: true,
  cartRecovery: true,
  streakMilestone: true,
  questComplete: true,
  dailySpinReminder: true,
};

const defaultNotifContext = {
  permissionStatus: 'undetermined' as const,
  pushToken: null,
  preferences: {
    orderUpdates: true,
    promotions: true,
    backInStock: true,
    priceDropAlerts: true,
    cartReminders: false,
    cartRecovery: false,
    streakMilestone: true,
    questComplete: true,
    dailySpinReminder: false,
  },
  badgeCount: 0,
  requestPermission: mockRequestPermission,
  togglePreference: mockTogglePreference,
  setPreferences: jest.fn(),
  setBadgeCount: jest.fn(),
  clearBadge: jest.fn(),
};

const defaultGamifPrefs = {
  preferences: {
    orderUpdates: true,
    promotions: true,
    backInStock: true,
    priceDropAlerts: true,
    cartReminders: false,
    cartRecovery: false,
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

// ── Helper ────────────────────────────────────────────────────────────────────

function renderNotifPrefs(
  props: Partial<React.ComponentProps<typeof NotificationPreferencesScreen>> = {},
) {
  const ui = (p: typeof props = {}) => (
    <ThemeProvider>
      <NotificationProvider>
        <NotificationPreferencesScreen {...p} />
      </NotificationProvider>
    </ThemeProvider>
  );
  const result = render(ui(props));
  return {
    ...result,
    rerender: (newProps: typeof props = {}) => result.rerender(ui(newProps)),
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseNotifications.mockReturnValue(defaultNotifContext);
  mockUseNotificationPreferences.mockReturnValue(defaultGamifPrefs);
});

// ── Individual category toggle interactions ───────────────────────────────────

describe('individual category toggle interactions', () => {
  it('promotions toggle calls togglePreference with "promotions"', () => {
    const { getByTestId } = renderNotifPrefs();
    fireEvent(getByTestId('pref-toggle-promotion'), 'valueChange', false);
    expect(mockTogglePreference).toHaveBeenCalledWith('promotions');
  });

  it('backInStock toggle calls togglePreference with "backInStock"', () => {
    const { getByTestId } = renderNotifPrefs();
    fireEvent(getByTestId('pref-toggle-back_in_stock'), 'valueChange', false);
    expect(mockTogglePreference).toHaveBeenCalledWith('backInStock');
  });

  it('priceDropAlerts toggle calls togglePreference with "priceDropAlerts"', () => {
    const { getByTestId } = renderNotifPrefs();
    fireEvent(getByTestId('pref-toggle-price_drop'), 'valueChange', false);
    expect(mockTogglePreference).toHaveBeenCalledWith('priceDropAlerts');
  });

  it('cartReminders toggle calls togglePreference with "cartReminders"', () => {
    const { getByTestId } = renderNotifPrefs();
    fireEvent(getByTestId('pref-toggle-cart_reminder'), 'valueChange', true);
    expect(mockTogglePreference).toHaveBeenCalledWith('cartReminders');
  });

  it('cartRecovery toggle calls togglePreference with "cartRecovery"', () => {
    const { getByTestId } = renderNotifPrefs();
    fireEvent(getByTestId('pref-toggle-cart_recovery'), 'valueChange', true);
    expect(mockTogglePreference).toHaveBeenCalledWith('cartRecovery');
  });

  it('price_drop toggle initial value reflects priceDropAlerts preference', () => {
    mockUseNotifications.mockReturnValue({
      ...defaultNotifContext,
      preferences: { ...defaultNotifContext.preferences, priceDropAlerts: true },
    });
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-price_drop').props.value).toBe(true);
  });

  it('cart_recovery toggle initial value reflects cartRecovery preference', () => {
    mockUseNotifications.mockReturnValue({
      ...defaultNotifContext,
      preferences: { ...defaultNotifContext.preferences, cartRecovery: true },
    });
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-cart_recovery').props.value).toBe(true);
  });
});

// ── Toggle state persistence ──────────────────────────────────────────────────

describe('toggle state persistence', () => {
  it('order_update toggle reflects preference turned off on re-render', () => {
    const { getByTestId, rerender } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-order_update').props.value).toBe(true);

    mockUseNotifications.mockReturnValue({
      ...defaultNotifContext,
      preferences: { ...defaultNotifContext.preferences, orderUpdates: false },
    });
    rerender();

    expect(getByTestId('pref-toggle-order_update').props.value).toBe(false);
  });

  it('promotions toggle reflects preference turned off on re-render', () => {
    const { getByTestId, rerender } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-promotion').props.value).toBe(true);

    mockUseNotifications.mockReturnValue({
      ...defaultNotifContext,
      preferences: { ...defaultNotifContext.preferences, promotions: false },
    });
    rerender();

    expect(getByTestId('pref-toggle-promotion').props.value).toBe(false);
  });

  it('gamification streak toggle reflects preference turned off on re-render', () => {
    const { getByTestId, rerender } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-streak_milestone').props.value).toBe(true);

    mockUseNotificationPreferences.mockReturnValue({
      ...defaultGamifPrefs,
      preferences: { ...defaultGamifPrefs.preferences, streakMilestone: false },
    });
    rerender();

    expect(getByTestId('pref-toggle-streak_milestone').props.value).toBe(false);
  });

  it('cartReminders toggle reflects preference turned on on re-render', () => {
    const { getByTestId, rerender } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-cart_reminder').props.value).toBe(false);

    mockUseNotifications.mockReturnValue({
      ...defaultNotifContext,
      preferences: { ...defaultNotifContext.preferences, cartReminders: true },
    });
    rerender();

    expect(getByTestId('pref-toggle-cart_reminder').props.value).toBe(true);
  });
});

// ── All-on state ──────────────────────────────────────────────────────────────

describe('all-on state', () => {
  it('all core notification toggles show true when all preferences enabled', () => {
    mockUseNotifications.mockReturnValue({
      ...defaultNotifContext,
      preferences: allPreferencesOn,
    });
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-order_update').props.value).toBe(true);
    expect(getByTestId('pref-toggle-promotion').props.value).toBe(true);
    expect(getByTestId('pref-toggle-back_in_stock').props.value).toBe(true);
    expect(getByTestId('pref-toggle-price_drop').props.value).toBe(true);
    expect(getByTestId('pref-toggle-cart_reminder').props.value).toBe(true);
    expect(getByTestId('pref-toggle-cart_recovery').props.value).toBe(true);
  });

  it('all gamification toggles show true when all gamif preferences enabled', () => {
    mockUseNotificationPreferences.mockReturnValue({
      ...defaultGamifPrefs,
      preferences: allPreferencesOn,
    });
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-streak_milestone').props.value).toBe(true);
    expect(getByTestId('pref-toggle-quest_complete').props.value).toBe(true);
    expect(getByTestId('pref-toggle-daily_spin_reminder').props.value).toBe(true);
  });
});

// ── Permission denied flow ────────────────────────────────────────────────────

describe('permission denied flow', () => {
  beforeEach(() => {
    mockUseNotifications.mockReturnValue({
      ...defaultNotifContext,
      permissionStatus: 'denied',
    });
  });

  it('denied note shows exact guidance text', () => {
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('permission-denied-note').props.children).toBe(
      'Notifications are blocked. Enable them in your device settings.',
    );
  });

  it('core preference toggles are still visible when permission is denied', () => {
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-order_update')).toBeTruthy();
    expect(getByTestId('pref-toggle-promotion')).toBeTruthy();
    expect(getByTestId('pref-toggle-back_in_stock')).toBeTruthy();
    expect(getByTestId('pref-toggle-cart_reminder')).toBeTruthy();
  });

  it('core preference toggles still fire when permission is denied', () => {
    const { getByTestId } = renderNotifPrefs();
    fireEvent(getByTestId('pref-toggle-order_update'), 'valueChange', false);
    expect(mockTogglePreference).toHaveBeenCalledWith('orderUpdates');
  });

  it('enable button has accessibilityRole button when denied', () => {
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('enable-notifications-button').props.accessibilityRole).toBe('button');
  });

  it('requestPermission is called when enable button pressed even when denied', () => {
    const { getByTestId } = renderNotifPrefs();
    fireEvent.press(getByTestId('enable-notifications-button'));
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });
});

// ── Network error on save ─────────────────────────────────────────────────────

describe('network error on save', () => {
  it('gamification error banner is shown when error is set', () => {
    mockUseNotificationPreferences.mockReturnValue({
      ...defaultGamifPrefs,
      error: new Error('Network unavailable'),
    });
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('gamification-prefs-error')).toBeTruthy();
  });

  it('error banner clears when hook returns error null on re-render', () => {
    mockUseNotificationPreferences.mockReturnValue({
      ...defaultGamifPrefs,
      error: new Error('Network unavailable'),
    });
    const { queryByTestId, rerender } = renderNotifPrefs();
    expect(queryByTestId('gamification-prefs-error')).toBeTruthy();

    mockUseNotificationPreferences.mockReturnValue({ ...defaultGamifPrefs, error: null });
    rerender();

    expect(queryByTestId('gamification-prefs-error')).toBeNull();
  });

  it('gamification toggles remain enabled after error (user can retry)', () => {
    mockUseNotificationPreferences.mockReturnValue({
      ...defaultGamifPrefs,
      isSaving: false,
      isPushSupported: true,
      error: new Error('Network unavailable'),
    });
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-streak_milestone').props.disabled).toBeFalsy();
  });
});

// ── Optimistic UI rollback ────────────────────────────────────────────────────

describe('optimistic UI rollback', () => {
  it('gamification toggle reflects pre-toggle value in preferences during isSaving', () => {
    // While isSaving=true, the preferences value passed to the toggle is the current (not-yet-saved) value.
    // The UI shows whatever `preferences` returns from the hook — verifying no silent state mutation.
    mockUseNotificationPreferences.mockReturnValue({
      ...defaultGamifPrefs,
      isSaving: true,
      preferences: { ...defaultGamifPrefs.preferences, streakMilestone: true },
    });
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-streak_milestone').props.value).toBe(true);
  });

  it('gamification toggle shows reverted value when error set and isSaving false', () => {
    // Simulates: user toggled → save failed → hook reverts prefs and sets error
    mockUseNotificationPreferences.mockReturnValue({
      ...defaultGamifPrefs,
      isSaving: false,
      preferences: { ...defaultGamifPrefs.preferences, streakMilestone: true },
      error: new Error('Failed to save preferences'),
    });
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-streak_milestone').props.value).toBe(true);
    expect(getByTestId('gamification-prefs-error')).toBeTruthy();
  });
});

// ── isSaving disabled state ───────────────────────────────────────────────────

describe('isSaving disabled state', () => {
  it('all gamification toggles have disabled accessibilityState when isSaving', () => {
    mockUseNotificationPreferences.mockReturnValue({
      ...defaultGamifPrefs,
      isSaving: true,
    });
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-streak_milestone').props.accessibilityState?.disabled).toBe(
      true,
    );
    expect(getByTestId('pref-toggle-quest_complete').props.accessibilityState?.disabled).toBe(true);
    expect(getByTestId('pref-toggle-daily_spin_reminder').props.accessibilityState?.disabled).toBe(
      true,
    );
  });

  it('core notification toggles are NOT disabled when isSaving is true', () => {
    // isSaving only gates gamification toggles; core toggles are always interactive
    mockUseNotificationPreferences.mockReturnValue({
      ...defaultGamifPrefs,
      isSaving: true,
    });
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-order_update').props.disabled).toBeFalsy();
    expect(getByTestId('pref-toggle-promotion').props.disabled).toBeFalsy();
  });
});

// ── Missing prefKey graceful handling ─────────────────────────────────────────

describe('missing prefKey graceful handling', () => {
  it('price_drop toggle renders as false when priceDropAlerts is undefined', () => {
    // preferences object missing priceDropAlerts → undefined → falsy → value=false
    const prefsWithoutPriceDrop = { ...defaultNotifContext.preferences } as Record<string, unknown>;
    delete prefsWithoutPriceDrop.priceDropAlerts;
    mockUseNotifications.mockReturnValue({
      ...defaultNotifContext,
      preferences: prefsWithoutPriceDrop,
    });
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-price_drop').props.value).toBe(false);
  });

  it('cart_recovery toggle renders as false when cartRecovery is undefined', () => {
    const prefsWithoutCartRecovery = { ...defaultNotifContext.preferences } as Record<
      string,
      unknown
    >;
    delete prefsWithoutCartRecovery.cartRecovery;
    mockUseNotifications.mockReturnValue({
      ...defaultNotifContext,
      preferences: prefsWithoutCartRecovery,
    });
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-cart_recovery').props.value).toBe(false);
  });
});

// ── Accessibility label reflects enabled/disabled state ───────────────────────

describe('toggle accessibility labels', () => {
  it('enabled core toggle accessibilityLabel contains "enabled"', () => {
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-order_update').props.accessibilityLabel).toContain('enabled');
  });

  it('disabled core toggle accessibilityLabel contains "disabled"', () => {
    // cartReminders starts false in defaultNotifContext.preferences
    const { getByTestId } = renderNotifPrefs();
    expect(getByTestId('pref-toggle-cart_reminder').props.accessibilityLabel).toContain('disabled');
  });

  it('gamification enabled toggle accessibilityLabel contains "enabled"', () => {
    const { getByTestId } = renderNotifPrefs();
    // streakMilestone=true in default
    expect(getByTestId('pref-toggle-streak_milestone').props.accessibilityLabel).toContain(
      'enabled',
    );
  });

  it('gamification disabled toggle accessibilityLabel contains "disabled"', () => {
    const { getByTestId } = renderNotifPrefs();
    // dailySpinReminder=false in default
    expect(getByTestId('pref-toggle-daily_spin_reminder').props.accessibilityLabel).toContain(
      'disabled',
    );
  });
});
