/**
 * GamificationTourOverlay — hq-jlttk
 *
 * First-time explainer overlay for gamification features.
 * 4 slides: points, streaks, tiers, challenges.
 * Dismissible via Skip or completing all steps.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { darkPalette } from '@/theme/tokens';
import { useTheme } from '@/theme';

const STEPS = [
  {
    icon: '⭐',
    title: 'Earn Points',
    body: 'Every purchase earns you loyalty points. The more you shop, the faster your points stack up toward exclusive rewards.',
  },
  {
    icon: '🔥',
    title: 'Build Your Streak',
    body: 'Shop on consecutive days to grow your streak. Active streaks multiply your points — keep the momentum going!',
  },
  {
    icon: '🏆',
    title: 'Unlock Tiers',
    body: 'Progress from Bronze to Silver to Gold as your points grow. Higher tiers unlock better multipliers and exclusive perks.',
  },
  {
    icon: '🎯',
    title: 'Complete Challenges',
    body: 'Earn bonus points by completing weekly challenges. New challenges drop every Monday — check back often!',
  },
] as const;

export interface GamificationTourOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  testID?: string;
}

export function GamificationTourOverlay({
  visible,
  onDismiss,
  testID,
}: GamificationTourOverlayProps) {
  const { colors, spacing, borderRadius } = useTheme();
  const [step, setStep] = useState(0);

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onDismiss();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <View style={styles.overlay} testID={testID ?? 'gamification-tour'}>
      <TouchableOpacity
        style={styles.skipButton}
        onPress={onDismiss}
        testID="tour-skip"
        accessibilityLabel="Skip tour"
        accessibilityRole="button"
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content} testID={`tour-step-${step}`}>
        <Text style={styles.icon}>{current.icon}</Text>

        <Text testID="tour-title" style={styles.title}>
          {current.title}
        </Text>

        <Text testID="tour-body" style={styles.body}>
          {current.body}
        </Text>

        <View testID="tour-progress" style={styles.progress}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              testID={`tour-dot-${i}`}
              style={[styles.dot, i === step && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.nextButton,
            {
              backgroundColor: colors.mountainBlue,
              borderRadius: borderRadius.md,
              paddingHorizontal: spacing.xl,
              paddingVertical: spacing.sm,
            },
          ]}
          onPress={handleNext}
          accessibilityLabel={isLast ? 'Get started' : 'Next'}
          accessibilityRole="button"
        >
          <Text testID="tour-next" style={styles.nextText}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    padding: 8,
    zIndex: 101,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
    maxWidth: 360,
  },
  icon: {
    fontSize: 60,
    marginBottom: 24,
  },
  title: {
    color: darkPalette.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 36,
  },
  progress: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#5B8CDB',
  },
  nextButton: {
    minWidth: 200,
    alignItems: 'center',
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
