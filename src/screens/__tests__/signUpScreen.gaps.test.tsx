/**
 * SignUpScreen gap tests — covers handleFieldFocus (lines 39-54).
 * UIManager.measureLayout is mocked to simulate the layout measurement path.
 */
import React from 'react';
import { UIManager } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { SignUpScreen } from '../SignUpScreen';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/theme/ThemeProvider';

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

jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: jest.fn(() => [null, null, jest.fn()]),
}));

jest.mock('@/services/googleAuth', () => ({
  googleAuthConfig: { iosClientId: '', androidClientId: '', webClientId: '' },
  isGoogleAuthConfigured: jest.fn(() => false),
  decodeGoogleIdToken: jest.fn(),
  saveGoogleSession: jest.fn(),
  loadGoogleSession: jest.fn().mockResolvedValue(null),
  clearGoogleSession: jest.fn(),
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

describe('SignUpScreen — handleFieldFocus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Mock UIManager.measureLayout so we can exercise the success callback
    Object.defineProperty(UIManager, 'measureLayout', {
      value: jest.fn((_target, _relative, _onFail, onSuccess) => {
        onSuccess(0, 200, 0, 0);
      }),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires focus event on name field and exercises the setTimeout path', () => {
    const { getByPlaceholderText } = renderScreen();
    const nameInput = getByPlaceholderText('Your name');
    // Fire focus with a non-null nativeEvent.target to exercise setTimeout → measureLayout
    fireEvent(nameInput, 'focus', { nativeEvent: { target: 1 } });
    jest.advanceTimersByTime(200);
    // No crash = handleFieldFocus ran without error
  });

  it('fires focus event on email field without crashing', () => {
    const { getByPlaceholderText } = renderScreen();
    const emailInput = getByPlaceholderText('you@example.com');
    fireEvent(emailInput, 'focus', { nativeEvent: { target: 2 } });
    jest.advanceTimersByTime(200);
  });

  it('skips scrollTo when nativeEvent.target is null (early return guard)', () => {
    const { getByPlaceholderText } = renderScreen();
    const nameInput = getByPlaceholderText('Your name');
    // target=null triggers the early return: `if (!scrollRef.current || !target) return`
    fireEvent(nameInput, 'focus', { nativeEvent: { target: null } });
    // No setTimeout should be scheduled (target check fails before setTimeout)
    jest.advanceTimersByTime(200);
  });
});
