import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { WixAuthService } from '@/services/wix/wixAuth';

export interface User {
  id: string;
  email: string;
  displayName: string;
  provider: 'email' | 'google' | 'apple' | 'wix';
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
  | { type: 'CLEAR_ERROR' }
  | { type: 'INIT_DONE' };

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
    case 'INIT_DONE':
      return { ...state, loading: false };
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    loading: true,
    error: null,
  });

  const authService = useMemo(() => new WixAuthService(), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const restored = await authService.restoreSession();
      if (!mounted) return;
      if (restored) {
        const member = await authService.getCurrentMember();
        if (mounted && member) {
          dispatch({ type: 'AUTH_SUCCESS', user: member });
          return;
        }
      }
      if (mounted) dispatch({ type: 'INIT_DONE' });
    })();
    return () => {
      mounted = false;
    };
  }, [authService]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      dispatch({ type: 'AUTH_START' });
      const result = await authService.loginWithEmail(email, password);
      if (result.success) {
        const member = await authService.getCurrentMember();
        if (member) {
          dispatch({ type: 'AUTH_SUCCESS', user: member });
          return;
        }
      }
      dispatch({ type: 'AUTH_ERROR', error: result.error ?? 'Login failed' });
    },
    [authService],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      dispatch({ type: 'AUTH_START' });
      const result = await authService.register(email, password, displayName);
      if (result.success) {
        const member = await authService.getCurrentMember();
        if (member) {
          dispatch({ type: 'AUTH_SUCCESS', user: member });
          return;
        }
      }
      dispatch({ type: 'AUTH_ERROR', error: result.error ?? 'Registration failed' });
    },
    [authService],
  );

  const signInWithGoogle = useCallback(async () => {
    dispatch({ type: 'AUTH_START' });
    const result = await authService.loginWithOAuth();
    if (result.success) {
      const member = await authService.getCurrentMember();
      if (member) {
        dispatch({ type: 'AUTH_SUCCESS', user: member });
        return;
      }
    }
    dispatch({ type: 'AUTH_ERROR', error: result.error ?? 'Google login failed' });
  }, [authService]);

  const signInWithApple = useCallback(async () => {
    dispatch({ type: 'AUTH_START' });
    const result = await authService.loginWithOAuth();
    if (result.success) {
      const member = await authService.getCurrentMember();
      if (member) {
        dispatch({ type: 'AUTH_SUCCESS', user: member });
        return;
      }
    }
    dispatch({ type: 'AUTH_ERROR', error: result.error ?? 'Apple login failed' });
  }, [authService]);

  const resetPassword = useCallback(
    async (email: string) => {
      dispatch({ type: 'AUTH_START' });
      await authService.sendPasswordReset(email);
      dispatch({ type: 'CLEAR_ERROR' });
    },
    [authService],
  );

  const signOut = useCallback(() => {
    authService.logout();
    dispatch({ type: 'SIGN_OUT' });
  }, [authService]);

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
