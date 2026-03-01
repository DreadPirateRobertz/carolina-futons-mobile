import React from 'react';
import { Platform } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SignUpScreen } from '../SignUpScreen';
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

function renderScreen(props: Partial<React.ComponentProps<typeof SignUpScreen>> = {}) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <SignUpScreen {...props} />
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('SignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.restoreSession.mockResolvedValue(false);
    mockAuthService.getCurrentMember.mockResolvedValue(null);
    mockAuthService.register.mockResolvedValue({ success: true });
  });

  describe('Rendering', () => {
    it('renders with default testID', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-screen')).toBeTruthy());
    });

    it('renders custom testID', async () => {
      const { getByTestId } = renderScreen({ testID: 'custom-signup' });
      await waitFor(() => expect(getByTestId('custom-signup')).toBeTruthy());
    });

    it('shows title', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-title')).toBeTruthy());
    });

    it('renders name input', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-name-input')).toBeTruthy());
    });

    it('renders email input', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-email-input')).toBeTruthy());
    });

    it('renders password input', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-password-input')).toBeTruthy());
    });

    it('renders submit button', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-submit-button')).toBeTruthy());
    });

    it('renders Google sign up button', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('google-signup-button')).toBeTruthy());
    });

    it('renders login link', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('login-link')).toBeTruthy());
    });
  });

  describe('Form validation — empty fields', () => {
    it('shows name error for empty name', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-submit-button')).toBeTruthy());
      fireEvent.press(getByTestId('signup-submit-button'));
      expect(getByTestId('signup-name-error')).toBeTruthy();
    });

    it('shows email error for empty email', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-submit-button')).toBeTruthy());
      fireEvent.changeText(getByTestId('signup-name-input'), 'Test User');
      fireEvent.press(getByTestId('signup-submit-button'));
      expect(getByTestId('signup-email-error')).toBeTruthy();
    });

    it('shows password error for empty password', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-submit-button')).toBeTruthy());
      fireEvent.changeText(getByTestId('signup-name-input'), 'Test User');
      fireEvent.changeText(getByTestId('signup-email-input'), 'test@test.com');
      fireEvent.press(getByTestId('signup-submit-button'));
      expect(getByTestId('signup-password-error')).toBeTruthy();
    });

    it('shows all errors at once when all fields empty', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-submit-button')).toBeTruthy());
      fireEvent.press(getByTestId('signup-submit-button'));
      expect(getByTestId('signup-name-error')).toBeTruthy();
      expect(getByTestId('signup-email-error')).toBeTruthy();
      expect(getByTestId('signup-password-error')).toBeTruthy();
    });
  });

  describe('Form validation — invalid input', () => {
    it('shows email error for invalid email format', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('signup-name-input'), 'Test User');
      fireEvent.changeText(getByTestId('signup-email-input'), 'notanemail');
      fireEvent.changeText(getByTestId('signup-password-input'), 'Pass1234');
      fireEvent.press(getByTestId('signup-submit-button'));
      expect(getByTestId('signup-email-error')).toBeTruthy();
    });

    it('does not call signUp when validation fails', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-submit-button')).toBeTruthy());
      fireEvent.press(getByTestId('signup-submit-button'));
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });
  });

  describe('Error clearing', () => {
    it('clears name error when typing', async () => {
      const { getByTestId, queryByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-submit-button')).toBeTruthy());
      fireEvent.press(getByTestId('signup-submit-button'));
      expect(getByTestId('signup-name-error')).toBeTruthy();
      fireEvent.changeText(getByTestId('signup-name-input'), 'a');
      expect(queryByTestId('signup-name-error')).toBeNull();
    });

    it('clears email error when typing', async () => {
      const { getByTestId, queryByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-submit-button')).toBeTruthy());
      fireEvent.press(getByTestId('signup-submit-button'));
      expect(getByTestId('signup-email-error')).toBeTruthy();
      fireEvent.changeText(getByTestId('signup-email-input'), 'a');
      expect(queryByTestId('signup-email-error')).toBeNull();
    });

    it('clears password error when typing', async () => {
      const { getByTestId, queryByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-submit-button')).toBeTruthy());
      fireEvent.press(getByTestId('signup-submit-button'));
      expect(getByTestId('signup-password-error')).toBeTruthy();
      fireEvent.changeText(getByTestId('signup-password-input'), 'a');
      expect(queryByTestId('signup-password-error')).toBeNull();
    });
  });

  describe('Auth errors', () => {
    it('shows error banner when signUp fails', async () => {
      mockAuthService.register.mockResolvedValue({
        success: false,
        error: 'Email already in use',
      });

      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-name-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('signup-name-input'), 'Test User');
      fireEvent.changeText(getByTestId('signup-email-input'), 'taken@test.com');
      fireEvent.changeText(getByTestId('signup-password-input'), 'Pass1234');
      fireEvent.press(getByTestId('signup-submit-button'));
      await waitFor(() => {
        expect(getByTestId('signup-error')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('calls onLogin when login link pressed', async () => {
      const onLogin = jest.fn();
      const { getByTestId } = renderScreen({ onLogin });
      await waitFor(() => expect(getByTestId('login-link')).toBeTruthy());
      fireEvent.press(getByTestId('login-link'));
      expect(onLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe('Social sign up', () => {
    it('calls signInWithGoogle when Google button pressed', async () => {
      mockAuthService.loginWithOAuth.mockResolvedValue({ success: true });
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('google-signup-button')).toBeTruthy());
      fireEvent.press(getByTestId('google-signup-button'));
      await waitFor(() => {
        expect(mockAuthService.loginWithOAuth).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('name input has accessibility label', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-name-input')).toBeTruthy());
      expect(getByTestId('signup-name-input').props.accessibilityLabel).toBe('Full name');
    });

    it('email input has accessibility label', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-email-input')).toBeTruthy());
      expect(getByTestId('signup-email-input').props.accessibilityLabel).toBe('Email address');
    });

    it('password input has accessibility label', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-password-input')).toBeTruthy());
      expect(getByTestId('signup-password-input').props.accessibilityLabel).toBe('Password');
    });

    it('submit button has accessibility role', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-submit-button')).toBeTruthy());
      expect(getByTestId('signup-submit-button').props.accessibilityRole).toBe('button');
    });

    it('title has header role', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('signup-title')).toBeTruthy());
      expect(getByTestId('signup-title').props.accessibilityRole).toBe('header');
    });
  });
});
