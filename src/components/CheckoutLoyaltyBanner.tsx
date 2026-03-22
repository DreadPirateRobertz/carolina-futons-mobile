/**
 * @module CheckoutLoyaltyBanner
 *
 * Displays the current loyalty tier and progress toward the next tier
 * near the order summary in CheckoutScreen. Pure presentational — caller
 * supplies tier data from useLoyalty() and computes pointsToNext.
 *
 * Renders nothing when loading, error, or hidden (service unavailable).
 *
 * Bead: cm-ds5
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LoyaltyTier } from '@/hooks/useLoyalty';
import { useTheme } from '@/theme';

const TIER_COLORS: Record<LoyaltyTier, string> = {
  bronze: '#CD7F32',
  silver: '#A8A9AD',
  gold: '#D4AF37',
};

const TIER_LABELS: Record<LoyaltyTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
};

interface Props {
  tier: LoyaltyTier;
  points: number;
  pointsToNext: number;
  nextTierLabel: string | null;
  loading?: boolean;
  error?: string | null;
  hidden?: boolean;
  testID?: string;
}

export function CheckoutLoyaltyBanner({
  tier,
  points,
  pointsToNext,
  nextTierLabel,
  loading = false,
  error = null,
  hidden = false,
  testID,
}: Props) {
  const { colors, spacing, borderRadius } = useTheme();

  if (loading || error || hidden) return null;

  const tierColor = TIER_COLORS[tier];
  const tierLabel = TIER_LABELS[tier];

  const progressText =
    nextTierLabel && pointsToNext > 0
      ? `${pointsToNext} pts to ${nextTierLabel}`
      : nextTierLabel && pointsToNext === 0
        ? `${pointsToNext} pts to ${nextTierLabel}`
        : 'Top tier — highest status!';

  const accessibilityLabel = nextTierLabel
    ? `${tierLabel} loyalty member. ${pointsToNext} points to ${nextTierLabel}.`
    : `${tierLabel} loyalty member. Top tier status.`;

  return (
    <View
      style={[
        styles.container,
        { borderColor: tierColor + '44', backgroundColor: tierColor + '11' },
      ]}
      testID={testID ?? 'checkout-loyalty-banner'}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      <View style={styles.row}>
        <View
          style={[styles.tierPill, { backgroundColor: tierColor, borderRadius: borderRadius.pill }]}
        >
          <Text style={styles.tierPillText} testID="checkout-loyalty-tier-label">
            {tierLabel}
          </Text>
        </View>
        <Text
          style={[styles.points, { color: colors.espressoLight }]}
          testID="checkout-loyalty-points"
        >
          {points.toLocaleString()} pts
        </Text>
      </View>
      <Text style={[styles.progress, { color: tierColor }]} testID="checkout-loyalty-progress">
        {progressText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tierPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  points: {
    fontSize: 12,
    fontWeight: '500',
  },
  progress: {
    fontSize: 12,
    fontWeight: '600',
  },
});
