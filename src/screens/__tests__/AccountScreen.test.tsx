import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AccountScreen } from '../AccountScreen';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mockPromptBiometric = jest.fn().mockResolvedValue(true);
let mockBiometricEnabled = false;
jest.mock('@/hooks/useBiometricAuth', () => ({
  useBiometricAuth: () => ({
    status: { isAvailable: true, isEnrolled: true, biometricType: 'facial' as const },
    isEnabled: mockBiometricEnabled,
    loading: false,
    authenticating: false,
    enableBiometric: jest.fn().mockResolvedValue(true),
    disableBiometric: jest.fn().mockResolvedValue(undefined),
    promptBiometric: mockPromptBiometric,
  }),
}));

const mockMember = {
  id: 'member-1',
  email: 'test@test.com',
  displayName: 'Test User',
  provider: 'wix' as const,
};

const mockAuthService = {
  restoreSession: jest.fn().mockResolvedValue(false),
  getCurrentMember: jest.fn().mockResolvedValue(null),
  loginWithEmail: jest.fn(),
  register: jest.fn(),
  loginWithOAuth: jest.fn(),
  sendPasswordReset: jest.fn(),
  logout: jest.fn().mockResolvedValue(undefined),
  isLoggedIn: jest.fn().mockReturnValue(false),
  refreshSession: jest.fn(),
};

jest.mock('@/services/wix/wixAuth', () => ({
  WixAuthService: jest.fn(() => mockAuthService),
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
    mockBiometricEnabled = false;
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

    it('calls onOrderHistory when pressed', async () => {
      const onOrderHistory = jest.fn();
      const { getByTestId } = renderAccount({ onOrderHistory }, true);
      await waitFor(() => {
        expect(getByTestId('account-order-history')).toBeTruthy();
      });
      fireEvent.press(getByTestId('account-order-history'));
      expect(onOrderHistory).toHaveBeenCalledTimes(1);
    });
  });

  describe('Biometric gate for sensitive actions', () => {
    it('navigates to payment methods without prompt when biometric disabled', async () => {
      const onPaymentMethods = jest.fn();
      const { getByTestId } = renderAccount({ onPaymentMethods }, true);
      await waitFor(() => {
        expect(getByTestId('account-payment')).toBeTruthy();
      });
      fireEvent.press(getByTestId('account-payment'));
      await waitFor(() => {
        expect(mockPromptBiometric).not.toHaveBeenCalled();
        expect(onPaymentMethods).toHaveBeenCalledTimes(1);
      });
    });

    it('prompts biometric before navigating to payment methods when enabled', async () => {
      mockBiometricEnabled = true;
      mockPromptBiometric.mockResolvedValue(true);
      const onPaymentMethods = jest.fn();
      const { getByTestId } = renderAccount({ onPaymentMethods }, true);
      await waitFor(() => {
        expect(getByTestId('account-payment')).toBeTruthy();
      });
      fireEvent.press(getByTestId('account-payment'));
      await waitFor(() => {
        expect(mockPromptBiometric).toHaveBeenCalledWith('Verify identity to access sensitive settings');
        expect(onPaymentMethods).toHaveBeenCalledTimes(1);
      });
    });

    it('blocks navigation when biometric prompt fails', async () => {
      mockBiometricEnabled = true;
      mockPromptBiometric.mockResolvedValue(false);
      const onPaymentMethods = jest.fn();
      const { getByTestId } = renderAccount({ onPaymentMethods }, true);
      await waitFor(() => {
        expect(getByTestId('account-payment')).toBeTruthy();
      });
      fireEvent.press(getByTestId('account-payment'));
      await waitFor(() => {
        expect(mockPromptBiometric).toHaveBeenCalled();
        expect(onPaymentMethods).not.toHaveBeenCalled();
      });
    });

    it('gates saved addresses with biometric when enabled', async () => {
      mockBiometricEnabled = true;
      mockPromptBiometric.mockResolvedValue(true);
      const onAddresses = jest.fn();
      const { getByTestId } = renderAccount({ onAddresses }, true);
      await waitFor(() => {
        expect(getByTestId('account-addresses')).toBeTruthy();
      });
      fireEvent.press(getByTestId('account-addresses'));
      await waitFor(() => {
        expect(mockPromptBiometric).toHaveBeenCalled();
        expect(onAddresses).toHaveBeenCalledTimes(1);
      });
    });
  });
});
