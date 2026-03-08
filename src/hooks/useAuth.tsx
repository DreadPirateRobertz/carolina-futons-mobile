/**
 * Authentication hook and context provider for Carolina Futons.
 *
 * Manages user sign-in, sign-up, OAuth (Google/Apple), password reset, and
 * session restoration via the Wix Members API. Wraps all auth state in a React
 * context so any descendant component can access the current user and auth
 * actions through the `useAuth` hook.
 *
 * @module useAuth
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { WixAuthService, type UpdateProfileData } from '@/services/wix/wixAuth';
import {
  googleAuthConfig,
  isGoogleAuthConfigured,
  decodeGoogleIdToken,
  saveGoogleSession,
  loadGoogleSession,
  clearGoogleSession,
} from '@/services/googleAuth';

WebBrowser.maybeCompleteAuthSession();

/** Represents an authenticated Carolina Futons user. */
export interface User {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  provider: 'email' | 'google' | 'apple' | 'wix';
}

/** Internal state managed by the auth reducer. */
interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * Discriminated union of actions the auth reducer handles.
 *
 * - `AUTH_START` — sets loading state before an async auth operation
 * - `AUTH_SUCCESS` — stores the authenticated user after login/signup
 * - `AUTH_ERROR` — captures an error message from a failed auth attempt
 * - `SIGN_OUT` — clears user state on logout
 * - `CLEAR_ERROR` — dismisses the current error without changing user
 * - `INIT_DONE` — marks session-restore check as complete (no user found)
 */
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; user: User }
  | { type: 'AUTH_ERROR'; error: string }
  | { type: 'SIGN_OUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'INIT_DONE' }
  | { type: 'UPDATE_USER'; user: User };

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
    case 'UPDATE_USER':
      return { ...state, user: action.user };
    default:
      return state;
  }
}

/**
 * Validates an email address format.
 *
 * @param email - The email string to validate.
 * @returns A human-readable error message, or `null` if valid.
 */
export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Invalid email address';
  return null;
}

/**
 * Validates a password against minimum strength requirements.
 *
 * Requirements: at least 8 characters, one uppercase letter, one digit.
 *
 * @param password - The password string to validate.
 * @returns A human-readable error message, or `null` if valid.
 */
export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  return null;
}

/**
 * Validates a display name (minimum 2 characters after trimming).
 *
 * @param name - The display name to validate.
 * @returns A human-readable error message, or `null` if valid.
 */
export function validateName(name: string): string | null {
  if (!name.trim()) return 'Name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  return null;
}

/** Shape of the value exposed by AuthContext to consumers. */
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
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  signOut: () => void;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Context provider that initializes the Wix auth service, restores any
 * persisted session on mount, and exposes auth actions to the component tree.
 *
 * Wrap your app root (or the authenticated section) with this provider.
 *
 * @param props.children - Child components that may consume auth context.
 *
 * @example
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    loading: true,
    error: null,
  });

  const authService = useMemo(() => new WixAuthService(), []);

  const googleConfigured = isGoogleAuthConfigured();
  const [, , googlePromptAsync] = Google.useIdTokenAuthRequest(
    googleConfigured
      ? {
          iosClientId: googleAuthConfig.iosClientId || undefined,
          androidClientId: googleAuthConfig.androidClientId || undefined,
          clientId: googleAuthConfig.webClientId,
        }
      : { clientId: '__disabled__' },
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Try Wix session first
      const restored = await authService.restoreSession();
      if (!mounted) return;
      if (restored) {
        const member = await authService.getCurrentMember();
        if (mounted && member) {
          dispatch({ type: 'AUTH_SUCCESS', user: member });
          return;
        }
      }
      // Try persisted Google session
      const googleToken = await loadGoogleSession();
      if (mounted && googleToken) {
        try {
          const claims = decodeGoogleIdToken(googleToken);
          dispatch({
            type: 'AUTH_SUCCESS',
            user: {
              id: claims.sub,
              email: claims.email,
              displayName: claims.name,
              phone: '',
              provider: 'google',
            },
          });
          return;
        } catch {
          await clearGoogleSession();
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
      if (!result.success) {
        dispatch({ type: 'AUTH_ERROR', error: result.error });
        return;
      }
      const member = await authService.getCurrentMember();
      if (member) {
        dispatch({ type: 'AUTH_SUCCESS', user: member });
      } else {
        dispatch({ type: 'AUTH_ERROR', error: 'Login failed' });
      }
    },
    [authService],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      dispatch({ type: 'AUTH_START' });
      const result = await authService.register(email, password, displayName);
      if (!result.success) {
        dispatch({ type: 'AUTH_ERROR', error: result.error });
        return;
      }
      const member = await authService.getCurrentMember();
      if (member) {
        dispatch({ type: 'AUTH_SUCCESS', user: member });
      } else {
        dispatch({ type: 'AUTH_ERROR', error: 'Registration failed' });
      }
    },
    [authService],
  );

  const signInWithGoogle = useCallback(async () => {
    dispatch({ type: 'AUTH_START' });

    // Use native Google sign-in when configured
    if (googleConfigured && googlePromptAsync) {
      try {
        const result = await googlePromptAsync();
        if (result.type === 'success') {
          const idToken = result.params.id_token;
          const claims = decodeGoogleIdToken(idToken);
          await saveGoogleSession(idToken);
          dispatch({
            type: 'AUTH_SUCCESS',
            user: {
              id: claims.sub,
              email: claims.email,
              displayName: claims.name,
              phone: '',
              provider: 'google',
            },
          });
        } else if (result.type === 'error') {
          dispatch({
            type: 'AUTH_ERROR',
            error: result.error?.message ?? 'Google sign-in failed',
          });
        } else {
          // User cancelled
          dispatch({ type: 'CLEAR_ERROR' });
        }
      } catch (err) {
        dispatch({ type: 'AUTH_ERROR', error: (err as Error).message });
      }
      return;
    }

    // Fallback to Wix OAuth when Google client IDs are not configured
    const result = await authService.loginWithOAuth();
    if (!result.success) {
      dispatch({ type: 'AUTH_ERROR', error: result.error });
      return;
    }
    const member = await authService.getCurrentMember();
    if (member) {
      dispatch({ type: 'AUTH_SUCCESS', user: member });
    } else {
      dispatch({ type: 'AUTH_ERROR', error: 'Google login failed' });
    }
  }, [googleConfigured, googlePromptAsync, authService]);

  const signInWithApple = useCallback(async () => {
    dispatch({ type: 'AUTH_START' });
    const result = await authService.loginWithApple();
    if (!result.success) {
      dispatch({ type: 'AUTH_ERROR', error: result.error });
      return;
    }
    const member = await authService.getCurrentMember();
    if (member) {
      dispatch({ type: 'AUTH_SUCCESS', user: member });
    } else {
      dispatch({ type: 'AUTH_ERROR', error: 'Apple login failed' });
    }
  }, [authService]);

  const resetPassword = useCallback(
    async (email: string) => {
      dispatch({ type: 'AUTH_START' });
      await authService.sendPasswordReset(email);
      dispatch({ type: 'CLEAR_ERROR' });
    },
    [authService],
  );

  const updateProfile = useCallback(
    async (data: UpdateProfileData) => {
      if (!state.user) return;
      dispatch({ type: 'AUTH_START' });
      const result = await authService.updateMember(state.user.id, data);
      if (!result.success) {
        dispatch({ type: 'AUTH_ERROR', error: result.error });
        return;
      }
      const member = await authService.getCurrentMember();
      if (member) {
        dispatch({ type: 'UPDATE_USER', user: member });
      } else {
        dispatch({ type: 'CLEAR_ERROR' });
      }
    },
    [authService, state.user],
  );

  const signOut = useCallback(() => {
    authService.logout();
    clearGoogleSession();
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
      updateProfile,
      resetPassword,
      signOut,
      clearError,
    }),
    [
      state,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      updateProfile,
      resetPassword,
      signOut,
      clearError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Accesses the current authentication state and actions.
 *
 * Must be called from within an `AuthProvider`.
 *
 * @returns Object containing `{ user, loading, error, isAuthenticated, signIn, signUp, signInWithGoogle, signInWithApple, resetPassword, signOut, clearError }`
 *
 * @example
 * const { user, signIn, signOut, isAuthenticated } = useAuth();
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
