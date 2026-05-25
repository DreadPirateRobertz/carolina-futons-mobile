/**
 * SignUpScreen deeper edge-case tests — cm-2n8
 *
 * Covers gaps in signUpScreen.test.tsx:
 * - Password strength sub-rules (too short, no uppercase, no number)
 * - Name length boundary (1-char, whitespace-only)
 * - Email whitespace / boundary inputs
 * - Exact error message text for each validation rule
 * - Loading state (spinner, disabled submit, disabled social buttons, a11y state)
 * - Auth error banner cleared by typing in any field
 * - register() throws an exception → error banner shown
 * - Google cancelled flow → no error banner
 * - Google error result → error banner shown
 * - Apple button absent on Android (Platform.OS guard)
 * - Login link safe to press without onLogin prop
 * - Very long inputs (boundary — no crash)
 * - Special characters / XSS vectors in fields (no crash)
 * - Submit button text and password secureTextEntry
 */
import React from 'react';
import { Platform } from 'react-native';
import { render, fireEvent, waitFor, act, within } from '@testing-library/react-native';
import { SignUpScreen } from '../SignUpScreen';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Mocks (mirrors signUpScreen.test.tsx) ─────────────────────────────────────

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

const mockGooglePromptAsync = jest.fn();

jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: jest.fn(() => [null, null, mockGooglePromptAsync]),
}));

jest.mock('@/services/googleAuth', () => ({
  googleAuthConfig: {
    iosClientId: '',
    androidClientId: '',
    webClientId: 'test-google-web-client-id',
  },
  isGoogleAuthConfigured: jest.fn(() => true),
  decodeGoogleIdToken: jest.fn(() => ({
    sub: 'google-sub-123',
    email: 'google@test.com',
    name: 'Google User',
  })),
  saveGoogleSession: jest.fn(),
  loadGoogleSession: jest.fn().mockResolvedValue(null),
  clearGoogleSession: jest.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderScreen(props: Partial<React.ComponentProps<typeof SignUpScreen>> = {}) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <SignUpScreen {...props} />
      </AuthProvider>
    </ThemeProvider>,
  );
}

/** Fill name + email + password then press submit. */
async function fillAndSubmit(
  utils: ReturnType<typeof renderScreen>,
  {
    name = 'Test User',
    email = 'test@example.com',
    password = 'Pass1234',
  }: { name?: string; email?: string; password?: string } = {},
) {
  const { getByTestId } = utils;
  await waitFor(() => expect(getByTestId('signup-submit-button')).toBeTruthy());
  if (name !== '') fireEvent.changeText(getByTestId('signup-name-input'), name);
  if (email !== '') fireEvent.changeText(getByTestId('signup-email-input'), email);
  if (password !== '') fireEvent.changeText(getByTestId('signup-password-input'), password);
  fireEvent.press(getByTestId('signup-submit-button'));
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthService.restoreSession.mockResolvedValue(false);
  mockAuthService.getCurrentMember.mockResolvedValue(null);
  mockAuthService.register.mockResolvedValue({ success: true });
  mockGooglePromptAsync.mockResolvedValue({ type: 'success', params: { id_token: 'tok' } });
});

// ── Password validation sub-rules ─────────────────────────────────────────────

describe('password validation sub-rules', () => {
  it('shows error for password shorter than 8 characters', async () => {
    const utils = renderScreen();
    await fillAndSubmit(utils, { password: 'Ab1' });
    expect(utils.getByTestId('signup-password-error')).toBeTruthy();
    expect(utils.getByText('Password must be at least 8 characters')).toBeTruthy();
  });

  it('shows error for password with no uppercase letter', async () => {
    const utils = renderScreen();
    await fillAndSubmit(utils, { password: 'password1' });
    expect(utils.getByTestId('signup-password-error')).toBeTruthy();
    expect(utils.getByText('Password must contain an uppercase letter')).toBeTruthy();
  });

  it('shows error for password with no number', async () => {
    const utils = renderScreen();
    await fillAndSubmit(utils, { password: 'Password' });
    expect(utils.getByTestId('signup-password-error')).toBeTruthy();
    expect(utils.getByText('Password must contain a number')).toBeTruthy();
  });

  it('accepts exactly 8-character valid password', async () => {
    const utils = renderScreen();
    await fillAndSubmit(utils, { password: 'Pass123!' });
    await waitFor(() => expect(utils.queryByTestId('signup-password-error')).toBeNull());
    expect(mockAuthService.register).toHaveBeenCalled();
  });
});

// ── Name validation sub-rules ─────────────────────────────────────────────────

describe('name validation sub-rules', () => {
  it('shows error for single-character name', async () => {
    const utils = renderScreen();
    await fillAndSubmit(utils, { name: 'A' });
    expect(utils.getByTestId('signup-name-error')).toBeTruthy();
    expect(utils.getByText('Name must be at least 2 characters')).toBeTruthy();
  });

  it('shows "Name is required" error for whitespace-only name', async () => {
    const utils = renderScreen();
    await waitFor(() => expect(utils.getByTestId('signup-submit-button')).toBeTruthy());
    fireEvent.changeText(utils.getByTestId('signup-name-input'), '   ');
    fireEvent.press(utils.getByTestId('signup-submit-button'));
    expect(utils.getByTestId('signup-name-error')).toBeTruthy();
    expect(utils.getByText('Name is required')).toBeTruthy();
  });

  it('accepts two-character name', async () => {
    const utils = renderScreen();
    await fillAndSubmit(utils, { name: 'Jo' });
    await waitFor(() => expect(utils.queryByTestId('signup-name-error')).toBeNull());
    expect(mockAuthService.register).toHaveBeenCalled();
  });
});

// ── Email validation sub-rules ────────────────────────────────────────────────

describe('email validation sub-rules', () => {
  it('shows "Email is required" error for whitespace-only email', async () => {
    const utils = renderScreen();
    await waitFor(() => expect(utils.getByTestId('signup-submit-button')).toBeTruthy());
    fireEvent.changeText(utils.getByTestId('signup-name-input'), 'Test User');
    fireEvent.changeText(utils.getByTestId('signup-email-input'), '   ');
    fireEvent.changeText(utils.getByTestId('signup-password-input'), 'Pass1234');
    fireEvent.press(utils.getByTestId('signup-submit-button'));
    expect(utils.getByTestId('signup-email-error')).toBeTruthy();
    expect(utils.getByText('Email is required')).toBeTruthy();
  });

  it('shows error for email missing domain extension', async () => {
    const utils = renderScreen();
    await fillAndSubmit(utils, { email: 'user@nodot' });
    expect(utils.getByTestId('signup-email-error')).toBeTruthy();
  });

  it('shows error for email missing @ symbol', async () => {
    const utils = renderScreen();
    await fillAndSubmit(utils, { email: 'userexample.com' });
    expect(utils.getByTestId('signup-email-error')).toBeTruthy();
    expect(utils.getByText('Invalid email address')).toBeTruthy();
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('shows BrandedSpinner and hides button text while loading', async () => {
    let resolveRegister!: (v: { success: boolean }) => void;
    mockAuthService.register.mockReturnValue(
      new Promise<{ success: boolean }>((res) => {
        resolveRegister = res;
      }),
    );
    const utils = renderScreen();
    await fillAndSubmit(utils);
    expect(utils.getByTestId('signup-loading')).toBeTruthy();
    // Button itself should contain no Text child (spinner replaced it)
    const btn = utils.getByTestId('signup-submit-button');
    expect(within(btn).queryByText('Create Account')).toBeNull();
    await act(async () => resolveRegister({ success: false, error: 'err' } as any));
  });

  it('submit button is disabled while loading', async () => {
    let resolveRegister!: (v: { success: boolean }) => void;
    mockAuthService.register.mockReturnValue(
      new Promise<{ success: boolean }>((res) => {
        resolveRegister = res;
      }),
    );
    const utils = renderScreen();
    await fillAndSubmit(utils);
    const btn = utils.getByTestId('signup-submit-button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
    await act(async () => resolveRegister({ success: false, error: 'err' } as any));
  });

  it('Google button is disabled while loading', async () => {
    let resolveRegister!: (v: { success: boolean }) => void;
    mockAuthService.register.mockReturnValue(
      new Promise<{ success: boolean }>((res) => {
        resolveRegister = res;
      }),
    );
    const utils = renderScreen();
    await fillAndSubmit(utils);
    const googleBtn = utils.getByTestId('google-signup-button');
    expect(googleBtn.props.accessibilityState?.disabled).toBe(true);
    await act(async () => resolveRegister({ success: false, error: 'err' } as any));
  });

  it('spinner disappears after register resolves', async () => {
    mockAuthService.register.mockResolvedValue({ success: false, error: 'Dup email' });
    const utils = renderScreen();
    await fillAndSubmit(utils);
    await waitFor(() => expect(utils.queryByTestId('signup-loading')).toBeNull());
  });
});

// ── clearError on field change ────────────────────────────────────────────────

describe('clearError on field change clears auth error banner', () => {
  beforeEach(() => {
    mockAuthService.register.mockResolvedValue({
      success: false,
      error: 'Email already in use',
    });
  });

  it('typing in name field clears the auth error banner', async () => {
    const utils = renderScreen();
    await fillAndSubmit(utils);
    await waitFor(() => expect(utils.getByTestId('signup-error')).toBeTruthy());
    fireEvent.changeText(utils.getByTestId('signup-name-input'), 'New');
    await waitFor(() => expect(utils.queryByTestId('signup-error')).toBeNull());
  });

  it('typing in email field clears the auth error banner', async () => {
    const utils = renderScreen();
    await fillAndSubmit(utils);
    await waitFor(() => expect(utils.getByTestId('signup-error')).toBeTruthy());
    fireEvent.changeText(utils.getByTestId('signup-email-input'), 'new@example.com');
    await waitFor(() => expect(utils.queryByTestId('signup-error')).toBeNull());
  });

  it('typing in password field clears the auth error banner', async () => {
    const utils = renderScreen();
    await fillAndSubmit(utils);
    await waitFor(() => expect(utils.getByTestId('signup-error')).toBeTruthy());
    fireEvent.changeText(utils.getByTestId('signup-password-input'), 'NewPass1');
    await waitFor(() => expect(utils.queryByTestId('signup-error')).toBeNull());
  });
});

// ── register() throws exception ───────────────────────────────────────────────

describe('register throws an exception', () => {
  it('shows auth error banner when register rejects', async () => {
    mockAuthService.register.mockRejectedValue(new Error('Network timeout'));
    const utils = renderScreen();
    await fillAndSubmit(utils);
    await waitFor(() => expect(utils.getByTestId('signup-error')).toBeTruthy());
  });

  it('error banner text matches the thrown error message', async () => {
    mockAuthService.register.mockRejectedValue(new Error('Network timeout'));
    const utils = renderScreen();
    await fillAndSubmit(utils);
    await waitFor(() => expect(utils.getByText('Network timeout')).toBeTruthy());
  });
});

// ── Google sign-in flow variants ──────────────────────────────────────────────

describe('Google sign-in flow variants', () => {
  it('does not show error banner when Google prompt is cancelled (dismiss)', async () => {
    mockGooglePromptAsync.mockResolvedValue({ type: 'dismiss' });
    const utils = renderScreen();
    await waitFor(() => expect(utils.getByTestId('google-signup-button')).toBeTruthy());
    await act(async () => {
      fireEvent.press(utils.getByTestId('google-signup-button'));
    });
    await waitFor(() => expect(utils.queryByTestId('signup-error')).toBeNull());
  });

  it('shows error banner when Google prompt returns error type', async () => {
    mockGooglePromptAsync.mockResolvedValue({
      type: 'error',
      error: { message: 'Google auth error' },
    });
    const utils = renderScreen();
    await waitFor(() => expect(utils.getByTestId('google-signup-button')).toBeTruthy());
    await act(async () => {
      fireEvent.press(utils.getByTestId('google-signup-button'));
    });
    await waitFor(() => expect(utils.getByTestId('signup-error')).toBeTruthy());
  });

  it('shows fallback message when Google error has no message', async () => {
    mockGooglePromptAsync.mockResolvedValue({ type: 'error', error: null });
    const utils = renderScreen();
    await waitFor(() => expect(utils.getByTestId('google-signup-button')).toBeTruthy());
    await act(async () => {
      fireEvent.press(utils.getByTestId('google-signup-button'));
    });
    await waitFor(() => expect(utils.getByTestId('signup-error')).toBeTruthy());
    expect(utils.getByText('Google sign-in failed')).toBeTruthy();
  });
});

// ── Apple button platform guard ───────────────────────────────────────────────

describe('Apple button platform guard', () => {
  it('Apple sign-up button is absent on Android', () => {
    const originalOS = Platform.OS;
    (Platform as any).OS = 'android';
    const utils = renderScreen();
    expect(utils.queryByTestId('apple-signup-button')).toBeNull();
    (Platform as any).OS = originalOS;
  });

  it('Apple sign-up button is present on iOS', () => {
    const originalOS = Platform.OS;
    (Platform as any).OS = 'ios';
    const utils = renderScreen();
    expect(utils.queryByTestId('apple-signup-button')).toBeTruthy();
    (Platform as any).OS = originalOS;
  });
});

// ── Login link safety ─────────────────────────────────────────────────────────

describe('login link without onLogin prop', () => {
  it('does not crash when login link pressed and onLogin is undefined', async () => {
    const utils = renderScreen(); // no onLogin
    await waitFor(() => expect(utils.getByTestId('login-link')).toBeTruthy());
    expect(() => fireEvent.press(utils.getByTestId('login-link'))).not.toThrow();
  });
});

// ── Boundary inputs ───────────────────────────────────────────────────────────

describe('boundary / long inputs', () => {
  it('handles very long name without crash', async () => {
    const longName = 'A'.repeat(200);
    const utils = renderScreen();
    await waitFor(() => expect(utils.getByTestId('signup-name-input')).toBeTruthy());
    expect(() =>
      fireEvent.changeText(utils.getByTestId('signup-name-input'), longName),
    ).not.toThrow();
  });

  it('handles very long email without crash', async () => {
    const longEmail = 'a'.repeat(100) + '@' + 'b'.repeat(100) + '.com';
    const utils = renderScreen();
    await waitFor(() => expect(utils.getByTestId('signup-email-input')).toBeTruthy());
    expect(() =>
      fireEvent.changeText(utils.getByTestId('signup-email-input'), longEmail),
    ).not.toThrow();
  });

  it('handles very long password without crash', async () => {
    const longPass = 'Pass1' + 'x'.repeat(200);
    const utils = renderScreen();
    await waitFor(() => expect(utils.getByTestId('signup-password-input')).toBeTruthy());
    expect(() =>
      fireEvent.changeText(utils.getByTestId('signup-password-input'), longPass),
    ).not.toThrow();
  });
});

// ── Special characters / XSS vectors ─────────────────────────────────────────

describe('special characters in inputs', () => {
  it('renders without crash when name contains HTML-like content', async () => {
    const utils = renderScreen();
    await waitFor(() => expect(utils.getByTestId('signup-name-input')).toBeTruthy());
    expect(() =>
      fireEvent.changeText(utils.getByTestId('signup-name-input'), '<script>alert(1)</script>'),
    ).not.toThrow();
  });

  it('name with special chars passes 2-char minimum check and reaches register', async () => {
    const utils = renderScreen();
    await fillAndSubmit(utils, { name: '"><img onerror=1>' });
    // Email/password are valid; name is long enough — register should be called
    await waitFor(() => expect(mockAuthService.register).toHaveBeenCalled());
  });

  it('SQL injection in email is treated as invalid format', async () => {
    const utils = renderScreen();
    await fillAndSubmit(utils, { email: "' OR 1=1 --" });
    expect(utils.getByTestId('signup-email-error')).toBeTruthy();
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });
});

// ── Submit button and form field attributes ───────────────────────────────────

describe('form field and button attributes', () => {
  it('password input has secureTextEntry=true', async () => {
    const utils = renderScreen();
    await waitFor(() => expect(utils.getByTestId('signup-password-input')).toBeTruthy());
    expect(utils.getByTestId('signup-password-input').props.secureTextEntry).toBe(true);
  });

  it('submit button shows "Create Account" text when not loading', async () => {
    const utils = renderScreen();
    await waitFor(() => expect(utils.getByTestId('signup-submit-button')).toBeTruthy());
    const btn = utils.getByTestId('signup-submit-button');
    expect(within(btn).getByText('Create Account')).toBeTruthy();
  });

  it('subtitle text is correct', async () => {
    const utils = renderScreen();
    await waitFor(() =>
      expect(utils.getByText('Join Carolina Futons for handcrafted comfort')).toBeTruthy(),
    );
  });
});

// ── Sequential submit (re-validation) ────────────────────────────────────────

describe('sequential submit re-validation', () => {
  it('fixing a field and re-submitting clears that field error', async () => {
    const utils = renderScreen();
    await waitFor(() => expect(utils.getByTestId('signup-submit-button')).toBeTruthy());
    // First submit: all fields empty → all three errors
    fireEvent.press(utils.getByTestId('signup-submit-button'));
    expect(utils.getByTestId('signup-name-error')).toBeTruthy();
    expect(utils.getByTestId('signup-email-error')).toBeTruthy();
    expect(utils.getByTestId('signup-password-error')).toBeTruthy();
    // Fix name; re-submit: name error gone, others remain
    fireEvent.changeText(utils.getByTestId('signup-name-input'), 'Jane');
    fireEvent.press(utils.getByTestId('signup-submit-button'));
    expect(utils.queryByTestId('signup-name-error')).toBeNull();
    expect(utils.getByTestId('signup-email-error')).toBeTruthy();
    expect(utils.getByTestId('signup-password-error')).toBeTruthy();
  });
});
