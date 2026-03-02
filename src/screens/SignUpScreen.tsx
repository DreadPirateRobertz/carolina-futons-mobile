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
import { useAuth, validateEmail, validatePassword, validateName } from '@/hooks/useAuth';

interface Props {
  onLogin?: () => void;
  testID?: string;
}

export function SignUpScreen({ onLogin, testID }: Props) {
  const { colors, borderRadius, shadows } = useTheme();
  const { signUp, signInWithGoogle, signInWithApple, loading, error, clearError } = useAuth();

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
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID={testID ?? 'signup-screen'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[styles.title, { color: colors.espresso }]}
          accessibilityRole="header"
          testID="signup-title"
        >
          Create Account
        </Text>
        <Text style={[styles.subtitle, { color: colors.espressoLight }]}>
          Join Carolina Futons for handcrafted comfort
        </Text>

        {error && (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.errorBannerBg, borderRadius: borderRadius.md },
            ]}
            testID="signup-error"
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
          >
            <Text style={[styles.errorText, { color: colors.errorBannerText }]}>{error}</Text>
          </View>
        )}

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.espresso }]}>Full Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.sandLight,
                color: colors.espresso,
                borderRadius: borderRadius.md,
                borderColor: nameError ? colors.error : colors.sandDark,
              },
            ]}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setNameError(null);
              clearError();
            }}
            placeholder="Your name"
            placeholderTextColor={colors.muted}
            autoComplete="name"
            textContentType="name"
            testID="signup-name-input"
            accessibilityLabel="Full name"
          />
          {nameError && (
            <Text
              style={[styles.fieldError, { color: colors.error }]}
              accessibilityLiveRegion="polite"
              testID="signup-name-error"
            >
              {nameError}
            </Text>
          )}
        </View>

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
            testID="signup-email-input"
            accessibilityLabel="Email address"
          />
          {emailError && (
            <Text
              style={[styles.fieldError, { color: colors.error }]}
              accessibilityLiveRegion="polite"
              testID="signup-email-error"
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
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            testID="signup-password-input"
            accessibilityLabel="Password"
          />
          {passwordError && (
            <Text
              style={[styles.fieldError, { color: colors.error }]}
              accessibilityLiveRegion="polite"
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
            <ActivityIndicator color="#FFFFFF" testID="signup-loading" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.sandDark }]} />
          <Text style={[styles.dividerText, { color: colors.muted }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.sandDark }]} />
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
              backgroundColor: colors.sandLight,
              borderRadius: borderRadius.button,
              borderWidth: 1,
              borderColor: colors.sandDark,
            },
          ]}
          onPress={signInWithGoogle}
          disabled={loading}
          testID="google-signup-button"
          accessibilityLabel="Sign up with Google"
          accessibilityRole="button"
        >
          <Text style={[styles.socialButtonText, { color: colors.espresso }]}>
            G Continue with Google
          </Text>
        </TouchableOpacity>

        {/* Login link */}
        <View style={styles.loginRow}>
          <Text style={[styles.loginText, { color: colors.espressoLight }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={onLogin} testID="login-link" accessibilityRole="link">
            <Text style={[styles.loginLink, { color: colors.mountainBlue }]}>Sign In</Text>
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
