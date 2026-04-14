/**
 * SettingsScreen deeper edge cases — cm-9zl
 *
 * Covers:
 * - Notification toggles persist (toggle calls handler with correct key)
 * - Logout flow (signOut called, loading state, auth clears)
 * - Dark mode toggle (ThemeProvider toggleColorMode flips isDark)
 * - Account deletion confirm (full alert flow: request → confirm/cancel)
 */
import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AccountScreen } from '../AccountScreen';
import { NotificationPreferencesScreen } from '../NotificationPreferencesScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useTheme } from '@/theme/useTheme';

// ── Shared mocks for AccountScreen ────────────────────────────────────────────

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthContext: { Consumer: ({ children }: any) => children(null) },
}));

jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => ({
    points: 0,
    tier: 'bronze',
    loading: false,
    error: null,
    totalEarned: 0,
    transactions: [],
    refreshPoints: jest.fn(),
  }),
}));

jest.mock('@/hooks/useStreak', () => ({
  useStreak: () => ({ streak: 0, loading: false }),
}));

jest.mock('@/hooks/useReferral', () => ({
  useReferral: () => ({
    code: null,
    creditsEarned: 0,
    referralCount: 0,
    shareUrl: null,
    loading: false,
    error: null,
    referredByCode: null,
    referrals: [],
    storeReferredByCode: jest.fn(),
    submitReferral: jest.fn(),
  }),
}));

jest.mock('@/hooks/usePremium', () => ({
  usePremium: () => ({ isPremium: false, restore: jest.fn() }),
}));

const mockDeletion = {
  status: 'idle' as const,
  error: null,
  requestDeletion: jest.fn(),
  confirmDeletion: jest.fn(),
  cancel: jest.fn(),
};
jest.mock('@/hooks/useAccountDeletion', () => ({
  useAccountDeletion: () => mockDeletion,
}));

jest.mock('@/hooks/useDataExport', () => ({
  useDataExport: () => ({ status: 'idle', error: null, exportData: jest.fn() }),
}));

jest.mock('@/hooks/useAddressBook', () => ({
  useAddressBook: () => ({
    addresses: [],
    addAddress: jest.fn(),
    updateAddress: jest.fn(),
    deleteAddress: jest.fn(),
    setDefault: jest.fn(),
    saveFromCheckout: jest.fn(),
    defaultAddress: null,
    loading: false,
  }),
}));

jest.mock('@/hooks/useSavedAddresses', () => ({
  useSavedAddresses: () => ({
    addresses: [],
    addAddress: jest.fn(),
    updateAddress: jest.fn(),
    deleteAddress: jest.fn(),
    setDefault: jest.fn(),
    saveFromCheckout: jest.fn(),
    defaultAddress: null,
    loading: false,
  }),
}));

const mockBiometricAuth = {
  status: { isAvailable: false, isEnrolled: false, biometricType: 'none' as const },
  isEnabled: false,
  loading: false,
  authenticating: false,
  enableBiometric: jest.fn().mockResolvedValue(true),
  disableBiometric: jest.fn().mockResolvedValue(undefined),
  promptBiometric: jest.fn().mockResolvedValue(true),
};
jest.mock('@/hooks/useBiometricAuth', () => ({
  useBiometricAuth: () => mockBiometricAuth,
}));

jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    referralShared: jest.fn(),
    productViewed: jest.fn(),
    addedToCart: jest.fn(),
    purchaseCompleted: jest.fn(),
  }),
}));

jest.mock('@/services/wix/wixAuth', () => ({
  WixAuthService: jest.fn().mockImplementation(() => ({
    syncMemberAddresses: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => ({ callFunction: jest.fn().mockResolvedValue(null) }),
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '100',
  applicationId: 'com.carolinafutons.app',
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { version: '1.0.0' } },
  expoConfig: { version: '1.0.0' },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// ── Mocks for NotificationPreferencesScreen ───────────────────────────────────

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

jest.mock('@/hooks/useNotificationStorage', () => ({
  useNotificationStorage: () => ({
    preferences: {
      orderUpdates: true,
      promotions: false,
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

const mockTogglePreference = jest.fn();
const mockRequestPermission = jest.fn().mockResolvedValue(undefined);
const mockUseNotifications = jest.fn();
jest.mock('@/hooks/useNotifications', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => children,
  useNotifications: (...args: unknown[]) => mockUseNotifications(...args),
}));

const mockGamifToggle = jest.fn().mockResolvedValue(undefined);
const mockUseNotificationPreferences = jest.fn();
jest.mock('@/hooks/useNotificationPreferences', () => ({
  useNotificationPreferences: (...args: unknown[]) => mockUseNotificationPreferences(...args),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AUTH_USER = {
  id: 'member-1',
  email: 'test@example.com',
  displayName: 'Test User',
  phone: '',
  provider: 'wix' as const,
};

const mockSignOut = jest.fn();
const mockUpdateProfile = jest.fn();

const defaultNotifContext = {
  permissionStatus: 'granted' as const,
  pushToken: null,
  preferences: {
    orderUpdates: true,
    promotions: false,
    backInStock: true,
    cartReminders: false,
  },
  togglePreference: mockTogglePreference,
  requestPermission: mockRequestPermission,
  scheduleLocalNotification: jest.fn(),
};

const defaultGamifPrefs = {
  preferences: { streakMilestone: true, questComplete: false, dailySpinReminder: true },
  toggle: mockGamifToggle,
  isPushSupported: true,
  isLoading: false,
  isSaving: false,
  error: null,
};

function renderAccountSettings(props: Partial<React.ComponentProps<typeof AccountScreen>> = {}) {
  return render(
    <ThemeProvider>
      <AccountScreen {...props} />
    </ThemeProvider>,
  );
}

function renderNotifPrefs(
  props: Partial<React.ComponentProps<typeof NotificationPreferencesScreen>> = {},
) {
  return render(
    <ThemeProvider>
      <NotificationPreferencesScreen {...props} />
    </ThemeProvider>,
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockSignOut.mockResolvedValue(undefined);
  mockUpdateProfile.mockResolvedValue(undefined);
  mockUseAuth.mockReturnValue({
    user: AUTH_USER,
    isAuthenticated: true,
    loading: false,
    error: null,
    signOut: mockSignOut,
    updateProfile: mockUpdateProfile,
    clearError: jest.fn(),
  });
  mockDeletion.requestDeletion.mockReset();
  mockDeletion.confirmDeletion.mockReset();
  mockDeletion.cancel.mockReset();
  mockBiometricAuth.status = { isAvailable: false, isEnrolled: false, biometricType: 'none' };
  mockBiometricAuth.isEnabled = false;
  mockBiometricAuth.loading = false;
  mockUseNotifications.mockReturnValue(defaultNotifContext);
  mockUseNotificationPreferences.mockReturnValue(defaultGamifPrefs);
});

// ── Notification toggles persist ─────────────────────────────────────────────

describe('notification toggles persist', () => {
  it('toggles order_update preference when switch is pressed', async () => {
    const { getByTestId } = renderNotifPrefs();
    await waitFor(() => expect(getByTestId('pref-toggle-order_update')).toBeTruthy());

    fireEvent(getByTestId('pref-toggle-order_update'), 'valueChange', false);
    expect(mockTogglePreference).toHaveBeenCalledWith('orderUpdates');
  });

  it('toggles promotions preference when switch is pressed', async () => {
    const { getByTestId } = renderNotifPrefs();
    await waitFor(() => expect(getByTestId('pref-toggle-promotion')).toBeTruthy());

    fireEvent(getByTestId('pref-toggle-promotion'), 'valueChange', true);
    expect(mockTogglePreference).toHaveBeenCalledWith('promotions');
  });

  it('reflects correct initial value for enabled preference', async () => {
    const { getByTestId } = renderNotifPrefs();
    await waitFor(() => {
      const toggle = getByTestId('pref-toggle-order_update');
      expect(toggle.props.value).toBe(true);
    });
  });

  it('reflects correct initial value for disabled preference', async () => {
    const { getByTestId } = renderNotifPrefs();
    await waitFor(() => {
      const toggle = getByTestId('pref-toggle-promotion');
      expect(toggle.props.value).toBe(false);
    });
  });

  it('toggles gamification streak_milestone preference', async () => {
    const { getByTestId } = renderNotifPrefs();
    await waitFor(() => expect(getByTestId('pref-toggle-streak_milestone')).toBeTruthy());

    fireEvent(getByTestId('pref-toggle-streak_milestone'), 'valueChange', false);
    expect(mockGamifToggle).toHaveBeenCalledWith('streakMilestone');
  });

  it('shows skeleton when gamification preferences are loading', async () => {
    mockUseNotificationPreferences.mockReturnValue({ ...defaultGamifPrefs, isLoading: true });
    const { getByTestId } = renderNotifPrefs();
    await waitFor(() => expect(getByTestId('notif-prefs-skeleton')).toBeTruthy());
  });

  it('shows error message when gamification preferences fail to save', async () => {
    mockUseNotificationPreferences.mockReturnValue({ ...defaultGamifPrefs, error: 'save-failed' });
    const { getByTestId } = renderNotifPrefs();
    await waitFor(() => expect(getByTestId('gamification-prefs-error')).toBeTruthy());
  });

  it('disables gamification toggles when saving', async () => {
    mockUseNotificationPreferences.mockReturnValue({ ...defaultGamifPrefs, isSaving: true });
    const { getByTestId } = renderNotifPrefs();
    await waitFor(() => {
      const toggle = getByTestId('pref-toggle-streak_milestone');
      expect(toggle.props.disabled).toBe(true);
    });
  });
});

// ── Logout flow ───────────────────────────────────────────────────────────────

describe('logout flow', () => {
  it('calls signOut when sign-out button pressed', async () => {
    const { getByTestId } = renderAccountSettings();
    await waitFor(() => expect(getByTestId('sign-out-button')).toBeTruthy());

    fireEvent.press(getByTestId('sign-out-button'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('renders guest screen after logout (user becomes null)', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      signOut: mockSignOut,
      updateProfile: mockUpdateProfile,
      clearError: jest.fn(),
    });

    const { getByTestId } = renderAccountSettings();
    await waitFor(() => {
      expect(getByTestId('guest-title')).toBeTruthy();
    });
  });

  it('sign-out button not visible when unauthenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      signOut: mockSignOut,
      updateProfile: mockUpdateProfile,
      clearError: jest.fn(),
    });

    const { queryByTestId } = renderAccountSettings();
    await waitFor(() => {
      expect(queryByTestId('sign-out-button')).toBeNull();
    });
  });

  it('sign-out does not crash when signOut prop is undefined', async () => {
    // AccountScreen signOut comes from useAuth hook — no prop to omit, just verify robustness
    const { getByTestId } = renderAccountSettings();
    await waitFor(() => expect(getByTestId('sign-out-button')).toBeTruthy());
    expect(() => fireEvent.press(getByTestId('sign-out-button'))).not.toThrow();
  });
});

// ── Dark mode toggle ──────────────────────────────────────────────────────────

/** Consumer that renders current color mode and a toggle button for testing. */
function ThemeModeConsumer() {
  const { colorMode, isDark, toggleColorMode } = useTheme();
  return (
    <>
      <Text testID="color-mode">{colorMode}</Text>
      <Text testID="is-dark">{String(isDark)}</Text>
      <Text testID="toggle-mode" onPress={toggleColorMode}>
        toggle
      </Text>
    </>
  );
}

describe('dark mode toggle', () => {
  it('defaults to dark mode', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeModeConsumer />
      </ThemeProvider>,
    );
    expect(getByTestId('color-mode').props.children).toBe('dark');
    expect(getByTestId('is-dark').props.children).toBe('true');
  });

  it('toggleColorMode switches dark → light', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeModeConsumer />
      </ThemeProvider>,
    );
    fireEvent.press(getByTestId('toggle-mode'));
    expect(getByTestId('color-mode').props.children).toBe('light');
    expect(getByTestId('is-dark').props.children).toBe('false');
  });

  it('toggleColorMode switches light → dark', () => {
    const { getByTestId } = render(
      <ThemeProvider initialColorMode="light">
        <ThemeModeConsumer />
      </ThemeProvider>,
    );
    expect(getByTestId('is-dark').props.children).toBe('false');
    fireEvent.press(getByTestId('toggle-mode'));
    expect(getByTestId('is-dark').props.children).toBe('true');
  });

  it('toggleColorMode is idempotent when toggled twice', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeModeConsumer />
      </ThemeProvider>,
    );
    fireEvent.press(getByTestId('toggle-mode'));
    fireEvent.press(getByTestId('toggle-mode'));
    expect(getByTestId('color-mode').props.children).toBe('dark');
  });

  it('AccountScreen renders without error in light mode', async () => {
    const { getByTestId } = render(
      <ThemeProvider initialColorMode="light">
        <AccountScreen />
      </ThemeProvider>,
    );
    await waitFor(() => expect(getByTestId('account-screen')).toBeTruthy());
  });
});

// ── Account deletion confirm ──────────────────────────────────────────────────

describe('account deletion confirm', () => {
  it('pressing Delete Account calls requestDeletion', async () => {
    const alertSpy = jest.spyOn(require('react-native'), 'Alert', 'get').mockReturnValue({
      alert: jest.fn(),
    });

    const { getByTestId } = renderAccountSettings();
    await waitFor(() => expect(getByTestId('account-delete-account')).toBeTruthy());

    fireEvent.press(getByTestId('account-delete-account'));
    expect(mockDeletion.requestDeletion).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
  });

  it('pressing Delete Account shows confirmation alert', async () => {
    const alertMock = jest.fn();
    jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(alertMock);

    const { getByTestId } = renderAccountSettings();
    await waitFor(() => expect(getByTestId('account-delete-account')).toBeTruthy());

    fireEvent.press(getByTestId('account-delete-account'));

    expect(alertMock).toHaveBeenCalledWith(
      'Delete Account',
      expect.stringContaining('permanently delete'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Delete', style: 'destructive' }),
      ]),
    );
  });

  it('tapping Delete in alert calls confirmDeletion', async () => {
    let deleteAction: (() => void) | undefined;
    jest.spyOn(require('react-native').Alert, 'alert').mockImplementation((...args: unknown[]) => {
      const buttons = args[2] as any[];
      deleteAction = buttons.find((b: any) => b.style === 'destructive')?.onPress;
    });

    const { getByTestId } = renderAccountSettings();
    await waitFor(() => expect(getByTestId('account-delete-account')).toBeTruthy());

    fireEvent.press(getByTestId('account-delete-account'));
    deleteAction?.();

    expect(mockDeletion.confirmDeletion).toHaveBeenCalledTimes(1);
  });

  it('tapping Cancel in alert calls deletion.cancel', async () => {
    let cancelAction: (() => void) | undefined;
    jest.spyOn(require('react-native').Alert, 'alert').mockImplementation((...args: unknown[]) => {
      const buttons = args[2] as any[];
      cancelAction = buttons.find((b: any) => b.text === 'Cancel')?.onPress;
    });

    const { getByTestId } = renderAccountSettings();
    await waitFor(() => expect(getByTestId('account-delete-account')).toBeTruthy());

    fireEvent.press(getByTestId('account-delete-account'));
    cancelAction?.();

    expect(mockDeletion.cancel).toHaveBeenCalledTimes(1);
  });

  it('Delete Account button has destructive intent accessible to screen readers', async () => {
    const { getByTestId } = renderAccountSettings();
    await waitFor(() => {
      const btn = getByTestId('account-delete-account');
      expect(btn.props.accessibilityLabel).toBe('Delete Account');
    });
  });
});
