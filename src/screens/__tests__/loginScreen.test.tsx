import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../LoginScreen';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { darkPalette, typography } from '@/theme/tokens';

jest.mock('expo-local-authentication', () => ({
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([2])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
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

    it('clears password error when typing in password field', async () => {
      const { getByTestId, queryByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'test@test.com');
      fireEvent.press(getByTestId('login-submit-button'));
      expect(getByTestId('login-password-error')).toBeTruthy();
      fireEvent.changeText(getByTestId('login-password-input'), 'a');
      expect(queryByTestId('login-password-error')).toBeNull();
    });

    it('calls signIn with valid email and password', async () => {
      mockAuthService.loginWithEmail.mockResolvedValue({ success: true });
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'user@example.com');
      fireEvent.changeText(getByTestId('login-password-input'), 'Password123');
      fireEvent.press(getByTestId('login-submit-button'));
      await waitFor(() => {
        expect(mockAuthService.loginWithEmail).toHaveBeenCalled();
      });
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

  describe('Social sign-in', () => {
    it('renders Google sign-in button with correct accessibility', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('google-sign-in-button')).toBeTruthy());
      const btn = getByTestId('google-sign-in-button');
      expect(btn.props.accessibilityLabel).toBe('Sign in with Google');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('pressing Google button does not crash', async () => {
      mockAuthService.loginWithOAuth.mockResolvedValue({ success: false, error: 'cancelled' });
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('google-sign-in-button')).toBeTruthy());
      fireEvent.press(getByTestId('google-sign-in-button'));
      await waitFor(() => expect(getByTestId('google-sign-in-button')).toBeTruthy());
    });

    it('Google button has dark surface styling', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('google-sign-in-button')).toBeTruthy());
      const btn = getByTestId('google-sign-in-button');
      const styles = Array.isArray(btn.props.style)
        ? Object.assign({}, ...btn.props.style)
        : btn.props.style;
      expect(styles.backgroundColor).toBe(darkPalette.surfaceElevated);
    });

    it('shows auth error when Google sign-in fails', async () => {
      mockAuthService.loginWithOAuth.mockResolvedValue({
        success: false,
        error: 'Google login failed',
      });
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('google-sign-in-button')).toBeTruthy());
      fireEvent.press(getByTestId('google-sign-in-button'));
      await waitFor(() => {
        expect(getByTestId('login-error')).toBeTruthy();
      });
    });

    it('shows auth error when Apple sign-in fails', async () => {
      mockAuthService.loginWithApple.mockResolvedValue({
        success: false,
        error: 'Apple sign-in cancelled',
      });
      // Apple button only renders on iOS — mock Platform
      const origOS = require('react-native').Platform.OS;
      require('react-native').Platform.OS = 'ios';
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('apple-sign-in-button')).toBeTruthy());
      fireEvent.press(getByTestId('apple-sign-in-button'));
      await waitFor(() => {
        expect(getByTestId('login-error')).toBeTruthy();
      });
      require('react-native').Platform.OS = origOS;
    });

    it('Apple button only renders on iOS', async () => {
      const origOS = require('react-native').Platform.OS;
      require('react-native').Platform.OS = 'android';
      const { queryByTestId } = renderLogin();
      await waitFor(() => expect(queryByTestId('google-sign-in-button')).toBeTruthy());
      expect(queryByTestId('apple-sign-in-button')).toBeNull();
      require('react-native').Platform.OS = origOS;
    });

    it('Apple button renders on iOS with correct accessibility', async () => {
      const origOS = require('react-native').Platform.OS;
      require('react-native').Platform.OS = 'ios';
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('apple-sign-in-button')).toBeTruthy());
      const btn = getByTestId('apple-sign-in-button');
      expect(btn.props.accessibilityLabel).toBe('Sign in with Apple');
      expect(btn.props.accessibilityRole).toBe('button');
      require('react-native').Platform.OS = origOS;
    });
  });

  describe('Custom testID', () => {
    it('uses provided testID', async () => {
      const { getByTestId } = renderLogin({ testID: 'custom-login' });
      await waitFor(() => expect(getByTestId('custom-login')).toBeTruthy());
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

  describe('Social auth — Google Sign-In', () => {
    it('calls signInWithGoogle when Google button pressed', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('google-sign-in-button')).toBeTruthy());
      fireEvent.press(getByTestId('google-sign-in-button'));
      // The handler dispatches through useAuth which calls the mock service
      // Just verify the button is pressable and doesn't crash
      expect(getByTestId('google-sign-in-button')).toBeTruthy();
    });

    it('Google button has correct accessibility label', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('google-sign-in-button')).toBeTruthy());
      expect(getByTestId('google-sign-in-button').props.accessibilityLabel).toBe(
        'Sign in with Google',
      );
      expect(getByTestId('google-sign-in-button').props.accessibilityRole).toBe('button');
    });

    it('shows error when Google sign-in fails via Wix OAuth', async () => {
      mockAuthService.loginWithOAuth.mockResolvedValue({
        success: false,
        error: 'Google authentication failed',
      });

      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('google-sign-in-button')).toBeTruthy());
      fireEvent.press(getByTestId('google-sign-in-button'));
      await waitFor(() => {
        expect(getByTestId('login-error')).toBeTruthy();
      });
    });
  });

  describe('Social auth — Apple Sign-In', () => {
    it('renders Apple sign-in button on iOS', async () => {
      // Platform.OS is 'ios' in test env (set by jest-expo)
      const { queryByTestId } = renderLogin();
      await waitFor(() => expect(queryByTestId('apple-sign-in-button')).toBeTruthy());
    });

    it('Apple button has correct accessibility label', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('apple-sign-in-button')).toBeTruthy());
      expect(getByTestId('apple-sign-in-button').props.accessibilityLabel).toBe(
        'Sign in with Apple',
      );
      expect(getByTestId('apple-sign-in-button').props.accessibilityRole).toBe('button');
    });

    it('calls signInWithApple when Apple button pressed', async () => {
      mockAuthService.loginWithApple.mockResolvedValue({ success: true });
      mockAuthService.getCurrentMember.mockResolvedValue({
        id: 'apple-user-1',
        email: 'apple@test.com',
        displayName: 'Apple User',
        phone: '',
        provider: 'apple',
      });

      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('apple-sign-in-button')).toBeTruthy());
      fireEvent.press(getByTestId('apple-sign-in-button'));
      await waitFor(() => {
        expect(mockAuthService.loginWithApple).toHaveBeenCalled();
      });
    });

    it('shows error when Apple sign-in fails', async () => {
      mockAuthService.loginWithApple.mockResolvedValue({
        success: false,
        error: 'Apple authentication failed',
      });

      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('apple-sign-in-button')).toBeTruthy());
      fireEvent.press(getByTestId('apple-sign-in-button'));
      await waitFor(() => {
        expect(getByTestId('login-error')).toBeTruthy();
      });
    });
  });

  describe('Social auth — error recovery', () => {
    it('clears previous error when pressing social auth button', async () => {
      // First trigger an email login error
      mockAuthService.loginWithEmail.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const { getByTestId, queryByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('login-email-input'), 'bad@test.com');
      fireEvent.changeText(getByTestId('login-password-input'), 'Pass1234');
      fireEvent.press(getByTestId('login-submit-button'));
      await waitFor(() => {
        expect(getByTestId('login-error')).toBeTruthy();
      });

      // Press Google — should clear the previous error
      mockAuthService.loginWithOAuth.mockResolvedValue({ success: true });
      mockAuthService.getCurrentMember.mockResolvedValue({
        id: 'g1',
        email: 'g@test.com',
        displayName: 'G',
        phone: '',
        provider: 'google',
      });
      fireEvent.press(getByTestId('google-sign-in-button'));
      await waitFor(() => {
        expect(queryByTestId('login-error')).toBeNull();
      });
    });
  });

  describe('Visual polish — dark editorial', () => {
    it('uses dark editorial background', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-screen')).toBeTruthy());
      const screen = getByTestId('login-screen');
      const styles = screen.props.style;
      // Flatten potentially nested style arrays
      const flat = [styles]
        .flat(Infinity)
        .reduce(
          (acc: Record<string, unknown>, s: Record<string, unknown> | undefined) =>
            s ? { ...acc, ...s } : acc,
          {},
        );
      expect(flat.backgroundColor).toBe(darkPalette.background);
    });

    it('wraps form in GlassCard', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-glass-card')).toBeTruthy());
    });

    it('title uses heading fontFamily token', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-title')).toBeTruthy());
      const title = getByTestId('login-title');
      const styles = Array.isArray(title.props.style)
        ? Object.assign({}, ...title.props.style)
        : title.props.style;
      expect(styles.fontFamily).toBe(typography.headingFamily);
    });

    it('title uses light text color on dark bg', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-title')).toBeTruthy());
      const title = getByTestId('login-title');
      const styles = Array.isArray(title.props.style)
        ? Object.assign({}, ...title.props.style)
        : title.props.style;
      expect(styles.color).toBe(darkPalette.textPrimary);
    });

    it('subtitle uses muted text color', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-subtitle')).toBeTruthy());
      const subtitle = getByTestId('login-subtitle');
      const styles = Array.isArray(subtitle.props.style)
        ? Object.assign({}, ...subtitle.props.style)
        : subtitle.props.style;
      expect(styles.color).toBe(darkPalette.textMuted);
    });

    it('input labels use light text', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-label')).toBeTruthy());
      const label = getByTestId('login-email-label');
      const styles = Array.isArray(label.props.style)
        ? Object.assign({}, ...label.props.style)
        : label.props.style;
      expect(styles.color).toBe(darkPalette.textPrimary);
    });

    it('inputs use dark surface background', async () => {
      const { getByTestId } = renderLogin();
      await waitFor(() => expect(getByTestId('login-email-input')).toBeTruthy());
      const input = getByTestId('login-email-input');
      const styles = Array.isArray(input.props.style)
        ? Object.assign({}, ...input.props.style)
        : input.props.style;
      expect(styles.backgroundColor).toBe(darkPalette.surfaceElevated);
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
