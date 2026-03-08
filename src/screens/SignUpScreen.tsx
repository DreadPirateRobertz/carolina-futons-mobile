/**
 * @module SignUpScreen
 *
 * New-account registration with name, email, and password fields plus
 * social OAuth (Apple, Google). Validates all fields client-side before
 * submitting. Shares the dark-palette frosted-glass card design with
 * LoginScreen to keep the auth flow visually cohesive.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  findNodeHandle,
  UIManager,
} from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { GlassCard } from '@/components/GlassCard';
import { BrandedSpinner } from '@/components/BrandedSpinner';
import { useAuth, validateEmail, validatePassword, validateName } from '@/hooks/useAuth';

interface Props {
  onLogin?: () => void;
  testID?: string;
}

/** Account creation form with client-side validation and social OAuth options. */
export function SignUpScreen({ onLogin, testID }: Props) {
  const { colors, borderRadius, shadows, typography, spacing } = useTheme();
  const { signUp, signInWithGoogle, signInWithApple, loading, error, clearError } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const handleFieldFocus = useCallback((e: any) => {
    const target = e.nativeEvent?.target;
    if (!scrollRef.current || !target) return;
    setTimeout(() => {
      const scrollNode = findNodeHandle(scrollRef.current);
      if (!scrollNode) return;
      UIManager.measureLayout(
        target,
        scrollNode,
        () => {},
        (_x: number, y: number) => {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
        },
      );
    }, 150);
  }, []);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSignUp = useCallback(async () => {
    clearError();
    const nErr = validateName(name);
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setNameError(nErr);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (nErr || eErr || pErr) return;
    await signUp(email, password, name);
  }, [name, email, password, signUp, clearError]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: darkPalette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID={testID ?? 'signup-screen'}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        {...({ onFocus: handleFieldFocus } as any)}
        showsVerticalScrollIndicator={false}
        {...({ onFocus: handleFieldFocus } as any)}
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
          testID="signup-title"
        >
          Create Account
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
        >
          Join Carolina Futons for handcrafted comfort
        </Text>

        <GlassCard style={{ padding: spacing.lg }} testID="signup-glass-card">
          {error && (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: colors.sunsetCoralLight, borderRadius: borderRadius.md },
              ]}
              testID="signup-error"
            >
              <Text style={[styles.errorText, { color: colors.sunsetCoralDark }]}>{error}</Text>
            </View>
          )}

          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: darkPalette.textPrimary, fontFamily: typography.bodyFamilySemiBold }]}>
              Full Name
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: darkPalette.surfaceElevated,
                  color: darkPalette.textPrimary,
                  borderRadius: borderRadius.md,
                  borderColor: nameError ? colors.sunsetCoral : darkPalette.borderSubtle,
                },
              ]}
              value={name}
              onChangeText={(t) => {
                setName(t);
                setNameError(null);
                clearError();
              }}
              placeholder="Your name"
              placeholderTextColor={darkPalette.textMuted}
              autoComplete="name"
              textContentType="name"
              testID="signup-name-input"
              accessibilityLabel="Full name"
            />
            {nameError && (
              <Text
                style={[styles.fieldError, { color: colors.sunsetCoral }]}
                testID="signup-name-error"
              >
                {nameError}
              </Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: darkPalette.textPrimary, fontFamily: typography.bodyFamilySemiBold }]}>
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
              testID="signup-email-input"
              accessibilityLabel="Email address"
            />
            {emailError && (
              <Text
                style={[styles.fieldError, { color: colors.sunsetCoral }]}
                testID="signup-email-error"
              >
                {emailError}
              </Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: darkPalette.textPrimary, fontFamily: typography.bodyFamilySemiBold }]}>
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
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              placeholderTextColor={darkPalette.textMuted}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              testID="signup-password-input"
              accessibilityLabel="Password"
            />
            {passwordError && (
              <Text
                style={[styles.fieldError, { color: colors.sunsetCoral }]}
                testID="signup-password-error"
              >
                {passwordError}
              </Text>
            )}
          </View>

          {/* Sign up button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: loading ? colors.muted : colors.sunsetCoral,
                borderRadius: borderRadius.button,
              },
              !loading && shadows.button,
            ]}
            onPress={handleSignUp}
            disabled={loading}
            testID="signup-submit-button"
            accessibilityLabel="Create account"
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
          >
            {loading ? (
              <BrandedSpinner color="#FFFFFF" testID="signup-loading" />
            ) : (
              <Text style={[styles.primaryButtonText, { fontFamily: typography.bodyFamilyBold }]}>
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: darkPalette.borderSubtle }]} />
            <Text style={[styles.dividerText, { color: darkPalette.textMuted }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: darkPalette.borderSubtle }]} />
          </View>

          {/* Social sign up */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[
                styles.socialButton,
                { backgroundColor: '#000000', borderRadius: borderRadius.button },
              ]}
              onPress={signInWithApple}
              disabled={loading}
              testID="apple-signup-button"
              accessibilityLabel="Sign up with Apple"
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
            onPress={signInWithGoogle}
            disabled={loading}
            testID="google-signup-button"
            accessibilityLabel="Sign up with Google"
            accessibilityRole="button"
          >
            <Text style={[styles.socialButtonText, { color: darkPalette.textPrimary }]}>
              G Continue with Google
            </Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Login link */}
        <View style={styles.loginRow}>
          <Text style={[styles.loginText, { color: darkPalette.textMuted }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={onLogin} testID="login-link" accessibilityRole="link">
            <Text style={[styles.loginLink, { color: colors.mountainBlueLight }]}>Sign In</Text>
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
  primaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 15,
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '700',
  },
});
