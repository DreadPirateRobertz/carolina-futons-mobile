/**
 * @module BrandedErrorFallback
 *
 * Shared branded fallback UI for error boundaries. Renders a warm,
 * on-brand error screen with MountainSkyline backdrop and BrandedSpinner
 * during retry. Used by both the root ErrorBoundary and ScreenErrorBoundary.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { MountainSkyline } from '@/components/MountainSkyline';
import { BrandedSpinner } from '@/components/BrandedSpinner';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';

interface Props {
  title: string;
  message: string;
  onRetry: () => void;
  onGoHome?: () => void;
  testID?: string;
}

export function BrandedErrorFallback({ title, message, onRetry, onGoHome, testID }: Props) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    // Brief spinner before resetting so the user sees feedback
    setTimeout(() => {
      setRetrying(false);
      onRetry();
    }, 600);
  };

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.content}>
        <View
          style={styles.iconCircle}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={styles.iconText}>!</Text>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.message}>{message}</Text>

        {retrying ? (
          <View style={styles.spinnerWrap} testID="error-boundary-spinner">
            <BrandedSpinner size="large" color={colors.sunsetCoral} />
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              testID="error-boundary-retry"
              accessibilityLabel="Try again"
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
            {onGoHome && (
              <TouchableOpacity
                style={styles.homeButton}
                onPress={onGoHome}
                testID="screen-error-home"
                accessibilityLabel="Go to home"
                accessibilityRole="button"
              >
                <Text style={styles.homeText}>Go Home</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View
        style={styles.skylineWrap}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <MountainSkyline
          variant="sunset"
          height={160}
          showGlow
          showDetails={false}
          testID="error-boundary-skyline"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.sandLight,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.sunsetCoralLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.button,
  },
  iconText: {
    fontFamily: typography.headingFamily,
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    lineHeight: 36,
  },
  title: {
    fontFamily: typography.headingFamily,
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    lineHeight: typography.h2.lineHeight,
    color: colors.espresso,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.bodyLarge,
    color: colors.espressoLight,
    textAlign: 'center',
    marginBottom: spacing.xl,
    maxWidth: 300,
  },
  spinnerWrap: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.sunsetCoral,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: borderRadius.button,
    ...shadows.button,
  },
  retryText: {
    ...typography.button,
    color: colors.white,
  },
  homeButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: borderRadius.button,
    borderWidth: 1.5,
    borderColor: colors.espressoLight,
  },
  homeText: {
    ...typography.button,
    color: colors.espresso,
  },
  skylineWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
