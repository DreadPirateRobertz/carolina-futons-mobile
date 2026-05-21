import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { LoginScreen } from '../LoginScreen';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mockGetBiometricStatus = jest.fn();
const mockIsBiometricEnabled = jest.fn();
const mockAuthenticate = jest.fn();

jest.mock('@/services/biometric', () => ({
  getBiometricStatus: (...args: unknown[]) => mockGetBiometricStatus(...args),
  isBiometricEnabled: (...args: unknown[]) => mockIsBiometricEnabled(...args),
  authenticate: (...args: unknown[]) => mockAuthenticate(...args),
  setBiometricEnabled: jest.fn().mockResolvedValue(undefined),
}));

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
};

jest.mock('@/services/wix/wixAuth', () => ({
  WixAuthService: jest.fn(() => mockAuthService),
}));

const faceIdStatus = { isAvailable: true, isEnrolled: true, biometricType: 'facial' as const };
const touchIdStatus = {
  isAvailable: true,
  isEnrolled: true,
  biometricType: 'fingerprint' as const,
};
const unavailableStatus = { isAvailable: false, isEnrolled: false, biometricType: 'none' as const };
const notEnrolledStatus = {
  isAvailable: true,
  isEnrolled: false,
  biometricType: 'facial' as const,
};

function renderLogin(props: Partial<React.ComponentProps<typeof LoginScreen>> = {}) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <LoginScreen {...props} />
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('LoginScreen — deeper edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.restoreSession.mockResolvedValue(false);
    mockAuthService.getCurrentMember.mockResolvedValue(null);
    mockGetBiometricStatus.mockResolvedValue(faceIdStatus);
    mockIsBiometricEnabled.mockResolvedValue(true);
    mockAuthenticate.mockResolvedValue({ success: true });
  });

  describe('Loading state', () => {
    it('disables submit button while auth is in flight', async () => {
      let resolveLogin!: (v: unknown) => void;
      mockAuthService.loginWithEmail.mockImplementation(
        () =>
          new Promise((res) => {
            resolveLogin = res;
          }),
      );

      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'user@example.com');
      fireEvent.changeText(getByTestId('login-password-input'), 'Password123');
      fireEvent.press(getByTestId('login-submit-button'));

      await waitFor(() =>
        expect(getByTestId('login-submit-button').props.accessibilityState?.disabled).toBe(true),
      );

      await act(async () => {
        resolveLogin({ success: true });
      });
    });

    it('shows loading spinner while auth is in flight', async () => {
      let resolveLogin!: (v: unknown) => void;
      mockAuthService.loginWithEmail.mockImplementation(
        () =>
          new Promise((res) => {
            resolveLogin = res;
          }),
      );

      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'user@example.com');
      fireEvent.changeText(getByTestId('login-password-input'), 'Password123');
      fireEvent.press(getByTestId('login-submit-button'));

      await waitFor(() => expect(getByTestId('login-loading')).toBeTruthy());

      await act(async () => {
        resolveLogin({ success: false, error: 'err' });
      });
    });

    it('re-enables submit button after auth failure', async () => {
      mockAuthService.loginWithEmail.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'bad@test.com');
      fireEvent.changeText(getByTestId('login-password-input'), 'Password123');
      fireEvent.press(getByTestId('login-submit-button'));

      await waitFor(() =>
        expect(getByTestId('login-submit-button').props.accessibilityState?.disabled).toBe(false),
      );
    });
  });

  describe('Network / thrown errors', () => {
    it('shows error banner when signIn throws a network error', async () => {
      mockAuthService.loginWithEmail.mockRejectedValue(new Error('Network request failed'));

      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'user@example.com');
      fireEvent.changeText(getByTestId('login-password-input'), 'Password123');
      fireEvent.press(getByTestId('login-submit-button'));

      await waitFor(() => expect(getByTestId('login-error')).toBeTruthy());
    });

    it('shows error banner when Google sign-in throws', async () => {
      mockAuthService.loginWithOAuth.mockRejectedValue(new Error('OAuth timeout'));

      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('google-sign-in-button')).toBeTruthy());
      fireEvent.press(getByTestId('google-sign-in-button'));

      await waitFor(() => expect(getByTestId('login-error')).toBeTruthy());
    });

    it('shows error banner when Apple sign-in throws', async () => {
      mockAuthService.loginWithApple.mockRejectedValue(new Error('Apple auth unavailable'));

      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('apple-sign-in-button')).toBeTruthy());
      fireEvent.press(getByTestId('apple-sign-in-button'));

      await waitFor(() => expect(getByTestId('login-error')).toBeTruthy());
    });
  });

  describe('Email validation edge cases', () => {
    it('rejects email with only whitespace', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), '   ');
      fireEvent.press(getByTestId('login-submit-button'));
      expect(getByTestId('login-email-error')).toBeTruthy();
    });

    it('rejects email missing domain', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'user@');
      fireEvent.press(getByTestId('login-submit-button'));
      expect(getByTestId('login-email-error')).toBeTruthy();
    });

    it('rejects email missing @', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'userexample.com');
      fireEvent.press(getByTestId('login-submit-button'));
      expect(getByTestId('login-email-error')).toBeTruthy();
    });

    it('does not call signIn when both fields are empty', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-submit-button')).toBeTruthy());
      fireEvent.press(getByTestId('login-submit-button'));
      expect(mockAuthService.loginWithEmail).not.toHaveBeenCalled();
    });

    it('does not call signIn when only email is valid', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'user@example.com');
      fireEvent.press(getByTestId('login-submit-button'));
      expect(mockAuthService.loginWithEmail).not.toHaveBeenCalled();
    });
  });

  describe('Error banner dismissal', () => {
    it('clears auth error when user types in email field after failure', async () => {
      mockAuthService.loginWithEmail.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const { getByTestId, queryByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'bad@test.com');
      fireEvent.changeText(getByTestId('login-password-input'), 'Pass1234');
      fireEvent.press(getByTestId('login-submit-button'));

      await waitFor(() => expect(getByTestId('login-error')).toBeTruthy());

      fireEvent.changeText(getByTestId('login-email-input'), 'new@test.com');
      await waitFor(() => expect(queryByTestId('login-error')).toBeNull());
    });

    it('clears auth error when user types in password field after failure', async () => {
      mockAuthService.loginWithEmail.mockResolvedValue({
        success: false,
        error: 'Wrong password',
      });

      const { getByTestId, queryByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'user@test.com');
      fireEvent.changeText(getByTestId('login-password-input'), 'WrongPass');
      fireEvent.press(getByTestId('login-submit-button'));

      await waitFor(() => expect(getByTestId('login-error')).toBeTruthy());

      fireEvent.changeText(getByTestId('login-password-input'), 'N');
      await waitFor(() => expect(queryByTestId('login-error')).toBeNull());
    });
  });

  describe('Biometric auth edge cases', () => {
    it('shows biometric button when hardware available and enrolled', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('biometric-sign-in-button')).toBeTruthy());
    });

    it('hides biometric button when hardware not available', async () => {
      mockGetBiometricStatus.mockResolvedValue(unavailableStatus);

      const { queryByTestId } = renderLogin();
      await waitFor(() => expect(queryByTestId('google-sign-in-button')).toBeTruthy());
      expect(queryByTestId('biometric-sign-in-button')).toBeNull();
    });

    it('hides biometric button when not enrolled', async () => {
      mockGetBiometricStatus.mockResolvedValue(notEnrolledStatus);

      const { queryByTestId } = renderLogin();
      await waitFor(() => expect(queryByTestId('google-sign-in-button')).toBeTruthy());
      expect(queryByTestId('biometric-sign-in-button')).toBeNull();
    });

    it('hides biometric button when user has not enabled biometric', async () => {
      mockIsBiometricEnabled.mockResolvedValue(false);

      const { queryByTestId } = renderLogin();
      await waitFor(() => expect(queryByTestId('google-sign-in-button')).toBeTruthy());
      expect(queryByTestId('biometric-sign-in-button')).toBeNull();
    });

    it('shows Face ID label when facial recognition available', async () => {
      mockGetBiometricStatus.mockResolvedValue(faceIdStatus);

      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('biometric-sign-in-button')).toBeTruthy());
      expect(getByTestId('biometric-sign-in-button').props.accessibilityLabel).toContain('Face ID');
    });

    it('shows Touch ID label when fingerprint available', async () => {
      mockGetBiometricStatus.mockResolvedValue(touchIdStatus);

      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('biometric-sign-in-button')).toBeTruthy());
      expect(getByTestId('biometric-sign-in-button').props.accessibilityLabel).toContain(
        'Touch ID',
      );
    });

    it('calls onBiometricSuccess when biometric auth succeeds', async () => {
      const onBiometricSuccess = jest.fn();
      mockAuthenticate.mockResolvedValue({ success: true });

      const { getByTestId } = renderLogin({ onBiometricSuccess });
      await waitFor(() => expect(getByTestId('biometric-sign-in-button')).toBeTruthy());
      fireEvent.press(getByTestId('biometric-sign-in-button'));

      await waitFor(() => expect(onBiometricSuccess).toHaveBeenCalledTimes(1));
    });

    it('does not call onBiometricSuccess when biometric auth fails', async () => {
      const onBiometricSuccess = jest.fn();
      mockAuthenticate.mockResolvedValue({ success: false, error: 'UserCancel' });

      const { getByTestId } = renderLogin({ onBiometricSuccess });
      await waitFor(() => expect(getByTestId('biometric-sign-in-button')).toBeTruthy());
      fireEvent.press(getByTestId('biometric-sign-in-button'));

      await waitFor(() => expect(mockAuthenticate).toHaveBeenCalled());
      expect(onBiometricSuccess).not.toHaveBeenCalled();
    });

    it('shows loading spinner during biometric authentication', async () => {
      let resolveBio!: (v: { success: boolean }) => void;
      mockAuthenticate.mockImplementation(
        () =>
          new Promise((res) => {
            resolveBio = res;
          }),
      );

      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('biometric-sign-in-button')).toBeTruthy());
      fireEvent.press(getByTestId('biometric-sign-in-button'));

      await waitFor(() => expect(getByTestId('biometric-loading')).toBeTruthy());

      await act(async () => {
        resolveBio({ success: false });
      });
    });
  });

  describe('Accessibility', () => {
    it('title has accessibilityRole header', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-title')).toBeTruthy());
      expect(getByTestId('login-title').props.accessibilityRole).toBe('header');
    });

    it('forgot password link has accessibilityRole link', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('forgot-password-link')).toBeTruthy());
      expect(getByTestId('forgot-password-link').props.accessibilityRole).toBe('link');
    });

    it('forgot password link has accessibilityHint', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('forgot-password-link')).toBeTruthy());
      expect(getByTestId('forgot-password-link').props.accessibilityHint).toBeTruthy();
    });

    it('sign-up link has accessibilityRole link', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('sign-up-link')).toBeTruthy());
      expect(getByTestId('sign-up-link').props.accessibilityRole).toBe('link');
    });

    it('sign-up link has descriptive accessibilityLabel', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('sign-up-link')).toBeTruthy());
      expect(getByTestId('sign-up-link').props.accessibilityLabel).toBeTruthy();
    });

    it('disabled submit button reflects disabled state via accessibilityState', async () => {
      let resolveLogin!: (v: unknown) => void;
      mockAuthService.loginWithEmail.mockImplementation(
        () =>
          new Promise((res) => {
            resolveLogin = res;
          }),
      );

      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'u@example.com');
      fireEvent.changeText(getByTestId('login-password-input'), 'Pass123');
      fireEvent.press(getByTestId('login-submit-button'));

      await waitFor(() =>
        expect(getByTestId('login-submit-button').props.accessibilityState?.disabled).toBe(true),
      );

      await act(async () => {
        resolveLogin({ success: false, error: 'err' });
      });
    });
  });

  describe('Rapid press / double submit prevention', () => {
    it('calls loginWithEmail exactly once on rapid double-press', async () => {
      let resolveLogin!: (v: unknown) => void;
      mockAuthService.loginWithEmail.mockImplementation(
        () =>
          new Promise((res) => {
            resolveLogin = res;
          }),
      );

      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'user@example.com');
      fireEvent.changeText(getByTestId('login-password-input'), 'Password123');

      fireEvent.press(getByTestId('login-submit-button'));
      fireEvent.press(getByTestId('login-submit-button'));

      await act(async () => {
        resolveLogin({ success: false, error: 'err' });
      });

      expect(mockAuthService.loginWithEmail).toHaveBeenCalledTimes(1);
    });
  });
});
