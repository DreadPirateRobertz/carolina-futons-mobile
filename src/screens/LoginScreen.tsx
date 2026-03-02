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
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/theme';
import { useAuth, validateEmail } from '@/hooks/useAuth';

interface Props {
  onSignUp?: () => void;
  onForgotPassword?: () => void;
  testID?: string;
}

export function LoginScreen({ onSignUp, onForgotPassword, testID }: Props) {
  const { colors, borderRadius, shadows } = useTheme();
  const { signIn, signInWithGoogle, signInWithApple, loading, error, clearError } = useAuth();

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

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID={testID ?? 'login-screen'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[styles.title, { color: colors.espresso }]}
          accessibilityRole="header"
          testID="login-title"
        >
          Welcome Back
        </Text>
        <Text style={[styles.subtitle, { color: colors.espressoLight }]}>
          Sign in to your Carolina Futons account
        </Text>

        {/* Auth error */}
        {error && (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.errorBannerBg, borderRadius: borderRadius.md },
            ]}
            testID="login-error"
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
          >
            <Text style={[styles.errorText, { color: colors.errorBannerText }]}>{error}</Text>
          </View>
        )}

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.espresso }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.sandLight,
                color: colors.espresso,
                borderRadius: borderRadius.md,
                borderColor: emailError ? colors.error : colors.sandDark,
              },
            ]}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setEmailError(null);
              clearError();
            }}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            testID="login-email-input"
            accessibilityLabel="Email address"
          />
          {emailError && (
            <Text
              style={[styles.fieldError, { color: colors.error }]}
              testID="login-email-error"
              accessibilityLiveRegion="polite"
            >
              {emailError}
            </Text>
          )}
        </View>

        {/* Password */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.espresso }]}>Password</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.sandLight,
                color: colors.espresso,
                borderRadius: borderRadius.md,
                borderColor: passwordError ? colors.error : colors.sandDark,
              },
            ]}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setPasswordError(null);
              clearError();
            }}
            placeholder="Your password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            testID="login-password-input"
            accessibilityLabel="Password"
          />
          {passwordError && (
            <Text
              style={[styles.fieldError, { color: colors.error }]}
              testID="login-password-error"
              accessibilityLiveRegion="polite"
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
          <Text style={[styles.forgotText, { color: colors.mountainBlue }]}>Forgot password?</Text>
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
            <ActivityIndicator color="#FFFFFF" testID="login-loading" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.sandDark }]} />
          <Text style={[styles.dividerText, { color: colors.muted }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.sandDark }]} />
        </View>

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
              backgroundColor: colors.sandLight,
              borderRadius: borderRadius.button,
              borderWidth: 1,
              borderColor: colors.sandDark,
            },
          ]}
          onPress={handleGoogleSignIn}
          disabled={loading}
          testID="google-sign-in-button"
          accessibilityLabel="Sign in with Google"
          accessibilityRole="button"
        >
          <Text style={[styles.socialButtonText, { color: colors.espresso }]}>
            G Continue with Google
          </Text>
        </TouchableOpacity>

        {/* Sign up link */}
        <View style={styles.signUpRow}>
          <Text style={[styles.signUpText, { color: colors.espressoLight }]}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity onPress={onSignUp} testID="sign-up-link" accessibilityRole="link">
            <Text style={[styles.signUpLink, { color: colors.mountainBlue }]}>Sign Up</Text>
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
