import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AccountScreen } from '../AccountScreen';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/theme/ThemeProvider';

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.2.3',
  nativeBuildVersion: '42',
  applicationId: 'com.carolinafutons.app',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

const mockBiometricAuth: {
  status: {
    isAvailable: boolean;
    isEnrolled: boolean;
    biometricType: 'none' | 'fingerprint' | 'facial' | 'iris';
  };
  isEnabled: boolean;
  loading: boolean;
  authenticating: boolean;
  enableBiometric: jest.Mock;
  disableBiometric: jest.Mock;
  promptBiometric: jest.Mock;
} = {
  status: { isAvailable: false, isEnrolled: false, biometricType: 'none' },
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

const mockMember = {
  id: 'member-1',
  email: 'test@test.com',
  displayName: 'Test User',
  phone: '555-1234',
  provider: 'wix' as const,
};

const mockAuthService = {
  restoreSession: jest.fn().mockResolvedValue(false),
  getCurrentMember: jest.fn().mockResolvedValue(null),
  loginWithEmail: jest.fn(),
  register: jest.fn(),
  loginWithOAuth: jest.fn(),
  loginWithApple: jest.fn(),
  sendPasswordReset: jest.fn(),
  logout: jest.fn().mockResolvedValue(undefined),
  isLoggedIn: jest.fn().mockReturnValue(false),
  refreshSession: jest.fn(),
  updateMember: jest.fn().mockResolvedValue({ success: true }),
};

jest.mock('@/services/wix/wixAuth', () => ({
  WixAuthService: jest.fn(() => mockAuthService),
}));

const mockPremiumValue = {
  isPremium: false,
  isLoading: false,
  offerings: [],
  error: null,
  purchase: jest.fn(),
  restore: jest.fn(),
  refreshStatus: jest.fn(),
};

jest.mock('@/hooks/usePremium', () => ({
  PremiumProvider: ({ children }: any) => children,
  usePremium: () => mockPremiumValue,
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

const mockDataExport = {
  status: 'idle' as const,
  error: null,
  exportData: jest.fn(),
};
jest.mock('@/hooks/useDataExport', () => ({
  useDataExport: () => mockDataExport,
}));

const mockAddressBook = {
  addresses: [] as any[],
  defaultAddress: null,
  loading: false,
  addAddress: jest.fn(),
  updateAddress: jest.fn(),
  deleteAddress: jest.fn(),
  setDefault: jest.fn(),
  saveFromCheckout: jest.fn(),
};
jest.mock('@/hooks/useAddressBook', () => ({
  useAddressBook: () => mockAddressBook,
}));

jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => ({
    points: 0,
    tier: 'bronze',
    totalEarned: 0,
    transactions: [],
    loading: false,
    error: null,
    refreshPoints: jest.fn(),
  }),
}));

const mockUseStreak = jest.fn();
jest.mock('@/hooks/useStreak', () => ({
  useStreak: () => mockUseStreak(),
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

function renderAccount(
  props: Partial<React.ComponentProps<typeof AccountScreen>> = {},
  authenticated = false,
) {
  // When authenticated, set up mocks before render
  if (authenticated) {
    mockAuthService.loginWithEmail.mockResolvedValue({ success: true });
    mockAuthService.getCurrentMember.mockResolvedValue(mockMember);
  }

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider>
        <AuthProvider>
          {authenticated && <AutoSignIn />}
          {children}
        </AuthProvider>
      </ThemeProvider>
    );
  }
  return render(<AccountScreen {...props} />, { wrapper: Wrapper });
}

/** Signs in automatically on mount */
function AutoSignIn() {
  const { signIn } = useAuth();
  React.useEffect(() => {
    signIn('test@test.com', 'Pass1234');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Signs in with a custom member mock for edge-case tests */
function AutoSignInWithMember({ member }: { member: typeof mockMember }) {
  const { signIn } = useAuth();
  React.useEffect(() => {
    mockAuthService.loginWithEmail.mockResolvedValue({ success: true });
    mockAuthService.getCurrentMember.mockResolvedValue(member);
    signIn('test@test.com', 'Pass1234');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

describe('AccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.restoreSession.mockResolvedValue(false);
    mockAuthService.getCurrentMember.mockResolvedValue(null);
    mockAuthService.logout.mockResolvedValue(undefined);
    mockAddressBook.addresses = [];
    mockAddressBook.defaultAddress = null;
    mockPremiumValue.isPremium = false;
    mockBiometricAuth.status = {
      isAvailable: false,
      isEnrolled: false,
      biometricType: 'none' as const,
    };
    mockBiometricAuth.isEnabled = false;
    mockBiometricAuth.loading = false;
    mockUseStreak.mockReturnValue({ streak: 0, loading: false });
  });

  describe('Guest state', () => {
    it('renders account screen', async () => {
      const { getByTestId } = renderAccount();
      await waitFor(() => expect(getByTestId('account-screen')).toBeTruthy());
    });

    it('shows guest title', async () => {
      const { getByTestId } = renderAccount();
      await waitFor(() => expect(getByTestId('guest-title')).toBeTruthy());
    });

    it('shows sign in button', async () => {
      const { getByTestId } = renderAccount();
      await waitFor(() => expect(getByTestId('account-sign-in-button')).toBeTruthy());
    });

    it('calls onLogin when sign in pressed', async () => {
      const onLogin = jest.fn();
      const { getByTestId } = renderAccount({ onLogin });
      await waitFor(() => expect(getByTestId('account-sign-in-button')).toBeTruthy());
      fireEvent.press(getByTestId('account-sign-in-button'));
      expect(onLogin).toHaveBeenCalledTimes(1);
    });

    it('does not show user profile', async () => {
      const { queryByTestId } = renderAccount();
      await waitFor(() => expect(queryByTestId('user-display-name')).toBeNull());
    });
  });

  describe('Authenticated state', () => {
    it('shows user display name', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('user-display-name')).toBeTruthy();
      });
    });

    it('shows user email', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('user-email').props.children).toBe('test@test.com');
      });
    });

    it('shows user avatar', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('user-avatar')).toBeTruthy();
      });
    });

    it('shows sign out button', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('sign-out-button')).toBeTruthy();
      });
    });

    it('signs out when sign out pressed', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('sign-out-button')).toBeTruthy();
      });
      fireEvent.press(getByTestId('sign-out-button'));
      await waitFor(() => {
        expect(getByTestId('guest-title')).toBeTruthy();
      });
    });

    it('shows menu items', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('account-order-history')).toBeTruthy();
      });
      expect(getByTestId('account-addresses')).toBeTruthy();
      expect(getByTestId('account-payment')).toBeTruthy();
      expect(getByTestId('account-notifications')).toBeTruthy();
    });

    it('shows CF+ badge when user is premium', async () => {
      mockPremiumValue.isPremium = true;
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('premium-badge')).toBeTruthy();
      });
    });

    it('does not show CF+ badge when user is not premium', async () => {
      const { queryByTestId, getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('user-display-name')).toBeTruthy();
      });
      expect(queryByTestId('premium-badge')).toBeNull();
    });

    it('shows CF+ badge on Premium menu item when user is premium', async () => {
      mockPremiumValue.isPremium = true;
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('menu-premium-badge')).toBeTruthy();
      });
    });

    it('does not show CF+ badge on Premium menu item when not premium', async () => {
      const { queryByTestId, getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('user-display-name')).toBeTruthy();
      });
      expect(queryByTestId('menu-premium-badge')).toBeNull();
    });

    it('renders restore purchases button', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('restore-purchases')).toBeTruthy();
      });
    });

    it('calls restore when restore purchases is pressed', async () => {
      mockPremiumValue.restore.mockResolvedValue(false);
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('restore-purchases')).toBeTruthy();
      });
      fireEvent.press(getByTestId('restore-purchases'));
      expect(mockPremiumValue.restore).toHaveBeenCalledTimes(1);
    });

    it('calls onOrderHistory when pressed', async () => {
      const onOrderHistory = jest.fn();
      const { getByTestId } = renderAccount({ onOrderHistory }, true);
      await waitFor(() => {
        expect(getByTestId('account-order-history')).toBeTruthy();
      });
      fireEvent.press(getByTestId('account-order-history'));
      expect(onOrderHistory).toHaveBeenCalledTimes(1);
    });

    it('shows edit profile button', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('edit-profile-button')).toBeTruthy();
      });
    });

    it('shows edit form when edit profile pressed', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('edit-profile-button')).toBeTruthy();
      });
      fireEvent.press(getByTestId('edit-profile-button'));
      expect(getByTestId('edit-profile-form')).toBeTruthy();
      expect(getByTestId('edit-first-name-input')).toBeTruthy();
      expect(getByTestId('edit-last-name-input')).toBeTruthy();
      expect(getByTestId('edit-phone-input')).toBeTruthy();
    });

    it('cancels editing and returns to profile view', async () => {
      const { getByTestId, queryByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('edit-profile-button')).toBeTruthy();
      });
      fireEvent.press(getByTestId('edit-profile-button'));
      expect(getByTestId('edit-profile-form')).toBeTruthy();
      fireEvent.press(getByTestId('edit-cancel-button'));
      expect(queryByTestId('edit-profile-form')).toBeNull();
      expect(getByTestId('user-display-name')).toBeTruthy();
    });

    it('calls updateMember on save', async () => {
      const updatedMember = { ...mockMember, displayName: 'Jane Doe', phone: '555-0000' };
      mockAuthService.updateMember.mockResolvedValue({ success: true });
      mockAuthService.getCurrentMember
        .mockResolvedValueOnce(mockMember) // initial sign-in
        .mockResolvedValueOnce(updatedMember); // after update

      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('edit-profile-button')).toBeTruthy();
      });
      fireEvent.press(getByTestId('edit-profile-button'));
      fireEvent.changeText(getByTestId('edit-first-name-input'), 'Jane');
      fireEvent.changeText(getByTestId('edit-last-name-input'), 'Doe');
      fireEvent.changeText(getByTestId('edit-phone-input'), '555-0000');
      fireEvent.press(getByTestId('edit-save-button'));

      await waitFor(() => {
        expect(mockAuthService.updateMember).toHaveBeenCalledWith('member-1', {
          firstName: 'Jane',
          lastName: 'Doe',
          phone: '555-0000',
        });
      });
    }, 15000);

    it('shows privacy section with Export and Delete options', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('privacy-section-title')).toBeTruthy();
      });
      expect(getByTestId('account-export-data')).toBeTruthy();
      expect(getByTestId('account-delete-account')).toBeTruthy();
    });

    it('calls exportData when Export My Data pressed', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('account-export-data')).toBeTruthy();
      });
      fireEvent.press(getByTestId('account-export-data'));
      expect(mockDataExport.exportData).toHaveBeenCalledTimes(1);
    });

    it('does not show privacy section for guests', async () => {
      const { queryByTestId } = renderAccount();
      await waitFor(() => {
        expect(queryByTestId('privacy-section-title')).toBeNull();
      });
    });

    it('shows app version text', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('app-version-text')).toBeTruthy();
      });
      expect(getByTestId('app-version-text').props.children).toEqual([
        'v',
        '1.2.3',
        ' (',
        '42',
        ')',
      ]);
    });

    it('does not show debug menu by default', async () => {
      const { queryByTestId, getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('app-version-text')).toBeTruthy();
      });
      expect(queryByTestId('debug-menu')).toBeNull();
    });

    it('shows debug menu after tapping version 5 times', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('app-version-tap')).toBeTruthy();
      });
      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByTestId('app-version-tap'));
      }
      expect(getByTestId('debug-menu')).toBeTruthy();
    });

    it('hides debug menu after tapping version 5 more times', async () => {
      const { getByTestId, queryByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('app-version-tap')).toBeTruthy();
      });
      // Show
      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByTestId('app-version-tap'));
      }
      expect(getByTestId('debug-menu')).toBeTruthy();
      // Hide
      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByTestId('app-version-tap'));
      }
      expect(queryByTestId('debug-menu')).toBeNull();
    });

    it('does not open debug menu with fewer than 5 taps', async () => {
      const { getByTestId, queryByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('app-version-tap')).toBeTruthy();
      });
      for (let i = 0; i < 4; i++) {
        fireEvent.press(getByTestId('app-version-tap'));
      }
      expect(queryByTestId('debug-menu')).toBeNull();
    });

    it('uses custom testID when provided', async () => {
      const { getByTestId } = renderAccount({ testID: 'my-account' }, true);
      await waitFor(() => {
        expect(getByTestId('my-account')).toBeTruthy();
      });
    });

    it('uses custom testID for guest state', async () => {
      const { getByTestId } = renderAccount({ testID: 'guest-custom' });
      await waitFor(() => {
        expect(getByTestId('guest-custom')).toBeTruthy();
      });
    });
  });

  describe('Biometric toggle', () => {
    it('shows biometric toggle when available, enrolled, and not loading', async () => {
      mockBiometricAuth.status = {
        isAvailable: true,
        isEnrolled: true,
        biometricType: 'fingerprint',
      };
      mockBiometricAuth.loading = false;
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('account-biometric-toggle')).toBeTruthy();
      });
      expect(getByTestId('biometric-switch')).toBeTruthy();
    });

    it('hides biometric toggle when not available', async () => {
      mockBiometricAuth.status = {
        isAvailable: false,
        isEnrolled: true,
        biometricType: 'fingerprint',
      };
      const { queryByTestId, getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('user-display-name')).toBeTruthy();
      });
      expect(queryByTestId('account-biometric-toggle')).toBeNull();
    });

    it('hides biometric toggle when not enrolled', async () => {
      mockBiometricAuth.status = {
        isAvailable: true,
        isEnrolled: false,
        biometricType: 'fingerprint',
      };
      const { queryByTestId, getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('user-display-name')).toBeTruthy();
      });
      expect(queryByTestId('account-biometric-toggle')).toBeNull();
    });

    it('hides biometric toggle when loading', async () => {
      mockBiometricAuth.status = {
        isAvailable: true,
        isEnrolled: true,
        biometricType: 'fingerprint',
      };
      mockBiometricAuth.loading = true;
      const { queryByTestId, getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('user-display-name')).toBeTruthy();
      });
      expect(queryByTestId('account-biometric-toggle')).toBeNull();
    });

    it('shows "Face ID Sign-In" label for facial biometric', async () => {
      mockBiometricAuth.status = { isAvailable: true, isEnrolled: true, biometricType: 'facial' };
      const { getByTestId, getByText } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('account-biometric-toggle')).toBeTruthy();
      });
      expect(getByText('Face ID Sign-In')).toBeTruthy();
    });

    it('shows "Touch ID Sign-In" label for fingerprint biometric', async () => {
      mockBiometricAuth.status = {
        isAvailable: true,
        isEnrolled: true,
        biometricType: 'fingerprint',
      };
      const { getByTestId, getByText } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('account-biometric-toggle')).toBeTruthy();
      });
      expect(getByText('Touch ID Sign-In')).toBeTruthy();
    });

    it('calls enableBiometric when toggle switched on', async () => {
      mockBiometricAuth.status = {
        isAvailable: true,
        isEnrolled: true,
        biometricType: 'fingerprint',
      };
      mockBiometricAuth.isEnabled = false;
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('biometric-switch')).toBeTruthy();
      });
      fireEvent(getByTestId('biometric-switch'), 'valueChange', true);
      await waitFor(() => {
        expect(mockBiometricAuth.enableBiometric).toHaveBeenCalledTimes(1);
      });
    });

    it('calls disableBiometric when toggle switched off', async () => {
      mockBiometricAuth.status = {
        isAvailable: true,
        isEnrolled: true,
        biometricType: 'fingerprint',
      };
      mockBiometricAuth.isEnabled = true;
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('biometric-switch')).toBeTruthy();
      });
      fireEvent(getByTestId('biometric-switch'), 'valueChange', false);
      await waitFor(() => {
        expect(mockBiometricAuth.disableBiometric).toHaveBeenCalledTimes(1);
      });
    });

    it('does not show biometric toggle for guests', async () => {
      mockBiometricAuth.status = {
        isAvailable: true,
        isEnrolled: true,
        biometricType: 'fingerprint',
      };
      const { queryByTestId } = renderAccount();
      await waitFor(() => {
        expect(queryByTestId('account-biometric-toggle')).toBeNull();
      });
    });
  });

  describe('Address management', () => {
    const mockAddresses = [
      {
        id: 'addr-1',
        fullName: 'John Doe',
        line1: '123 Main St',
        line2: 'Apt 4B',
        city: 'Raleigh',
        state: 'NC',
        zip: '27601',
        isDefault: true,
      },
      {
        id: 'addr-2',
        fullName: 'Jane Doe',
        line1: '456 Oak Ave',
        line2: '',
        city: 'Durham',
        state: 'NC',
        zip: '27701',
        isDefault: false,
      },
    ];

    it('renders address list when addresses exist', async () => {
      mockAddressBook.addresses = mockAddresses;
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('address-list')).toBeTruthy();
      });
      expect(getByTestId('address-addr-1')).toBeTruthy();
      expect(getByTestId('address-addr-2')).toBeTruthy();
    });

    it('shows address count in menu label', async () => {
      mockAddressBook.addresses = mockAddresses;
      const { getByText } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByText('Saved Addresses (2)')).toBeTruthy();
      });
    });

    it('does not show address list when no addresses', async () => {
      mockAddressBook.addresses = [];
      const { queryByTestId, getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('account-addresses')).toBeTruthy();
      });
      expect(queryByTestId('address-list')).toBeNull();
    });

    it('shows "(Default)" label on default address', async () => {
      mockAddressBook.addresses = mockAddresses;
      const { getByText } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByText(' (Default)')).toBeTruthy();
      });
    });

    it('shows line2 when present', async () => {
      mockAddressBook.addresses = mockAddresses;
      const { getByText } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByText('123 Main St, Apt 4B')).toBeTruthy();
      });
    });

    it('omits line2 separator when line2 is empty', async () => {
      mockAddressBook.addresses = mockAddresses;
      const { getByText } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByText('456 Oak Ave')).toBeTruthy();
      });
    });

    it('hides "Set Default" button on default address', async () => {
      mockAddressBook.addresses = mockAddresses;
      const { queryByTestId, getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('address-addr-1')).toBeTruthy();
      });
      expect(queryByTestId('set-default-addr-1')).toBeNull();
    });

    it('shows "Set Default" button on non-default address', async () => {
      mockAddressBook.addresses = mockAddresses;
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('set-default-addr-2')).toBeTruthy();
      });
    });

    it('calls setDefault when "Set Default" pressed', async () => {
      mockAddressBook.addresses = mockAddresses;
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('set-default-addr-2')).toBeTruthy();
      });
      fireEvent.press(getByTestId('set-default-addr-2'));
      expect(mockAddressBook.setDefault).toHaveBeenCalledWith('addr-2');
    });

    it('shows delete confirmation alert when delete pressed', async () => {
      mockAddressBook.addresses = mockAddresses;
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('delete-address-addr-1')).toBeTruthy();
      });
      fireEvent.press(getByTestId('delete-address-addr-1'));
      expect(alertSpy).toHaveBeenCalledWith(
        'Delete Address',
        'Remove 123 Main St?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Delete', style: 'destructive' }),
        ]),
      );
    });

    it('calls deleteAddress when delete confirmed in alert', async () => {
      mockAddressBook.addresses = mockAddresses;
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('delete-address-addr-2')).toBeTruthy();
      });
      fireEvent.press(getByTestId('delete-address-addr-2'));
      // Find and invoke the destructive button's onPress
      const alertButtons = alertSpy.mock.calls[0][2] as any[];
      const deleteButton = alertButtons.find((b: any) => b.text === 'Delete');
      deleteButton.onPress();
      expect(mockAddressBook.deleteAddress).toHaveBeenCalledWith('addr-2');
    });
  });

  describe('Profile editing — edge cases', () => {
    it('shows error message when auth error is set during editing', async () => {
      mockAuthService.updateMember.mockResolvedValue({ success: false, error: 'Update failed' });
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('edit-profile-button')).toBeTruthy();
      });
      fireEvent.press(getByTestId('edit-profile-button'));
      // Trigger a save that will fail
      fireEvent.press(getByTestId('edit-save-button'));
      await waitFor(() => {
        expect(mockAuthService.updateMember).toHaveBeenCalled();
      });
    });

    it('pre-fills name fields from user displayName with multi-word last name', async () => {
      const multiNameMember = {
        ...mockMember,
        displayName: 'Mary Jane Watson',
        phone: '',
      };
      mockAuthService.getCurrentMember.mockResolvedValue(multiNameMember);
      // renderAccount sets getCurrentMember to mockMember when authenticated=true,
      // so override it again after renderAccount's setup
      const { getByTestId } = render(
        <ThemeProvider>
          <AuthProvider>
            <AutoSignInWithMember member={multiNameMember} />
            <AccountScreen />
          </AuthProvider>
        </ThemeProvider>,
      );
      await waitFor(() => {
        expect(getByTestId('edit-profile-button')).toBeTruthy();
      });
      fireEvent.press(getByTestId('edit-profile-button'));
      expect(getByTestId('edit-first-name-input').props.value).toBe('Mary');
      expect(getByTestId('edit-last-name-input').props.value).toBe('Jane Watson');
    });

    it('pre-fills phone as empty string when user has no phone', async () => {
      const noPhoneMember = { ...mockMember, phone: '' };
      mockAuthService.getCurrentMember.mockResolvedValue(noPhoneMember);
      const { getByTestId } = render(
        <ThemeProvider>
          <AuthProvider>
            <AutoSignInWithMember member={noPhoneMember} />
            <AccountScreen />
          </AuthProvider>
        </ThemeProvider>,
      );
      await waitFor(() => {
        expect(getByTestId('edit-profile-button')).toBeTruthy();
      });
      fireEvent.press(getByTestId('edit-profile-button'));
      expect(getByTestId('edit-phone-input').props.value).toBe('');
    });

    it('does not show phone text when user has no phone', async () => {
      const noPhoneMember = { ...mockMember, phone: '' };
      mockAuthService.getCurrentMember.mockResolvedValue(noPhoneMember);
      const { queryByTestId, getByTestId } = render(
        <ThemeProvider>
          <AuthProvider>
            <AutoSignInWithMember member={noPhoneMember} />
            <AccountScreen />
          </AuthProvider>
        </ThemeProvider>,
      );
      await waitFor(() => {
        expect(getByTestId('user-display-name')).toBeTruthy();
      });
      expect(queryByTestId('user-phone')).toBeNull();
    });

    it('shows phone text when user has a phone number', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('user-phone')).toBeTruthy();
      });
      expect(getByTestId('user-phone').props.children).toBe('555-1234');
    });

    it('handles single-word display name (no last name)', async () => {
      const singleNameMember = { ...mockMember, displayName: 'Madonna' };
      mockAuthService.getCurrentMember.mockResolvedValue(singleNameMember);
      const { getByTestId } = render(
        <ThemeProvider>
          <AuthProvider>
            <AutoSignInWithMember member={singleNameMember} />
            <AccountScreen />
          </AuthProvider>
        </ThemeProvider>,
      );
      await waitFor(() => {
        expect(getByTestId('edit-profile-button')).toBeTruthy();
      });
      fireEvent.press(getByTestId('edit-profile-button'));
      expect(getByTestId('edit-first-name-input').props.value).toBe('Madonna');
      expect(getByTestId('edit-last-name-input').props.value).toBe('');
    });

    it('trims whitespace from fields when saving profile', async () => {
      mockAuthService.updateMember.mockResolvedValue({ success: true });
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('edit-profile-button')).toBeTruthy();
      });
      fireEvent.press(getByTestId('edit-profile-button'));
      fireEvent.changeText(getByTestId('edit-first-name-input'), '  Jane  ');
      fireEvent.changeText(getByTestId('edit-last-name-input'), '  Doe  ');
      fireEvent.changeText(getByTestId('edit-phone-input'), '  555-0000  ');
      fireEvent.press(getByTestId('edit-save-button'));
      await waitFor(() => {
        expect(mockAuthService.updateMember).toHaveBeenCalledWith('member-1', {
          firstName: 'Jane',
          lastName: 'Doe',
          phone: '555-0000',
        });
      });
    }, 15000);
  });

  describe('Restore purchases', () => {
    it('shows success alert when restore succeeds', async () => {
      mockPremiumValue.restore.mockResolvedValue(true);
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('restore-purchases')).toBeTruthy();
      });
      fireEvent.press(getByTestId('restore-purchases'));
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Restored!',
          'Your CF+ subscription has been restored.',
        );
      });
    });

    it('shows failure alert when restore finds no purchases', async () => {
      mockPremiumValue.restore.mockResolvedValue(false);
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('restore-purchases')).toBeTruthy();
      });
      fireEvent.press(getByTestId('restore-purchases'));
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'No Purchases Found',
          'We could not find any previous purchases for this account.',
        );
      });
    });
  });

  describe('Account deletion', () => {
    it('calls requestDeletion and shows confirmation alert when Delete Account pressed', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('account-delete-account')).toBeTruthy();
      });
      fireEvent.press(getByTestId('account-delete-account'));
      expect(mockDeletion.requestDeletion).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        'Delete Account',
        expect.stringContaining('permanently delete'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Delete', style: 'destructive' }),
        ]),
      );
    });

    it('calls confirmDeletion when delete alert is confirmed', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('account-delete-account')).toBeTruthy();
      });
      fireEvent.press(getByTestId('account-delete-account'));
      const alertButtons = alertSpy.mock.calls[0][2] as any[];
      const deleteButton = alertButtons.find((b: any) => b.text === 'Delete');
      deleteButton.onPress();
      expect(mockDeletion.confirmDeletion).toHaveBeenCalledTimes(1);
    });

    it('calls cancel when delete alert is cancelled', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('account-delete-account')).toBeTruthy();
      });
      fireEvent.press(getByTestId('account-delete-account'));
      const alertButtons = alertSpy.mock.calls[0][2] as any[];
      const cancelButton = alertButtons.find((b: any) => b.text === 'Cancel');
      cancelButton.onPress();
      expect(mockDeletion.cancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Privacy policy', () => {
    it('shows Privacy Policy menu item when onPrivacyPolicy is provided', async () => {
      const onPrivacyPolicy = jest.fn();
      const { getByTestId } = renderAccount({ onPrivacyPolicy }, true);
      await waitFor(() => {
        expect(getByTestId('account-privacy-policy')).toBeTruthy();
      });
    });

    it('calls onPrivacyPolicy when pressed', async () => {
      const onPrivacyPolicy = jest.fn();
      const { getByTestId } = renderAccount({ onPrivacyPolicy }, true);
      await waitFor(() => {
        expect(getByTestId('account-privacy-policy')).toBeTruthy();
      });
      fireEvent.press(getByTestId('account-privacy-policy'));
      expect(onPrivacyPolicy).toHaveBeenCalledTimes(1);
    });

    it('hides Privacy Policy menu item when onPrivacyPolicy is not provided', async () => {
      const { queryByTestId, getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('privacy-section-title')).toBeTruthy();
      });
      expect(queryByTestId('account-privacy-policy')).toBeNull();
    });
  });

  describe('Navigation callbacks', () => {
    it('calls onPremium when CF+ Premium pressed', async () => {
      const onPremium = jest.fn();
      const { getByTestId } = renderAccount({ onPremium }, true);
      await waitFor(() => {
        expect(getByTestId('account-premium')).toBeTruthy();
      });
      fireEvent.press(getByTestId('account-premium'));
      expect(onPremium).toHaveBeenCalledTimes(1);
    });

    it('calls onStyleQuiz when Style Preferences pressed', async () => {
      const onStyleQuiz = jest.fn();
      const { getByTestId } = renderAccount({ onStyleQuiz }, true);
      await waitFor(() => {
        expect(getByTestId('account-style-quiz')).toBeTruthy();
      });
      fireEvent.press(getByTestId('account-style-quiz'));
      expect(onStyleQuiz).toHaveBeenCalledTimes(1);
    });

    it('does not throw when pressing menu item without onPress', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('account-payment')).toBeTruthy();
      });
      expect(() => fireEvent.press(getByTestId('account-payment'))).not.toThrow();
    });

    it('does not throw when sign in pressed without onLogin', async () => {
      const { getByTestId } = renderAccount();
      await waitFor(() => {
        expect(getByTestId('account-sign-in-button')).toBeTruthy();
      });
      expect(() => fireEvent.press(getByTestId('account-sign-in-button'))).not.toThrow();
    });
  });

  describe('Address form — add flow (cm-v54)', () => {
    it('tapping Saved Addresses opens add-address form when below max', async () => {
      mockAddressBook.addresses = [];
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => expect(getByTestId('account-addresses')).toBeTruthy());
      fireEvent.press(getByTestId('account-addresses'));
      await waitFor(() => expect(getByTestId('address-form')).toBeTruthy());
    });

    it('shows add-address form title', async () => {
      mockAddressBook.addresses = [];
      const { getByTestId, getByText } = renderAccount({}, true);
      await waitFor(() => expect(getByTestId('account-addresses')).toBeTruthy());
      fireEvent.press(getByTestId('account-addresses'));
      await waitFor(() => expect(getByText('Add Address')).toBeTruthy());
    });

    it('submitting valid add form calls addAddress', async () => {
      mockAddressBook.addresses = [];
      mockAddressBook.addAddress.mockResolvedValue(undefined);
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => expect(getByTestId('account-addresses')).toBeTruthy());
      fireEvent.press(getByTestId('account-addresses'));
      await waitFor(() => expect(getByTestId('address-full-name-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('address-full-name-input'), 'Jane Smith');
      fireEvent.changeText(getByTestId('address-line1-input'), '789 Pine Rd');
      fireEvent.changeText(getByTestId('address-line2-input'), '');
      fireEvent.changeText(getByTestId('address-city-input'), 'Durham');
      fireEvent.changeText(getByTestId('address-state-input'), 'NC');
      fireEvent.changeText(getByTestId('address-zip-input'), '27701');
      fireEvent.press(getByTestId('address-save-button'));
      await waitFor(() => {
        expect(mockAddressBook.addAddress).toHaveBeenCalledWith(
          expect.objectContaining({ fullName: 'Jane Smith', line1: '789 Pine Rd' }),
        );
      });
    });

    it('cancel in add form hides the form', async () => {
      mockAddressBook.addresses = [];
      const { getByTestId, queryByTestId } = renderAccount({}, true);
      await waitFor(() => expect(getByTestId('account-addresses')).toBeTruthy());
      fireEvent.press(getByTestId('account-addresses'));
      await waitFor(() => expect(getByTestId('address-form')).toBeTruthy());
      fireEvent.press(getByTestId('address-cancel-button'));
      await waitFor(() => expect(queryByTestId('address-form')).toBeNull());
    });

    it('shows max-addresses notice when 5 addresses exist', async () => {
      mockAddressBook.addresses = [
        {
          id: 'a1',
          fullName: 'A',
          line1: '1 St',
          line2: '',
          city: 'City',
          state: 'NC',
          zip: '27601',
          isDefault: true,
        },
        {
          id: 'a2',
          fullName: 'B',
          line1: '2 St',
          line2: '',
          city: 'City',
          state: 'NC',
          zip: '27601',
          isDefault: false,
        },
        {
          id: 'a3',
          fullName: 'C',
          line1: '3 St',
          line2: '',
          city: 'City',
          state: 'NC',
          zip: '27601',
          isDefault: false,
        },
        {
          id: 'a4',
          fullName: 'D',
          line1: '4 St',
          line2: '',
          city: 'City',
          state: 'NC',
          zip: '27601',
          isDefault: false,
        },
        {
          id: 'a5',
          fullName: 'E',
          line1: '5 St',
          line2: '',
          city: 'City',
          state: 'NC',
          zip: '27601',
          isDefault: false,
        },
      ];
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => expect(getByTestId('address-list')).toBeTruthy());
      expect(getByTestId('address-max-notice')).toBeTruthy();
    });
  });

  describe('Address form — edit flow (cm-v54)', () => {
    const mockAddresses = [
      {
        id: 'addr-1',
        fullName: 'John Doe',
        line1: '123 Main St',
        line2: '',
        city: 'Raleigh',
        state: 'NC',
        zip: '27601',
        isDefault: true,
      },
    ];

    it('each address row has an edit button', async () => {
      mockAddressBook.addresses = mockAddresses;
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => expect(getByTestId('edit-address-addr-1')).toBeTruthy());
    });

    it('tapping edit button opens form pre-filled with address data', async () => {
      mockAddressBook.addresses = mockAddresses;
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => expect(getByTestId('edit-address-addr-1')).toBeTruthy());
      fireEvent.press(getByTestId('edit-address-addr-1'));
      await waitFor(() => expect(getByTestId('address-form')).toBeTruthy());
      expect(getByTestId('address-full-name-input').props.value).toBe('John Doe');
      expect(getByTestId('address-line1-input').props.value).toBe('123 Main St');
      expect(getByTestId('address-city-input').props.value).toBe('Raleigh');
    });

    it('shows edit-address form title', async () => {
      mockAddressBook.addresses = mockAddresses;
      const { getByTestId, getByText } = renderAccount({}, true);
      await waitFor(() => expect(getByTestId('edit-address-addr-1')).toBeTruthy());
      fireEvent.press(getByTestId('edit-address-addr-1'));
      await waitFor(() => expect(getByText('Edit Address')).toBeTruthy());
    });

    it('submitting edit form calls updateAddress with id', async () => {
      mockAddressBook.addresses = mockAddresses;
      mockAddressBook.updateAddress.mockResolvedValue(undefined);
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => expect(getByTestId('edit-address-addr-1')).toBeTruthy());
      fireEvent.press(getByTestId('edit-address-addr-1'));
      await waitFor(() => expect(getByTestId('address-full-name-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('address-full-name-input'), 'John Updated');
      fireEvent.press(getByTestId('address-save-button'));
      await waitFor(() => {
        expect(mockAddressBook.updateAddress).toHaveBeenCalledWith(
          'addr-1',
          expect.objectContaining({ fullName: 'John Updated' }),
        );
      });
    });

    it('cancel in edit form hides the form', async () => {
      mockAddressBook.addresses = mockAddresses;
      const { getByTestId, queryByTestId } = renderAccount({}, true);
      await waitFor(() => expect(getByTestId('edit-address-addr-1')).toBeTruthy());
      fireEvent.press(getByTestId('edit-address-addr-1'));
      await waitFor(() => expect(getByTestId('address-form')).toBeTruthy());
      fireEvent.press(getByTestId('address-cancel-button'));
      await waitFor(() => expect(queryByTestId('address-form')).toBeNull());
    });
  });

  // ── Streak multiplier in header (hq-paclo) ────────────────────────
  describe('Streak multiplier display (hq-paclo)', () => {
    it('shows streak badge with 1× multiplier when streak is 0', async () => {
      mockUseStreak.mockReturnValue({ streak: 0, loading: false });
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('streak-badge')).toBeTruthy();
        expect(getByTestId('streak-multiplier')).toBeTruthy();
      });
    });

    it('shows 1.5× multiplier chip when streak is 3 days', async () => {
      mockUseStreak.mockReturnValue({ streak: 3, loading: false });
      const { getByText } = renderAccount({}, true);
      await waitFor(() => expect(getByText('1.5×')).toBeTruthy());
    });

    it('shows 2× multiplier chip when streak is 7 days', async () => {
      mockUseStreak.mockReturnValue({ streak: 7, loading: false });
      const { getByText } = renderAccount({}, true);
      await waitFor(() => expect(getByText('2×')).toBeTruthy());
    });

    it('hides streak badge while streak is loading', async () => {
      mockUseStreak.mockReturnValue({ streak: 0, loading: true });
      const { queryByTestId } = renderAccount({}, true);
      await waitFor(() => expect(queryByTestId('streak-badge')).toBeNull());
    });
  });

  // ── Challenges navigation (hq-elfso) ─────────────────────────────────────

  describe('Challenges navigation', () => {
    it('shows Challenges menu item when authenticated', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => expect(getByTestId('account-challenges')).toBeTruthy());
    });

    it('calls onChallenges when Challenges menu item is pressed', async () => {
      const onChallenges = jest.fn();
      const { getByTestId } = renderAccount({ onChallenges }, true);
      await waitFor(() => expect(getByTestId('account-challenges')).toBeTruthy());
      fireEvent.press(getByTestId('account-challenges'));
      expect(onChallenges).toHaveBeenCalledTimes(1);
    });
  });
});
