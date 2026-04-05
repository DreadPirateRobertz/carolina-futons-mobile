/**
 * @module LoyaltyCard
 *
 * Displays the current member's loyalty status:
 *   - Points balance
 *   - Tier badge (Bronze / Silver / Gold)
 *   - Progress bar toward next tier
 *   - "X points to <NextTier>" or "You've reached Gold!" text
 *
 * Returns null (renders nothing) when points = 0 and hasActivity = false.
 *
 * Tier thresholds per CF-yq80:
 *   Bronze 0-499  (→ Silver at 500)
 *   Silver 500-1499 (→ Gold at 1500)
 *   Gold 1500+
 *
 * cm-a31
 */
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/theme';
import { LoyaltyBadge } from './LoyaltyBadge';
import { getTierForPoints, getNextTier } from '@/data/loyaltyTiers';
import type { LoyaltyCardData } from '@/hooks/useLoyaltyCard';

interface Props extends LoyaltyCardData {
  testID?: string;
}

/** Loyalty points card with tier badge, progress bar, and next-tier prompt. */
export function LoyaltyCard({ points, progressPercent, hasActivity, testID }: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  // Hide if no points and no prior activity
  if (points === 0 && !hasActivity) return null;

  const tierConfig = getTierForPoints(points);
  const nextTierConfig = getNextTier(tierConfig);
  const pointsToNext = nextTierConfig ? Math.max(0, nextTierConfig.minPoints - points) : 0;
  const nextTierText = nextTierConfig
    ? `${pointsToNext} points to ${nextTierConfig.name}`
    : `You've reached ${tierConfig.name}!`;
  const tierSlug = tierConfig.name.toLowerCase().replace(/\s+/g, '-');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.sandBase,
          borderColor: colors.sandDark,
          borderRadius: borderRadius.card,
          padding: spacing.md,
        },
      ]}
      testID={testID ?? 'loyalty-card'}
      accessibilityRole="none"
    >
      {/* Header: points + tier badge */}
      <View style={styles.header}>
        <View>
          <Text
            style={[
              styles.pointsLabel,
              { color: colors.espressoLight, fontFamily: typography.bodyFamily },
            ]}
          >
            Your Points
          </Text>
          <Text
            style={[
              styles.pointsValue,
              { color: colors.espresso, fontFamily: typography.headingFamily },
            ]}
            testID="loyalty-points"
          >
            {points.toLocaleString()}
          </Text>
        </View>
        <LoyaltyBadge tier={tierConfig} testID={`loyalty-badge-${tierSlug}`} />
      </View>

      {/* Progress bar */}
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: colors.sandDark, borderRadius: borderRadius.pill },
        ]}
        testID="loyalty-progress-track"
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPercent}%`,
              backgroundColor: tierConfig.color,
              borderRadius: borderRadius.pill,
            },
          ]}
          testID="loyalty-progress-bar"
        />
      </View>

      {/* Next-tier text */}
      <Text
        style={[
          styles.nextTierText,
          { color: colors.espressoLight, fontFamily: typography.bodyFamily },
        ]}
        testID="loyalty-next-tier-text"
      >
        {nextTierText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pointsLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
  },
  nextTierText: {
    fontSize: 13,
  },
});
