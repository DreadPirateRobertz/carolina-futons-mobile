import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, waitFor, act, cleanup } from '@testing-library/react-native';
import { AuthProvider, useAuth, validateEmail, validatePassword, validateName } from '../useAuth';

// --- Mock WixAuthService ---

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
  updateMember: jest.fn().mockResolvedValue({ success: true }),
};

jest.mock('@/services/wix/wixAuth', () => ({
  WixAuthService: jest.fn(() => mockAuthService),
}));

// --- Mock Google auth ---

const mockGooglePromptAsync = jest.fn();
const mockUseIdTokenAuthRequest = jest.requireMock(
  'expo-auth-session/providers/google',
).useIdTokenAuthRequest as jest.Mock;

jest.mock('@/services/googleAuth', () => ({
  googleAuthConfig: {
    iosClientId: '',
    androidClientId: '',
    webClientId: 'test-google-web-client-id',
  },
  isGoogleAuthConfigured: jest.fn(() => true),
  decodeGoogleIdToken: jest.fn((idToken: string) => ({
    sub: 'google-sub-123',
    email: 'google@test.com',
    name: 'Google User',
  })),
  saveGoogleSession: jest.fn(),
  loadGoogleSession: jest.fn().mockResolvedValue(null),
  clearGoogleSession: jest.fn(),
}));

/** Test harness exposing auth state + actions */
function AuthHarness() {
  const {
    user,
    loading,
    error,
    isAuthenticated,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    resetPassword,
    signOut,
    clearError,
  } = useAuth();

  return (
    <View>
      <Text testID="is-auth">{String(isAuthenticated)}</Text>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="error">{error ?? ''}</Text>
      <Text testID="user-email">{user?.email ?? ''}</Text>
      <Text testID="user-name">{user?.displayName ?? ''}</Text>
      <Text testID="user-provider">{user?.provider ?? ''}</Text>

      <TouchableOpacity testID="sign-in" onPress={() => signIn('test@test.com', 'Pass1234')} />
      <TouchableOpacity testID="sign-in-bad" onPress={() => signIn('bad@test.com', 'Pass1234')} />
      <TouchableOpacity
        testID="sign-up"
        onPress={() => signUp('new@test.com', 'Pass1234', 'New User')}
      />
      <TouchableOpacity
        testID="sign-up-taken"
        onPress={() => signUp('taken@test.com', 'Pass1234', 'Taken')}
      />
      <TouchableOpacity testID="google" onPress={() => signInWithGoogle()} />
      <TouchableOpacity testID="apple" onPress={() => signInWithApple()} />
      <TouchableOpacity testID="reset" onPress={() => resetPassword('test@test.com')} />
      <TouchableOpacity testID="sign-out" onPress={signOut} />
      <TouchableOpacity testID="clear-error" onPress={clearError} />
    </View>
  );
}

async function renderAuth() {
  const result = render(
    <AuthProvider>
      <AuthHarness />
    </AuthProvider>,
  );
  // Flush useEffect's async session restore to prevent microtask leaks
  await act(async () => {});
  return result;
}

const mockMember = {
  id: 'member-1',
  email: 'test@test.com',
  displayName: 'Test User',
  phone: '555-1234',
  provider: 'wix' as const,
};

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.restoreSession.mockResolvedValue(false);
    mockAuthService.getCurrentMember.mockResolvedValue(null);
    mockAuthService.logout.mockResolvedValue(undefined);
    mockUseIdTokenAuthRequest.mockReturnValue([null, null, mockGooglePromptAsync]);
    const { loadGoogleSession, isGoogleAuthConfigured } = require('@/services/googleAuth');
    (loadGoogleSession as jest.Mock).mockResolvedValue(null);
    (isGoogleAuthConfigured as jest.Mock).mockReturnValue(true);
  });

  afterEach(cleanup);

  describe('Initial state', () => {
    it('starts loading then resolves to not authenticated', async () => {
      const { getByTestId } = await renderAuth();
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('is-auth').props.children).toBe('false');
      expect(getByTestId('error').props.children).toBe('');
    });

    it('restores session if tokens exist', async () => {
      mockAuthService.restoreSession.mockResolvedValue(true);
      mockAuthService.getCurrentMember.mockResolvedValue(mockMember);

      const { getByTestId } = await renderAuth();
      expect(getByTestId('is-auth').props.children).toBe('true');
      expect(getByTestId('user-email').props.children).toBe('test@test.com');
    });
  });

  describe('Email sign in', () => {
    it('signs in with valid credentials', async () => {
      mockAuthService.loginWithEmail.mockResolvedValue({ success: true });
      mockAuthService.getCurrentMember.mockResolvedValue(mockMember);

      const { getByTestId } = await renderAuth();

      fireEvent.press(getByTestId('sign-in'));
      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      expect(getByTestId('user-email').props.children).toBe('test@test.com');
    });

    it('shows error for bad credentials', async () => {
      mockAuthService.loginWithEmail.mockResolvedValue({
        success: false,
        error: 'Invalid email or password',
      });

      const { getByTestId } = await renderAuth();

      fireEvent.press(getByTestId('sign-in-bad'));
      await waitFor(() => {
        expect(getByTestId('error').props.children).toBe('Invalid email or password');
      });
      expect(getByTestId('is-auth').props.children).toBe('false');
    });
  });

  describe('Sign up', () => {
    it('creates account successfully', async () => {
      const newMember = { ...mockMember, displayName: 'New User', email: 'new@test.com' };
      mockAuthService.register.mockResolvedValue({ success: true });
      mockAuthService.getCurrentMember.mockResolvedValue(newMember);

      const { getByTestId } = await renderAuth();

      fireEvent.press(getByTestId('sign-up'));
      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      expect(getByTestId('user-name').props.children).toBe('New User');
    });

    it('shows error for taken email', async () => {
      mockAuthService.register.mockResolvedValue({
        success: false,
        error: 'An account with this email already exists',
      });

      const { getByTestId } = await renderAuth();

      fireEvent.press(getByTestId('sign-up-taken'));
      await waitFor(() => {
        expect(getByTestId('error').props.children).toContain('already exists');
      });
    });
  });

  describe('Social sign in', () => {
    it('signs in with Google via expo-auth-session', async () => {
      mockGooglePromptAsync.mockResolvedValue({
        type: 'success',
        params: { id_token: 'mock.google.idtoken' },
      });

      const { getByTestId } = await renderAuth();

      fireEvent.press(getByTestId('google'));
      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      expect(getByTestId('user-provider').props.children).toBe('google');
      expect(getByTestId('user-email').props.children).toBe('google@test.com');
      expect(getByTestId('user-name').props.children).toBe('Google User');
    });

    it('handles Google sign-in cancellation', async () => {
      mockGooglePromptAsync.mockResolvedValue({ type: 'dismiss' });

      const { getByTestId } = await renderAuth();

      fireEvent.press(getByTestId('google'));
      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('false');
      });
      expect(getByTestId('is-auth').props.children).toBe('false');
      expect(getByTestId('error').props.children).toBe('');
    });

    it('shows error when Google sign-in fails', async () => {
      mockGooglePromptAsync.mockResolvedValue({
        type: 'error',
        error: { message: 'Google auth error' },
      });

      const { getByTestId } = await renderAuth();

      fireEvent.press(getByTestId('google'));
      await waitFor(() => {
        expect(getByTestId('error').props.children).toBe('Google auth error');
      });
    });

    it('falls back to Wix OAuth when Google is not configured', async () => {
      const { isGoogleAuthConfigured } = require('@/services/googleAuth');
      (isGoogleAuthConfigured as jest.Mock).mockReturnValue(false);

      const googleMember = { ...mockMember, displayName: 'Google User' };
      mockAuthService.loginWithOAuth.mockResolvedValue({ success: true });
      mockAuthService.getCurrentMember.mockResolvedValue(googleMember);

      const { getByTestId } = await renderAuth();

      fireEvent.press(getByTestId('google'));
      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      expect(mockAuthService.loginWithOAuth).toHaveBeenCalled();
    });

    it('signs in with Apple (native)', async () => {
      const appleMember = { ...mockMember, displayName: 'Apple User' };
      mockAuthService.loginWithApple.mockResolvedValue({ success: true });
      mockAuthService.getCurrentMember.mockResolvedValue(appleMember);

      const { getByTestId } = await renderAuth();

      fireEvent.press(getByTestId('apple'));
      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      expect(mockAuthService.loginWithApple).toHaveBeenCalled();
    });

    it('shows error when Apple sign-in fails', async () => {
      mockAuthService.loginWithApple.mockResolvedValue({
        success: false,
        error: 'Apple sign-in cancelled',
      });

      const { getByTestId } = await renderAuth();

      fireEvent.press(getByTestId('apple'));
      await waitFor(() => {
        expect(getByTestId('error').props.children).toBe('Apple sign-in cancelled');
      });
    });

    it('saves Google session on successful sign-in', async () => {
      const { saveGoogleSession } = require('@/services/googleAuth');
      mockGooglePromptAsync.mockResolvedValue({
        type: 'success',
        params: { id_token: 'mock.google.idtoken' },
      });

      const { getByTestId } = await renderAuth();

      fireEvent.press(getByTestId('google'));
      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      expect(saveGoogleSession).toHaveBeenCalledWith('mock.google.idtoken');
    });
  });

  describe('Password reset', () => {
    it('succeeds for any email (no enumeration)', async () => {
      mockAuthService.sendPasswordReset.mockResolvedValue({ success: true });

      const { getByTestId } = await renderAuth();

      fireEvent.press(getByTestId('reset'));
      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('false');
      });
      expect(getByTestId('error').props.children).toBe('');
    });
  });

  describe('Sign out', () => {
    it('signs out authenticated user', async () => {
      mockAuthService.loginWithEmail.mockResolvedValue({ success: true });
      mockAuthService.getCurrentMember.mockResolvedValue(mockMember);

      const { getByTestId } = await renderAuth();

      fireEvent.press(getByTestId('sign-in'));
      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      fireEvent.press(getByTestId('sign-out'));
      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('false');
      });
      expect(getByTestId('user-email').props.children).toBe('');
    });
  });

  describe('Clear error', () => {
    it('clears auth error', async () => {
      mockAuthService.loginWithEmail.mockResolvedValue({
        success: false,
        error: 'Invalid email or password',
      });

      const { getByTestId } = await renderAuth();

      fireEvent.press(getByTestId('sign-in-bad'));
      await waitFor(() => {
        expect(getByTestId('error').props.children).toBeTruthy();
      });
      fireEvent.press(getByTestId('clear-error'));
      await waitFor(() => {
        expect(getByTestId('error').props.children).toBe('');
      });
    });
  });

  describe('Error: useAuth outside provider', () => {
    it('throws', () => {
      function Bad() {
        useAuth();
        return null;
      }
      expect(() => render(<Bad />)).toThrow('useAuth must be used within an AuthProvider');
    });
  });
});

describe('Validation helpers', () => {
  describe('validateEmail', () => {
    it('returns null for valid email', () => {
      expect(validateEmail('test@example.com')).toBeNull();
    });
    it('rejects empty email', () => {
      expect(validateEmail('')).toBe('Email is required');
    });
    it('rejects invalid email', () => {
      expect(validateEmail('notanemail')).toBe('Invalid email address');
    });
  });

  describe('validatePassword', () => {
    it('returns null for valid password', () => {
      expect(validatePassword('Pass1234')).toBeNull();
    });
    it('rejects empty password', () => {
      expect(validatePassword('')).toBe('Password is required');
    });
    it('rejects short password', () => {
      expect(validatePassword('Ab1')).toBe('Password must be at least 8 characters');
    });
    it('requires uppercase', () => {
      expect(validatePassword('password1')).toBe('Password must contain an uppercase letter');
    });
    it('requires number', () => {
      expect(validatePassword('Password')).toBe('Password must contain a number');
    });
  });

  describe('validateName', () => {
    it('returns null for valid name', () => {
      expect(validateName('Jane')).toBeNull();
    });
    it('rejects empty name', () => {
      expect(validateName('')).toBe('Name is required');
    });
    it('rejects single char', () => {
      expect(validateName('J')).toBe('Name must be at least 2 characters');
    });
  });
});
