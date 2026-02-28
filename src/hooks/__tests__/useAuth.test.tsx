import React from 'react';
import { Text, Pressable, View } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AuthProvider, useAuth, validateEmail, validatePassword, validateName } from '../useAuth';

// --- Mock WixAuthService ---

const mockService = {
  loginWithEmail: jest.fn(),
  register: jest.fn(),
  loginWithOAuth: jest.fn(),
  sendPasswordReset: jest.fn(),
  logout: jest.fn(),
  restoreSession: jest.fn(),
  getCurrentMember: jest.fn(),
  isLoggedIn: jest.fn(() => false),
  refreshSession: jest.fn(),
};

jest.mock('@/services/wix/wixAuth', () => ({
  WixAuthService: jest.fn(() => mockService),
}));

// --- Test Harness ---

function AuthHarness() {
  const auth = useAuth();
  return (
    <View>
      <Text testID="loading">{String(auth.loading)}</Text>
      <Text testID="error">{auth.error ?? ''}</Text>
      <Text testID="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</Text>
      <Text testID="is-auth">{String(auth.isAuthenticated)}</Text>
      <Text testID="user-email">{auth.user?.email ?? ''}</Text>
      <Text testID="user-name">{auth.user?.displayName ?? ''}</Text>
      <Pressable testID="sign-in" onPress={() => auth.signIn('user@test.com', 'Password1')} />
      <Pressable testID="sign-up" onPress={() => auth.signUp('new@test.com', 'Password1', 'New User')} />
      <Pressable testID="google" onPress={() => auth.signInWithGoogle()} />
      <Pressable testID="apple" onPress={() => auth.signInWithApple()} />
      <Pressable testID="reset" onPress={() => auth.resetPassword('user@test.com')} />
      <Pressable testID="sign-out" onPress={() => auth.signOut()} />
      <Pressable testID="clear-error" onPress={() => auth.clearError()} />
    </View>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <AuthHarness />
    </AuthProvider>,
  );
}

const mockUser = {
  id: 'member-123',
  email: 'user@test.com',
  displayName: 'Test User',
  provider: 'wix' as const,
};

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockService.restoreSession.mockResolvedValue(false);
    mockService.getCurrentMember.mockResolvedValue(null);
    mockService.logout.mockResolvedValue(undefined);
    mockService.sendPasswordReset.mockResolvedValue({ success: true });
  });

  describe('Initial state', () => {
    it('starts with loading then settles to not authenticated', async () => {
      const { getByTestId } = renderAuth();
      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('false');
      });
      expect(getByTestId('is-auth').props.children).toBe('false');
      expect(getByTestId('error').props.children).toBe('');
    });
  });

  describe('Session restore', () => {
    it('restores session and loads user on mount', async () => {
      mockService.restoreSession.mockResolvedValue(true);
      mockService.getCurrentMember.mockResolvedValue(mockUser);

      const { getByTestId } = renderAuth();

      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      expect(getByTestId('user-email').props.children).toBe('user@test.com');
    });
  });

  describe('Email sign in', () => {
    it('signs in with valid credentials', async () => {
      mockService.loginWithEmail.mockResolvedValue({ success: true });
      mockService.getCurrentMember.mockResolvedValue(mockUser);

      const { getByTestId } = renderAuth();
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      await act(async () => {
        fireEvent.press(getByTestId('sign-in'));
      });

      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      expect(mockService.loginWithEmail).toHaveBeenCalledWith('user@test.com', 'Password1');
      expect(getByTestId('user-email').props.children).toBe('user@test.com');
    });

    it('shows error for bad credentials', async () => {
      mockService.loginWithEmail.mockResolvedValue({
        success: false,
        error: 'Invalid email or password',
      });

      const { getByTestId } = renderAuth();
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      await act(async () => {
        fireEvent.press(getByTestId('sign-in'));
      });

      await waitFor(() => {
        expect(getByTestId('error').props.children).toBe('Invalid email or password');
      });
      expect(getByTestId('is-auth').props.children).toBe('false');
    });
  });

  describe('Sign up', () => {
    it('creates account successfully', async () => {
      mockService.register.mockResolvedValue({ success: true });
      mockService.getCurrentMember.mockResolvedValue({
        ...mockUser,
        displayName: 'New User',
      });

      const { getByTestId } = renderAuth();
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      await act(async () => {
        fireEvent.press(getByTestId('sign-up'));
      });

      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      expect(mockService.register).toHaveBeenCalledWith('new@test.com', 'Password1', 'New User');
      expect(getByTestId('user-name').props.children).toBe('New User');
    });

    it('shows error for taken email', async () => {
      mockService.register.mockResolvedValue({
        success: false,
        error: 'An account with this email already exists',
      });

      const { getByTestId } = renderAuth();
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      await act(async () => {
        fireEvent.press(getByTestId('sign-up'));
      });

      await waitFor(() => {
        expect(getByTestId('error').props.children).toContain('already exists');
      });
    });
  });

  describe('Social sign in', () => {
    it('signs in with Google via OAuth', async () => {
      mockService.loginWithOAuth.mockResolvedValue({ success: true });
      mockService.getCurrentMember.mockResolvedValue(mockUser);

      const { getByTestId } = renderAuth();
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      await act(async () => {
        fireEvent.press(getByTestId('google'));
      });

      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      expect(mockService.loginWithOAuth).toHaveBeenCalled();
    });

    it('signs in with Apple via OAuth', async () => {
      mockService.loginWithOAuth.mockResolvedValue({ success: true });
      mockService.getCurrentMember.mockResolvedValue(mockUser);

      const { getByTestId } = renderAuth();
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      await act(async () => {
        fireEvent.press(getByTestId('apple'));
      });

      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      expect(mockService.loginWithOAuth).toHaveBeenCalled();
    });

    it('shows error when OAuth cancelled', async () => {
      mockService.loginWithOAuth.mockResolvedValue({
        success: false,
        error: 'Login cancelled',
      });

      const { getByTestId } = renderAuth();
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      await act(async () => {
        fireEvent.press(getByTestId('google'));
      });

      await waitFor(() => {
        expect(getByTestId('error').props.children).toBe('Login cancelled');
      });
    });
  });

  describe('Password reset', () => {
    it('succeeds for valid email', async () => {
      mockService.sendPasswordReset.mockResolvedValue({ success: true });

      const { getByTestId } = renderAuth();
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      await act(async () => {
        fireEvent.press(getByTestId('reset'));
      });

      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('false');
      });
      expect(mockService.sendPasswordReset).toHaveBeenCalledWith('user@test.com');
      expect(getByTestId('error').props.children).toBe('');
    });
  });

  describe('Sign out', () => {
    it('signs out authenticated user', async () => {
      mockService.loginWithEmail.mockResolvedValue({ success: true });
      mockService.getCurrentMember.mockResolvedValue(mockUser);

      const { getByTestId } = renderAuth();
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      await act(async () => {
        fireEvent.press(getByTestId('sign-in'));
      });
      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });

      await act(async () => {
        fireEvent.press(getByTestId('sign-out'));
      });

      expect(getByTestId('is-auth').props.children).toBe('false');
      expect(getByTestId('user-email').props.children).toBe('');
      expect(mockService.logout).toHaveBeenCalled();
    });
  });

  describe('Clear error', () => {
    it('clears auth error', async () => {
      mockService.loginWithEmail.mockResolvedValue({
        success: false,
        error: 'Some error',
      });

      const { getByTestId } = renderAuth();
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      await act(async () => {
        fireEvent.press(getByTestId('sign-in'));
      });
      await waitFor(() => {
        expect(getByTestId('error').props.children).toBe('Some error');
      });

      await act(async () => {
        fireEvent.press(getByTestId('clear-error'));
      });

      expect(getByTestId('error').props.children).toBe('');
    });
  });

  describe('Error: useAuth outside provider', () => {
    it('throws', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      function Bad() {
        useAuth();
        return null;
      }
      expect(() => render(<Bad />)).toThrow('useAuth must be used within an AuthProvider');
      spy.mockRestore();
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
