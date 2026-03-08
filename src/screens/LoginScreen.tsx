/**
 * @module LoginScreen
 *
 * Email/password sign-in screen with social login (Apple, Google).
 * Uses the dark palette and frosted-glass card aesthetic shared
 * across auth screens. Client-side validation runs before any
 * network call to give instant field-level feedback.
 */
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { GlassCard } from '@/components/GlassCard';
import { BrandedSpinner } from '@/components/BrandedSpinner';
import { useAuth, validateEmail } from '@/hooks/useAuth';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';

interface Props {
  onSignUp?: () => void;
  onForgotPassword?: () => void;
  onBiometricSuccess?: () => void;
  testID?: string;
}

/** Sign-in form with email/password fields, biometric, and social OAuth buttons. */
export function LoginScreen({ onSignUp, onForgotPassword, onBiometricSuccess, testID }: Props) {
  const { colors, borderRadius, shadows, typography, spacing } = useTheme();
  const { signIn, signInWithGoogle, signInWithApple, loading, error, clearError } = useAuth();
  const {
    status: bioStatus,
    isEnabled: biometricEnabled,
    loading: bioLoading,
    authenticating,
    promptBiometric,
  } = useBiometricAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSignIn = useCallback(async () => {
    clearError();
    const eErr = validateEmail(email);
    const pErr = !password ? 'Password is required' : null;
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;
    await signIn(email, password);
  }, [email, password, signIn, clearError]);

  const handleGoogleSignIn = useCallback(async () => {
    clearError();
    await signInWithGoogle();
  }, [signInWithGoogle, clearError]);

  const handleAppleSignIn = useCallback(async () => {
    clearError();
    await signInWithApple();
  }, [signInWithApple, clearError]);

  const handleBiometricSignIn = useCallback(async () => {
    clearError();
    const success = await promptBiometric();
    if (success) {
      onBiometricSuccess?.();
    }
  }, [promptBiometric, clearError, onBiometricSuccess]);

  const showBiometric =
    biometricEnabled && bioStatus.isAvailable && bioStatus.isEnrolled && !bioLoading;
  const biometricLabel = bioStatus.biometricType === 'facial' ? 'Face ID' : 'Touch ID';

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: darkPalette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID={testID ?? 'login-screen'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            styles.title,
            {
              color: darkPalette.textPrimary,
              ...typography.h1,
              fontFamily: typography.headingFamily,
            },
          ]}
          accessibilityRole="header"
          testID="login-title"
        >
          Welcome Back
        </Text>
        <Text
          style={[
            styles.subtitle,
            {
              color: darkPalette.textMuted,
              ...typography.body,
              fontFamily: typography.bodyFamily,
            },
          ]}
          testID="login-subtitle"
        >
          Sign in to your Carolina Futons account
        </Text>

        <GlassCard style={{ padding: spacing.lg }} testID="login-glass-card">
          {/* Auth error */}
          {error && (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: colors.sunsetCoralLight, borderRadius: borderRadius.md },
              ]}
              testID="login-error"
            >
              <Text style={[styles.errorText, { color: colors.sunsetCoralDark }]}>{error}</Text>
            </View>
          )}

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text
              style={[
                styles.label,
                { color: darkPalette.textPrimary, fontFamily: typography.bodyFamilySemiBold },
              ]}
              testID="login-email-label"
            >
              Email
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: darkPalette.surfaceElevated,
                  color: darkPalette.textPrimary,
                  borderRadius: borderRadius.md,
                  borderColor: emailError ? colors.sunsetCoral : darkPalette.borderSubtle,
                },
              ]}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setEmailError(null);
                clearError();
              }}
              placeholder="you@example.com"
              placeholderTextColor={darkPalette.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              testID="login-email-input"
              accessibilityLabel="Email address"
            />
            {emailError && (
              <Text
                style={[styles.fieldError, { color: colors.sunsetCoral }]}
                testID="login-email-error"
              >
                {emailError}
              </Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text
              style={[
                styles.label,
                { color: darkPalette.textPrimary, fontFamily: typography.bodyFamilySemiBold },
              ]}
              testID="login-password-label"
            >
              Password
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: darkPalette.surfaceElevated,
                  color: darkPalette.textPrimary,
                  borderRadius: borderRadius.md,
                  borderColor: passwordError ? colors.sunsetCoral : darkPalette.borderSubtle,
                },
              ]}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setPasswordError(null);
                clearError();
              }}
              placeholder="Your password"
              placeholderTextColor={darkPalette.textMuted}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              testID="login-password-input"
              accessibilityLabel="Password"
            />
            {passwordError && (
              <Text
                style={[styles.fieldError, { color: colors.sunsetCoral }]}
                testID="login-password-error"
              >
                {passwordError}
              </Text>
            )}
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            onPress={onForgotPassword}
            testID="forgot-password-link"
            accessibilityRole="link"
          >
            <Text style={[styles.forgotText, { color: colors.mountainBlueLight }]}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          {/* Sign in button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: loading ? colors.muted : colors.sunsetCoral,
                borderRadius: borderRadius.button,
              },
              !loading && shadows.button,
            ]}
            onPress={handleSignIn}
            disabled={loading}
            testID="login-submit-button"
            accessibilityLabel="Sign in"
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
          >
            {loading ? (
              <BrandedSpinner color="#FFFFFF" testID="login-loading" />
            ) : (
              <Text style={[styles.primaryButtonText, { fontFamily: typography.bodyFamilyBold }]}>
                Sign In
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: darkPalette.borderSubtle }]} />
            <Text style={[styles.dividerText, { color: darkPalette.textMuted }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: darkPalette.borderSubtle }]} />
          </View>

          {/* Biometric sign-in */}
          {showBiometric && (
            <TouchableOpacity
              style={[
                styles.socialButton,
                {
                  backgroundColor: colors.mountainBlue,
                  borderRadius: borderRadius.button,
                },
              ]}
              onPress={handleBiometricSignIn}
              disabled={loading || authenticating}
              testID="biometric-sign-in-button"
              accessibilityLabel={`Sign in with ${biometricLabel}`}
              accessibilityRole="button"
            >
              {authenticating ? (
                <BrandedSpinner color="#FFFFFF" testID="biometric-loading" />
              ) : (
                <Text style={styles.socialButtonText}>Sign in with {biometricLabel}</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Social logins */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[
                styles.socialButton,
                { backgroundColor: '#000000', borderRadius: borderRadius.button },
              ]}
              onPress={handleAppleSignIn}
              disabled={loading}
              testID="apple-sign-in-button"
              accessibilityLabel="Sign in with Apple"
              accessibilityRole="button"
            >
              <Text style={styles.socialButtonText}> Continue with Apple</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.socialButton,
              {
                backgroundColor: darkPalette.surfaceElevated,
                borderRadius: borderRadius.button,
                borderWidth: 1,
                borderColor: darkPalette.borderSubtle,
              },
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            testID="google-sign-in-button"
            accessibilityLabel="Sign in with Google"
            accessibilityRole="button"
          >
            <Text style={[styles.socialButtonText, { color: darkPalette.textPrimary }]}>
              G Continue with Google
            </Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Sign up link */}
        <View style={styles.signUpRow}>
          <Text style={[styles.signUpText, { color: darkPalette.textMuted }]}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity onPress={onSignUp} testID="sign-up-link" accessibilityRole="link">
            <Text style={[styles.signUpLink, { color: colors.mountainBlueLight }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 32,
  },
  errorBanner: {
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 24,
  },
  primaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 13,
    fontWeight: '500',
  },
  socialButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signUpText: {
    fontSize: 15,
  },
  signUpLink: {
    fontSize: 15,
    fontWeight: '700',
  },
});
