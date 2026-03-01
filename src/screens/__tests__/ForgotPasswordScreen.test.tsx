import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ForgotPasswordScreen } from '../ForgotPasswordScreen';
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

function renderForgotPassword(props: Partial<React.ComponentProps<typeof ForgotPasswordScreen>> = {}) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <ForgotPasswordScreen {...props} />
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.restoreSession.mockResolvedValue(false);
    mockAuthService.getCurrentMember.mockResolvedValue(null);
  });

  describe('Rendering', () => {
    it('renders with default testID', async () => {
      const { getByTestId } = renderForgotPassword();
      await waitFor(() => expect(getByTestId('forgot-password-screen')).toBeTruthy());
    });

    it('shows title', async () => {
      const { getByTestId } = renderForgotPassword();
      await waitFor(() => expect(getByTestId('forgot-title')).toBeTruthy());
    });

    it('renders email input', async () => {
      const { getByTestId } = renderForgotPassword();
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
    });

    it('renders submit button', async () => {
      const { getByTestId } = renderForgotPassword();
      await waitFor(() => expect(getByTestId('forgot-submit-button')).toBeTruthy());
    });

    it('renders back button when onBack provided', async () => {
      const { getByTestId } = renderForgotPassword({ onBack: jest.fn() });
      await waitFor(() => expect(getByTestId('forgot-back-button')).toBeTruthy());
    });

    it('hides back button when onBack not provided', async () => {
      const { queryByTestId } = renderForgotPassword();
      await waitFor(() => expect(queryByTestId('forgot-password-screen')).toBeTruthy());
      expect(queryByTestId('forgot-back-button')).toBeNull();
    });
  });

  describe('Form validation', () => {
    it('shows email error for empty email', async () => {
      const { getByTestId } = renderForgotPassword();
      await waitFor(() => expect(getByTestId('forgot-submit-button')).toBeTruthy());
      fireEvent.press(getByTestId('forgot-submit-button'));
      expect(getByTestId('forgot-email-error')).toBeTruthy();
    });

    it('shows email error for invalid email', async () => {
      const { getByTestId } = renderForgotPassword();
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('forgot-email-input'), 'notanemail');
      fireEvent.press(getByTestId('forgot-submit-button'));
      expect(getByTestId('forgot-email-error')).toBeTruthy();
    });

    it('clears email error when typing', async () => {
      const { getByTestId, queryByTestId } = renderForgotPassword();
      await waitFor(() => expect(getByTestId('forgot-submit-button')).toBeTruthy());
      fireEvent.press(getByTestId('forgot-submit-button'));
      expect(getByTestId('forgot-email-error')).toBeTruthy();
      fireEvent.changeText(getByTestId('forgot-email-input'), 'a');
      expect(queryByTestId('forgot-email-error')).toBeNull();
    });

    it('does not call resetPassword with validation errors', async () => {
      const { getByTestId } = renderForgotPassword();
      await waitFor(() => expect(getByTestId('forgot-submit-button')).toBeTruthy());
      fireEvent.press(getByTestId('forgot-submit-button'));
      expect(mockAuthService.sendPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('Success state', () => {
    it('shows success screen after valid submission', async () => {
      mockAuthService.sendPasswordReset.mockResolvedValue({ success: true });

      const { getByTestId } = renderForgotPassword();
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('forgot-email-input'), 'test@test.com');
      fireEvent.press(getByTestId('forgot-submit-button'));
      await waitFor(() => {
        expect(getByTestId('reset-success-title')).toBeTruthy();
      });
    });

    it('shows back to login button on success', async () => {
      mockAuthService.sendPasswordReset.mockResolvedValue({ success: true });

      const { getByTestId } = renderForgotPassword({ onBack: jest.fn() });
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('forgot-email-input'), 'test@test.com');
      fireEvent.press(getByTestId('forgot-submit-button'));
      await waitFor(() => {
        expect(getByTestId('back-to-login-button')).toBeTruthy();
      });
    });

    it('calls onBack when back-to-login pressed on success', async () => {
      const onBack = jest.fn();
      mockAuthService.sendPasswordReset.mockResolvedValue({ success: true });

      const { getByTestId } = renderForgotPassword({ onBack });
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('forgot-email-input'), 'test@test.com');
      fireEvent.press(getByTestId('forgot-submit-button'));
      await waitFor(() => expect(getByTestId('back-to-login-button')).toBeTruthy());
      fireEvent.press(getByTestId('back-to-login-button'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error state', () => {
    it('shows success even for unknown email (security: no email enumeration)', async () => {
      mockAuthService.sendPasswordReset.mockResolvedValue({ success: true });

      const { getByTestId } = renderForgotPassword();
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('forgot-email-input'), 'noone@test.com');
      fireEvent.press(getByTestId('forgot-submit-button'));
      await waitFor(() => {
        expect(getByTestId('reset-success-title')).toBeTruthy();
      });
    });

    it('shows loading state during submission', async () => {
      mockAuthService.sendPasswordReset.mockImplementation(() => new Promise(() => {}));

      const { getByTestId } = renderForgotPassword();
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('forgot-email-input'), 'test@test.com');
      fireEvent.press(getByTestId('forgot-submit-button'));
      await waitFor(() => {
        expect(getByTestId('forgot-loading')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('calls onBack when back button pressed', async () => {
      const onBack = jest.fn();
      const { getByTestId } = renderForgotPassword({ onBack });
      await waitFor(() => expect(getByTestId('forgot-back-button')).toBeTruthy());
      fireEvent.press(getByTestId('forgot-back-button'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('email input has accessibility label', async () => {
      const { getByTestId } = renderForgotPassword();
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
      expect(getByTestId('forgot-email-input').props.accessibilityLabel).toBe('Email address');
    });

    it('submit button has accessibility role', async () => {
      const { getByTestId } = renderForgotPassword();
      await waitFor(() => expect(getByTestId('forgot-submit-button')).toBeTruthy());
      expect(getByTestId('forgot-submit-button').props.accessibilityRole).toBe('button');
    });

    it('submit button has disabled state when loading', async () => {
      mockAuthService.sendPasswordReset.mockImplementation(() => new Promise(() => {}));

      const { getByTestId } = renderForgotPassword();
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('forgot-email-input'), 'test@test.com');
      fireEvent.press(getByTestId('forgot-submit-button'));
      await waitFor(() => {
        expect(getByTestId('forgot-submit-button').props.accessibilityState).toEqual({ disabled: true });
      });
    });
  });
});
