/**
 * @module NetworkErrorState
 *
 * Inline error state shown when a network request fails. Displays an error
 * message with a retry button. Use within screens that fetch data to provide
 * recovery from transient network failures without navigating away.
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { BrandedSpinner } from '@/components/BrandedSpinner';

interface Props {
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
  compact?: boolean;
  testID?: string;
}

export function NetworkErrorState({
  message = "Couldn't connect to the server",
  onRetry,
  isRetrying = false,
  compact = false,
  testID = 'network-error-state',
}: Props) {
  const { colors, spacing, borderRadius } = useTheme();

  return (
    <View
      style={[styles.container, compact && styles.compact, { padding: spacing.lg }]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <Text
        style={[styles.icon, { color: colors.espressoLight }]}
        testID="network-error-icon"
      >
        📡
      </Text>
      <Text style={[styles.message, { color: colors.espresso }]}>{message}</Text>

      {isRetrying ? (
        <View testID="network-error-spinner" style={styles.spinnerWrap}>
          <BrandedSpinner size="small" color={colors.sunsetCoral} />
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.retryButton,
            { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.button },
          ]}
          onPress={onRetry}
          testID="network-error-retry"
          accessibilityLabel="Retry"
          accessibilityRole="button"
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  compact: {
    paddingVertical: 16,
  },
  icon: {
    fontSize: 32,
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 260,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  spinnerWrap: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
