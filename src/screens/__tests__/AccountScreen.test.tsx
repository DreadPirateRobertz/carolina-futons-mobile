import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AccountScreen } from '../AccountScreen';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/theme/ThemeProvider';

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.2.3',
  nativeBuildVersion: '42',
  applicationId: 'com.carolinafutons.app',
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

describe('AccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.restoreSession.mockResolvedValue(false);
    mockAuthService.getCurrentMember.mockResolvedValue(null);
    mockAuthService.logout.mockResolvedValue(undefined);
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
      expect(getByTestId('guest-title')).toBeTruthy();
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
      mockPremiumValue.isPremium = false;
    });

    it('does not show CF+ badge when user is not premium', async () => {
      mockPremiumValue.isPremium = false;
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
      mockPremiumValue.isPremium = false;
    });

    it('does not show CF+ badge on Premium menu item when not premium', async () => {
      mockPremiumValue.isPremium = false;
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
  });
});
