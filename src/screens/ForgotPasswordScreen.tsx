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
  onBack?: () => void;
  testID?: string;
}

export function ForgotPasswordScreen({ onBack, testID }: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const { resetPassword, loading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleReset = useCallback(async () => {
    clearError();
    const eErr = validateEmail(email);
    setEmailError(eErr);
    if (eErr) return;
    await resetPassword(email);
    // If no error was set by resetPassword, consider it sent
    setSent(true);
  }, [email, resetPassword, clearError]);

  if (sent && !error) {
    return (
      <View
        style={[styles.root, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'forgot-password-screen'}
      >
        <View style={styles.successContent}>
          <Text style={styles.successIcon}>✉</Text>
          <Text
            style={[styles.successTitle, { color: colors.espresso }]}
            testID="reset-success-title"
          >
            Check Your Email
          </Text>
          <Text style={[styles.successMessage, { color: colors.espressoLight }]}>
            We sent a password reset link to{'\n'}
            <Text style={{ fontWeight: '600' }}>{email}</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: colors.mountainBlue, borderRadius: borderRadius.button },
            ]}
            onPress={onBack}
            testID="back-to-login-button"
            accessibilityLabel="Back to login"
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID={testID ?? 'forgot-password-screen'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            testID="forgot-back-button"
            accessibilityLabel="Go back"
            accessibilityRole="button"
            style={styles.backLink}
          >
            <Text style={[styles.backLinkText, { color: colors.espresso }]}>
              {'‹ Back'}
            </Text>
          </TouchableOpacity>
        )}

        <Text
          style={[styles.title, { color: colors.espresso }]}
          accessibilityRole="header"
          testID="forgot-title"
        >
          Reset Password
        </Text>
        <Text style={[styles.subtitle, { color: colors.espressoLight }]}>
          Enter your email and we'll send you a reset link
        </Text>

        {error && (
          <View
            style={[styles.errorBanner, { backgroundColor: colors.sunsetCoralLight, borderRadius: borderRadius.md }]}
            testID="forgot-error"
          >
            <Text style={[styles.errorText, { color: colors.sunsetCoralDark }]}>
              {error}
            </Text>
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.espresso }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.sandLight,
                color: colors.espresso,
                borderRadius: borderRadius.md,
                borderColor: emailError ? colors.sunsetCoral : colors.sandDark,
              },
            ]}
            value={email}
            onChangeText={(t) => { setEmail(t); setEmailError(null); clearError(); setSent(false); }}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            testID="forgot-email-input"
            accessibilityLabel="Email address"
          />
          {emailError && (
            <Text style={[styles.fieldError, { color: colors.sunsetCoral }]} testID="forgot-email-error">
              {emailError}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: loading ? colors.muted : colors.sunsetCoral,
              borderRadius: borderRadius.button,
            },
            !loading && shadows.button,
          ]}
          onPress={handleReset}
          disabled={loading}
          testID="forgot-submit-button"
          accessibilityLabel="Send reset link"
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" testID="forgot-loading" />
          ) : (
            <Text style={styles.primaryButtonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>
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
  backLink: {
    marginBottom: 24,
  },
  backLinkText: {
    fontSize: 16,
    fontWeight: '500',
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
    marginBottom: 24,
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
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  // Success state
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
