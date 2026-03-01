import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../LoginScreen';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/theme/ThemeProvider';

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

function renderLogin(props: Partial<React.ComponentProps<typeof LoginScreen>> = {}) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <LoginScreen {...props} />
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.restoreSession.mockResolvedValue(false);
    mockAuthService.getCurrentMember.mockResolvedValue(null);
  });

  describe('Rendering', () => {
    it('renders with default testID', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-screen')).toBeTruthy());
    });

    it('shows title', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-title')).toBeTruthy());
    });

    it('renders email input', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
    });

    it('renders password input', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-password-input')).toBeTruthy());
    });

    it('renders sign in button', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-submit-button')).toBeTruthy());
    });

    it('renders Google sign in button', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('google-sign-in-button')).toBeTruthy());
    });

    it('renders forgot password link', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('forgot-password-link')).toBeTruthy());
    });

    it('renders sign up link', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('sign-up-link')).toBeTruthy());
    });
  });

  describe('Form validation', () => {
    it('shows email error for empty email', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-submit-button')).toBeTruthy());
      fireEvent.press(getByTestId('login-submit-button'));
      expect(getByTestId('login-email-error')).toBeTruthy();
    });

    it('shows password error for empty password', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'test@test.com');
      fireEvent.press(getByTestId('login-submit-button'));
      expect(getByTestId('login-password-error')).toBeTruthy();
    });

    it('shows email error for invalid email', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'notanemail');
      fireEvent.press(getByTestId('login-submit-button'));
      expect(getByTestId('login-email-error')).toBeTruthy();
    });

    it('clears email error when typing', async () => {
      const { getByTestId, queryByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-submit-button')).toBeTruthy());
      fireEvent.press(getByTestId('login-submit-button'));
      expect(getByTestId('login-email-error')).toBeTruthy();
      fireEvent.changeText(getByTestId('login-email-input'), 'a');
      expect(queryByTestId('login-email-error')).toBeNull();
    });
  });

  describe('Navigation', () => {
    it('calls onSignUp when sign up link pressed', async () => {
      const onSignUp = jest.fn();
      const { getByTestId } = renderLogin({ onSignUp });
      await waitFor(() => expect(getByTestId('sign-up-link')).toBeTruthy());
      fireEvent.press(getByTestId('sign-up-link'));
      expect(onSignUp).toHaveBeenCalledTimes(1);
    });

    it('calls onForgotPassword when link pressed', async () => {
      const onForgotPassword = jest.fn();
      const { getByTestId } = renderLogin({ onForgotPassword });
      await waitFor(() => expect(getByTestId('forgot-password-link')).toBeTruthy());
      fireEvent.press(getByTestId('forgot-password-link'));
      expect(onForgotPassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('Auth errors', () => {
    it('shows auth error for bad credentials', async () => {
      mockAuthService.loginWithEmail.mockResolvedValue({
        success: false,
        error: 'Invalid email or password',
      });

      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'bad@test.com');
      fireEvent.changeText(getByTestId('login-password-input'), 'Pass1234');
      fireEvent.press(getByTestId('login-submit-button'));
      await waitFor(() => {
        expect(getByTestId('login-error')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('email input has accessibility label', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      expect(getByTestId('login-email-input').props.accessibilityLabel).toBe('Email address');
    });

    it('password input has accessibility label', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-password-input')).toBeTruthy());
      expect(getByTestId('login-password-input').props.accessibilityLabel).toBe('Password');
    });

    it('submit button has accessibility role', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-submit-button')).toBeTruthy());
      expect(getByTestId('login-submit-button').props.accessibilityRole).toBe('button');
    });
  });
});
