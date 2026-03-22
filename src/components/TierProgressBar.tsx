/**
 * @module TierProgressBar
 *
 * Animated progress bar showing loyalty tier advancement on AccountScreen.
 * Segments: Bronze (0–499) → Silver (500–1499) → Gold (1500+)
 *
 * Thresholds mirror useLoyalty.ts: bronze 0–499, silver 500–1499, gold 1500+.
 * Animates from 0 → fill percentage on mount.
 * Respects prefers-reduced-motion.
 * cm-ihz
 */

import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import type { LoyaltyTier } from '@/hooks/useLoyalty';

interface TierSpec {
  tier: LoyaltyTier;
  label: string;
  min: number;
  max: number;
  color: string;
}

const TIERS: TierSpec[] = [
  { tier: 'bronze', label: 'Bronze', min: 0, max: 500, color: '#CD7F32' },
  { tier: 'silver', label: 'Silver', min: 500, max: 1500, color: '#A8A9AD' },
  { tier: 'gold', label: 'Gold', min: 1500, max: Infinity, color: '#D4AF37' },
];

function getCurrentTier(points: number): TierSpec {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
}

function getNextTier(current: TierSpec): TierSpec | null {
  const idx = TIERS.indexOf(current);
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

function computeFillRatio(points: number, current: TierSpec, next: TierSpec | null): number {
  if (!next) return 1; // max tier — full bar
  const range = next.min - current.min;
  return Math.min((points - current.min) / range, 1);
}

interface Props {
  points: number;
  testID?: string;
}

export function TierProgressBar({ points, testID }: Props) {
  const { colors, borderRadius } = useTheme();
  const currentTier = getCurrentTier(points);
  const nextTier = getNextTier(currentTier);
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

  const pointsToNext = nextTier ? nextTier.min - points : 0;

  const a11yLabel = nextTier
    ? `${currentTier.label} tier — ${pointsToNext} points to ${nextTier.label}`
    : `${currentTier.label} tier — maximum tier reached`;

  return (
    <View
      testID={testID ?? 'tier-progress-bar'}
      accessibilityLabel={a11yLabel}
      accessibilityRole="progressbar"
      style={styles.container}
    >
      {/* Labels row */}
      <View style={styles.labelsRow}>
        <Text style={[styles.tierLabel, { color: currentTier.color }]}>{currentTier.label}</Text>
        {nextTier ? (
          <Text style={[styles.nextLabel, { color: colors.muted }]}>
            {pointsToNext} pts to {nextTier.label}
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
