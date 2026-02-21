import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth, validateEmail, validatePassword, validateName } from '../useAuth';

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
      <TouchableOpacity testID="reset-bad" onPress={() => resetPassword('notfound@test.com')} />
      <TouchableOpacity testID="sign-out" onPress={signOut} />
      <TouchableOpacity testID="clear-error" onPress={clearError} />
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

describe('useAuth', () => {
  describe('Initial state', () => {
    it('starts not authenticated', () => {
      const { getByTestId } = renderAuth();
      expect(getByTestId('is-auth').props.children).toBe('false');
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('error').props.children).toBe('');
    });
  });

  describe('Email sign in', () => {
    it('signs in with valid credentials', async () => {
      const { getByTestId } = renderAuth();
      fireEvent.press(getByTestId('sign-in'));
      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      expect(getByTestId('user-email').props.children).toBe('test@test.com');
      expect(getByTestId('user-provider').props.children).toBe('email');
    });

    it('shows error for bad credentials', async () => {
      const { getByTestId } = renderAuth();
      fireEvent.press(getByTestId('sign-in-bad'));
      await waitFor(() => {
        expect(getByTestId('error').props.children).toBe('Invalid email or password');
      });
      expect(getByTestId('is-auth').props.children).toBe('false');
    });
  });

  describe('Sign up', () => {
    it('creates account successfully', async () => {
      const { getByTestId } = renderAuth();
      fireEvent.press(getByTestId('sign-up'));
      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      expect(getByTestId('user-name').props.children).toBe('New User');
    });

    it('shows error for taken email', async () => {
      const { getByTestId } = renderAuth();
      fireEvent.press(getByTestId('sign-up-taken'));
      await waitFor(() => {
        expect(getByTestId('error').props.children).toContain('already exists');
      });
    });
  });

  describe('Social sign in', () => {
    it('signs in with Google', async () => {
      const { getByTestId } = renderAuth();
      fireEvent.press(getByTestId('google'));
      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      expect(getByTestId('user-provider').props.children).toBe('google');
    });

    it('signs in with Apple', async () => {
      const { getByTestId } = renderAuth();
      fireEvent.press(getByTestId('apple'));
      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      expect(getByTestId('user-provider').props.children).toBe('apple');
    });
  });

  describe('Password reset', () => {
    it('succeeds for valid email', async () => {
      const { getByTestId } = renderAuth();
      fireEvent.press(getByTestId('reset'));
      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('false');
      });
      expect(getByTestId('error').props.children).toBe('');
    });

    it('shows error for unknown email', async () => {
      const { getByTestId } = renderAuth();
      fireEvent.press(getByTestId('reset-bad'));
      await waitFor(() => {
        expect(getByTestId('error').props.children).toContain('No account found');
      });
    });
  });

  describe('Sign out', () => {
    it('signs out authenticated user', async () => {
      const { getByTestId } = renderAuth();
      fireEvent.press(getByTestId('sign-in'));
      await waitFor(() => {
        expect(getByTestId('is-auth').props.children).toBe('true');
      });
      fireEvent.press(getByTestId('sign-out'));
      expect(getByTestId('is-auth').props.children).toBe('false');
      expect(getByTestId('user-email').props.children).toBe('');
    });
  });

  describe('Clear error', () => {
    it('clears auth error', async () => {
      const { getByTestId } = renderAuth();
      fireEvent.press(getByTestId('sign-in-bad'));
      await waitFor(() => {
        expect(getByTestId('error').props.children).toBeTruthy();
      });
      fireEvent.press(getByTestId('clear-error'));
      expect(getByTestId('error').props.children).toBe('');
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
