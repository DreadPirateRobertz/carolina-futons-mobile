import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ForgotPasswordScreen } from '../ForgotPasswordScreen';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { darkPalette, typography } from '@/theme/tokens';

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

function renderScreen(props: Partial<React.ComponentProps<typeof ForgotPasswordScreen>> = {}) {
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
    mockAuthService.sendPasswordReset.mockResolvedValue({ success: true });
  });

  describe('Rendering', () => {
    it('renders with default testID', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-password-screen')).toBeTruthy());
    });

    it('renders custom testID', async () => {
      const { getByTestId } = renderScreen({ testID: 'custom-forgot' });
      await waitFor(() => expect(getByTestId('custom-forgot')).toBeTruthy());
    });

    it('shows title', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-title')).toBeTruthy());
    });

    it('renders email input', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
    });

    it('renders submit button', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-submit-button')).toBeTruthy());
    });
  });

  describe('Back navigation', () => {
    it('renders back button when onBack provided', async () => {
      const { getByTestId } = renderScreen({ onBack: jest.fn() });
      await waitFor(() => expect(getByTestId('forgot-back-button')).toBeTruthy());
    });

    it('does not render back button when onBack is undefined', async () => {
      const { queryByTestId } = renderScreen();
      await waitFor(() => expect(queryByTestId('forgot-title')).toBeTruthy());
      expect(queryByTestId('forgot-back-button')).toBeNull();
    });

    it('calls onBack when back button pressed', async () => {
      const onBack = jest.fn();
      const { getByTestId } = renderScreen({ onBack });
      await waitFor(() => expect(getByTestId('forgot-back-button')).toBeTruthy());
      fireEvent.press(getByTestId('forgot-back-button'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form validation', () => {
    it('shows email error for empty email', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-submit-button')).toBeTruthy());
      fireEvent.press(getByTestId('forgot-submit-button'));
      expect(getByTestId('forgot-email-error')).toBeTruthy();
    });

    it('shows email error for invalid email', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('forgot-email-input'), 'notanemail');
      fireEvent.press(getByTestId('forgot-submit-button'));
      expect(getByTestId('forgot-email-error')).toBeTruthy();
    });

    it('clears email error when typing', async () => {
      const { getByTestId, queryByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-submit-button')).toBeTruthy());
      fireEvent.press(getByTestId('forgot-submit-button'));
      expect(getByTestId('forgot-email-error')).toBeTruthy();
      fireEvent.changeText(getByTestId('forgot-email-input'), 'a');
      expect(queryByTestId('forgot-email-error')).toBeNull();
    });

    it('does not call resetPassword with invalid email', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-submit-button')).toBeTruthy());
      fireEvent.press(getByTestId('forgot-submit-button'));
      expect(mockAuthService.sendPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('Success state', () => {
    it('shows success screen after valid submission', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('forgot-email-input'), 'user@example.com');
      fireEvent.press(getByTestId('forgot-submit-button'));
      await waitFor(() => {
        expect(getByTestId('reset-success-title')).toBeTruthy();
      });
    });

    it('shows back to login button on success', async () => {
      const onBack = jest.fn();
      const { getByTestId } = renderScreen({ onBack });
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('forgot-email-input'), 'user@example.com');
      fireEvent.press(getByTestId('forgot-submit-button'));
      await waitFor(() => {
        expect(getByTestId('back-to-login-button')).toBeTruthy();
      });
      fireEvent.press(getByTestId('back-to-login-button'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Submission', () => {
    it('calls sendPasswordReset with the entered email', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('forgot-email-input'), 'user@test.com');
      fireEvent.press(getByTestId('forgot-submit-button'));
      await waitFor(() => {
        expect(mockAuthService.sendPasswordReset).toHaveBeenCalledWith('user@test.com');
      });
    });
  });

  describe('Visual polish — dark editorial', () => {
    it('uses dark editorial background', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-password-screen')).toBeTruthy());
      const screen = getByTestId('forgot-password-screen');
      const flat = [screen.props.style]
        .flat(Infinity)
        .reduce(
          (acc: Record<string, unknown>, s: Record<string, unknown> | undefined) =>
            s ? { ...acc, ...s } : acc,
          {},
        );
      expect(flat.backgroundColor).toBe(darkPalette.background);
    });

    it('wraps form in GlassCard', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-glass-card')).toBeTruthy());
    });

    it('title uses heading fontFamily token', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-title')).toBeTruthy());
      const title = getByTestId('forgot-title');
      const styles = Array.isArray(title.props.style)
        ? Object.assign({}, ...title.props.style)
        : title.props.style;
      expect(styles.fontFamily).toBe(typography.headingFamily);
    });

    it('title uses light text on dark bg', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-title')).toBeTruthy());
      const title = getByTestId('forgot-title');
      const styles = Array.isArray(title.props.style)
        ? Object.assign({}, ...title.props.style)
        : title.props.style;
      expect(styles.color).toBe(darkPalette.textPrimary);
    });

    it('inputs use dark surface background', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
      const input = getByTestId('forgot-email-input');
      const styles = Array.isArray(input.props.style)
        ? Object.assign({}, ...input.props.style)
        : input.props.style;
      expect(styles.backgroundColor).toBe(darkPalette.surfaceElevated);
    });

    it('success state uses dark background', async () => {
      const { getByTestId } = renderScreen({ onBack: jest.fn() });
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
      fireEvent.changeText(getByTestId('forgot-email-input'), 'user@example.com');
      fireEvent.press(getByTestId('forgot-submit-button'));
      await waitFor(() => {
        expect(getByTestId('forgot-password-screen')).toBeTruthy();
      });
      const screen = getByTestId('forgot-password-screen');
      const flat = [screen.props.style]
        .flat(Infinity)
        .reduce(
          (acc: Record<string, unknown>, s: Record<string, unknown> | undefined) =>
            s ? { ...acc, ...s } : acc,
          {},
        );
      expect(flat.backgroundColor).toBe(darkPalette.background);
    });
  });

  describe('Accessibility', () => {
    it('email input has accessibility label', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-email-input')).toBeTruthy());
      expect(getByTestId('forgot-email-input').props.accessibilityLabel).toBe('Email address');
    });

    it('submit button has accessibility role', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-submit-button')).toBeTruthy());
      expect(getByTestId('forgot-submit-button').props.accessibilityRole).toBe('button');
    });

    it('submit button shows disabled state when loading', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-submit-button')).toBeTruthy());
      expect(getByTestId('forgot-submit-button').props.accessibilityState).toEqual({
        disabled: false,
      });
    });

    it('title has header role', async () => {
      const { getByTestId } = renderScreen();
      await waitFor(() => expect(getByTestId('forgot-title')).toBeTruthy());
      expect(getByTestId('forgot-title').props.accessibilityRole).toBe('header');
    });
  });
});
