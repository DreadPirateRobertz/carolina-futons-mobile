/**
 * @module TierProgressBar
 *
 * Animated progress bar showing loyalty tier advancement on AccountScreen.
 * Segments: Trail Blazer (0–499) → Mountain Guide (500–1499) → Summit Master (1500–2999) → Blue Ridge Legend (3000+)
 *
 * Thresholds mirror loyaltyTiers.ts.
 * Animates from 0 → fill percentage on mount.
 * Respects prefers-reduced-motion.
 * cm-ihz
 */

import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { getTierForPoints, getNextTier as getNextLoyaltyTier } from '@/data/loyaltyTiers';
import type { LoyaltyTierConfig } from '@/data/loyaltyTiers';

function computeFillRatio(
  points: number,
  current: LoyaltyTierConfig,
  next: LoyaltyTierConfig | null,
): number {
  if (!next) return 1; // max tier — full bar
  const range = next.minPoints - current.minPoints;
  return Math.min((points - current.minPoints) / range, 1);
}

interface Props {
  points: number;
  testID?: string;
}

export function TierProgressBar({ points, testID }: Props) {
  const { colors, borderRadius } = useTheme();
  const currentTier = getTierForPoints(points);
  const nextTier = getNextLoyaltyTier(currentTier);
  const fillRatio = computeFillRatio(points, currentTier, nextTier);

  const fillWidth = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reducedMotion) => {
      fillWidth.value = withTiming(fillRatio * 100, { duration: reducedMotion ? 0 : 800 });
    });
  }, [fillRatio, fillWidth]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value}%`,
  }));

  const pointsToNext = nextTier ? nextTier.minPoints - points : 0;

  const a11yLabel = nextTier
    ? `${currentTier.name} tier — ${pointsToNext} points to ${nextTier.name}`
    : `${currentTier.name} tier — maximum tier reached`;

  return (
    <View
      testID={testID ?? 'tier-progress-bar'}
      accessibilityLabel={a11yLabel}
      accessibilityRole="progressbar"
      style={styles.container}
    >
      {/* Labels row */}
      <View style={styles.labelsRow}>
        <Text style={[styles.tierLabel, { color: currentTier.color }]}>{currentTier.name}</Text>
        {nextTier ? (
          <Text style={[styles.nextLabel, { color: colors.muted }]}>
            {pointsToNext} pts to {nextTier.name}
          </Text>
        ) : (
          <Text style={[styles.nextLabel, { color: currentTier.color }]}>Max tier</Text>
        )}
      </View>

      {/* Track */}
      <View
        style={[
          styles.track,
          { backgroundColor: colors.sandDark, borderRadius: borderRadius.pill },
        ]}
        testID="tier-progress-track"
      >
        <Animated.View
          style={[
            styles.fill,
            fillStyle,
            { backgroundColor: currentTier.color, borderRadius: borderRadius.pill },
          ]}
          testID="tier-progress-fill"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 6,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  track: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
