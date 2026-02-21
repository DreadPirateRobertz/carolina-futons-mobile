import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

export interface User {
  id: string;
  email: string;
  displayName: string;
  provider: 'email' | 'google' | 'apple';
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; user: User }
  | { type: 'AUTH_ERROR'; error: string }
  | { type: 'SIGN_OUT' }
  | { type: 'CLEAR_ERROR' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, loading: true, error: null };
    case 'AUTH_SUCCESS':
      return { user: action.user, loading: false, error: null };
    case 'AUTH_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'SIGN_OUT':
      return { user: null, loading: false, error: null };
    case 'CLEAR_ERROR':
      return { ...state, error: null, loading: false };
    default:
      return state;
  }
}

/** Validation helpers */
export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Invalid email address';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) return 'Name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  return null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Simulated auth delay for realistic UX */
function simulateDelay(ms = 800): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    loading: false,
    error: null,
  });

  const signIn = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    await simulateDelay();
    // Mock: reject known-bad creds, accept everything else
    if (email === 'bad@test.com') {
      dispatch({ type: 'AUTH_ERROR', error: 'Invalid email or password' });
      return;
    }
    dispatch({
      type: 'AUTH_SUCCESS',
      user: {
        id: 'user-1',
        email: email.trim().toLowerCase(),
        displayName: email.split('@')[0],
        provider: 'email',
      },
    });
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    dispatch({ type: 'AUTH_START' });
    await simulateDelay();
    if (email === 'taken@test.com') {
      dispatch({ type: 'AUTH_ERROR', error: 'An account with this email already exists' });
      return;
    }
    dispatch({
      type: 'AUTH_SUCCESS',
      user: {
        id: 'user-new',
        email: email.trim().toLowerCase(),
        displayName: displayName.trim(),
        provider: 'email',
      },
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    dispatch({ type: 'AUTH_START' });
    await simulateDelay();
    dispatch({
      type: 'AUTH_SUCCESS',
      user: {
        id: 'google-user-1',
        email: 'user@gmail.com',
        displayName: 'Google User',
        provider: 'google',
      },
    });
  }, []);

  const signInWithApple = useCallback(async () => {
    dispatch({ type: 'AUTH_START' });
    await simulateDelay();
    dispatch({
      type: 'AUTH_SUCCESS',
      user: {
        id: 'apple-user-1',
        email: 'user@icloud.com',
        displayName: 'Apple User',
        provider: 'apple',
      },
    });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    dispatch({ type: 'AUTH_START' });
    await simulateDelay();
    if (email === 'notfound@test.com') {
      dispatch({ type: 'AUTH_ERROR', error: 'No account found with this email' });
      return;
    }
    // Always "succeeds" for existing emails (for security, don't reveal account existence in prod)
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const signOut = useCallback(() => {
    dispatch({ type: 'SIGN_OUT' });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      loading: state.loading,
      error: state.error,
      isAuthenticated: state.user !== null,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      resetPassword,
      signOut,
      clearError,
    }),
    [state, signIn, signUp, signInWithGoogle, signInWithApple, resetPassword, signOut, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
