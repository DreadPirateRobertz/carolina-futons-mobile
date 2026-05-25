/**
 * ForgotPasswordScreen edge-case tests — cm-1x7
 *
 * Covers gaps in forgotPasswordScreen.test.tsx:
 *  - Auth error banner: visible when useAuth.error is set; absent otherwise
 *  - Service error path: sent=true but error present → form shown, not success screen
 *  - Loading state: forgot-loading spinner, disabled button, accessibilityState
 *  - Success state details: email in message, title text, back-to-login a11y
 *  - Email validation edge cases: whitespace-only, missing domain, missing local part
 *  - Accessibility gaps: back button a11y, submit label, loading disabled state
 *  - Typing clears state: clearError called on keystroke
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ForgotPasswordScreen } from '../ForgotPasswordScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ─── Hook mock ────────────────────────────────────────────────────────────────

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => {
  const actual = jest.requireActual('@/hooks/useAuth');
  return {
    ...actual,
    useAuth: () => mockUseAuth(),
    AuthProvider: ({ children }: any) => children,
  };
});

// ─── Defaults ─────────────────────────────────────────────────────────────────

const mockResetPassword = jest.fn().mockResolvedValue(undefined);
const mockClearError = jest.fn();

function authDefaults(overrides: Record<string, unknown> = {}) {
  return {
    resetPassword: mockResetPassword,
    loading: false,
    error: null,
    clearError: mockClearError,
    ...overrides,
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderScreen(props: Partial<React.ComponentProps<typeof ForgotPasswordScreen>> = {}) {
  return render(
    <ThemeProvider>
      <ForgotPasswordScreen {...props} />
    </ThemeProvider>,
  );
}

// ─── beforeEach ───────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockResetPassword.mockResolvedValue(undefined);
  mockUseAuth.mockReturnValue(authDefaults());
});

// ─── Auth error banner ────────────────────────────────────────────────────────

describe('auth error banner', () => {
  it('forgot-error is absent when auth.error is null', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('forgot-error')).toBeNull();
  });

  it('forgot-error is rendered when auth.error is non-null', () => {
    mockUseAuth.mockReturnValue(authDefaults({ error: 'Service unavailable' }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('forgot-error')).toBeTruthy();
  });

  it('forgot-error displays the error message text from auth.error', () => {
    mockUseAuth.mockReturnValue(authDefaults({ error: 'Email address not found' }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('forgot-error').props.children).toBeTruthy();
    // Error text is in a child Text — verify via getByText
    const { getByText } = renderScreen();
    expect(getByText('Email address not found')).toBeTruthy();
  });

  it('form remains visible (no success screen) when service error is set after submit', async () => {
    const resetWithError = jest.fn().mockImplementation(async () => {
      mockUseAuth.mockReturnValue(
        authDefaults({ error: 'Email not found', resetPassword: resetWithError }),
      );
    });
    mockUseAuth.mockReturnValue(authDefaults({ resetPassword: resetWithError }));

    const { getByTestId, queryByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('forgot-email-input'), 'user@example.com');
    await act(async () => {
      fireEvent.press(getByTestId('forgot-submit-button'));
    });

    await waitFor(() => expect(getByTestId('forgot-error')).toBeTruthy());
    expect(queryByTestId('reset-success-title')).toBeNull();
  });

  it('forgot-error text matches the error returned by the auth service', async () => {
    const resetWithError = jest.fn().mockImplementation(async () => {
      mockUseAuth.mockReturnValue(
        authDefaults({ error: 'Too many requests — try again later', resetPassword: resetWithError }),
      );
    });
    mockUseAuth.mockReturnValue(authDefaults({ resetPassword: resetWithError }));

    const { getByTestId, getByText } = renderScreen();
    fireEvent.changeText(getByTestId('forgot-email-input'), 'user@example.com');
    await act(async () => {
      fireEvent.press(getByTestId('forgot-submit-button'));
    });

    await waitFor(() => expect(getByText('Too many requests — try again later')).toBeTruthy());
  });
});

// ─── Loading state ────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('forgot-loading spinner is visible when auth.loading is true', () => {
    mockUseAuth.mockReturnValue(authDefaults({ loading: true }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('forgot-loading')).toBeTruthy();
  });

  it('pressing submit while loading does not call resetPassword', () => {
    mockUseAuth.mockReturnValue(authDefaults({ loading: true }));
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('forgot-email-input'), 'user@example.com');
    fireEvent.press(getByTestId('forgot-submit-button'));
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('accessibilityState.disabled is true on submit button when loading', () => {
    mockUseAuth.mockReturnValue(authDefaults({ loading: true }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('forgot-submit-button').props.accessibilityState).toEqual({
      disabled: true,
    });
  });

  it('submit button text "Send Reset Link" is absent when loading', () => {
    mockUseAuth.mockReturnValue(authDefaults({ loading: true }));
    const { queryByText } = renderScreen();
    expect(queryByText('Send Reset Link')).toBeNull();
  });
});

// ─── Success state details ────────────────────────────────────────────────────

describe('success state details', () => {
  async function reachSuccessState(email = 'ada@example.com') {
    const utils = renderScreen({ onBack: jest.fn() });
    await act(async () => {});
    fireEvent.changeText(utils.getByTestId('forgot-email-input'), email);
    await act(async () => {
      fireEvent.press(utils.getByTestId('forgot-submit-button'));
    });
    await waitFor(() => expect(utils.getByTestId('reset-success-title')).toBeTruthy());
    return utils;
  }

  it('reset-success-title text is "Check Your Email"', async () => {
    const { getByTestId } = await reachSuccessState();
    expect(getByTestId('reset-success-title').props.children).toBe('Check Your Email');
  });

  it('success message contains the email that was submitted', async () => {
    const { getByText } = await reachSuccessState('ada@example.com');
    expect(getByText('ada@example.com')).toBeTruthy();
  });

  it('back-to-login-button has accessibilityLabel "Back to login"', async () => {
    const { getByTestId } = await reachSuccessState();
    expect(getByTestId('back-to-login-button').props.accessibilityLabel).toBe('Back to login');
  });

  it('back-to-login-button has accessibilityRole "button"', async () => {
    const { getByTestId } = await reachSuccessState();
    expect(getByTestId('back-to-login-button').props.accessibilityRole).toBe('button');
  });

  it('pressing back-to-login-button without onBack prop does not throw', async () => {
    // No onBack passed — onPress is undefined, press should be a no-op
    const utils = renderScreen(); // no onBack
    await act(async () => {});
    fireEvent.changeText(utils.getByTestId('forgot-email-input'), 'user@example.com');
    await act(async () => {
      fireEvent.press(utils.getByTestId('forgot-submit-button'));
    });
    await waitFor(() => expect(utils.getByTestId('back-to-login-button')).toBeTruthy());
    expect(() => fireEvent.press(utils.getByTestId('back-to-login-button'))).not.toThrow();
  });
});

// ─── Email validation edge cases ──────────────────────────────────────────────

describe('email validation edge cases', () => {
  function submit(utils: ReturnType<typeof renderScreen>) {
    fireEvent.press(utils.getByTestId('forgot-submit-button'));
  }

  it('whitespace-only email shows validation error and does not call resetPassword', () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('forgot-email-input'), '   ');
    submit({ getByTestId } as ReturnType<typeof renderScreen>);
    expect(getByTestId('forgot-email-error')).toBeTruthy();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('email missing domain ("user@") shows validation error', () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('forgot-email-input'), 'user@');
    submit({ getByTestId } as ReturnType<typeof renderScreen>);
    expect(getByTestId('forgot-email-error')).toBeTruthy();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('email missing local part ("@example.com") shows validation error', () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('forgot-email-input'), '@example.com');
    submit({ getByTestId } as ReturnType<typeof renderScreen>);
    expect(getByTestId('forgot-email-error')).toBeTruthy();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('email with embedded space ("user @example.com") shows validation error', () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('forgot-email-input'), 'user @example.com');
    submit({ getByTestId } as ReturnType<typeof renderScreen>);
    expect(getByTestId('forgot-email-error')).toBeTruthy();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('well-formed email passes validation and calls resetPassword', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('forgot-email-input'), 'valid.user+tag@example.org');
    fireEvent.press(getByTestId('forgot-submit-button'));
    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('valid.user+tag@example.org');
    });
  });
});

// ─── Accessibility gaps ───────────────────────────────────────────────────────

describe('accessibility gaps', () => {
  it('forgot-back-button has accessibilityLabel "Go back"', async () => {
    const { getByTestId } = renderScreen({ onBack: jest.fn() });
    await waitFor(() => expect(getByTestId('forgot-back-button')).toBeTruthy());
    expect(getByTestId('forgot-back-button').props.accessibilityLabel).toBe('Go back');
  });

  it('forgot-back-button has accessibilityRole "button"', async () => {
    const { getByTestId } = renderScreen({ onBack: jest.fn() });
    await waitFor(() => expect(getByTestId('forgot-back-button')).toBeTruthy());
    expect(getByTestId('forgot-back-button').props.accessibilityRole).toBe('button');
  });

  it('forgot-submit-button has accessibilityLabel "Send reset link"', async () => {
    const { getByTestId } = renderScreen();
    await waitFor(() => expect(getByTestId('forgot-submit-button')).toBeTruthy());
    expect(getByTestId('forgot-submit-button').props.accessibilityLabel).toBe('Send reset link');
  });
});

// ─── Typing clears state ──────────────────────────────────────────────────────

describe('typing clears state', () => {
  it('typing into email input calls clearError', () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('forgot-email-input'), 'a');
    expect(mockClearError).toHaveBeenCalledTimes(1);
  });

  it('typing when auth error is present calls clearError to dismiss it', () => {
    mockUseAuth.mockReturnValue(authDefaults({ error: 'Previous error' }));
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('forgot-email-input'), 'new@value.com');
    expect(mockClearError).toHaveBeenCalled();
  });

  it('subtitle text is visible in the form', () => {
    const { getByText } = renderScreen();
    expect(getByText(/send you a reset link/i)).toBeTruthy();
  });
});
