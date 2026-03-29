/**
 * @module LoyaltyTierBadge
 *
 * Displays the loyalty tier name and points balance for the current member.
 * Uses TIER_THRESHOLDS and TIER_NAMES from gamificationTokens.js (shared with web).
 *
 * Used in AccountScreen header next to the user avatar.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { getTierIndex, TIER_NAMES } from '@/public/gamificationTokens';

interface Props {
  points: number;
  testID?: string;
}

/** Color palette for each tier, ordered Trail Blazer → Blue Ridge Legend. */
const TIER_COLORS = ['#7B9E87', '#4A90C4', '#C49A3A', '#8B5CF6'] as const;

export function LoyaltyTierBadge({ points, testID }: Props) {
  const { borderRadius } = useTheme();
  const tierIndex = getTierIndex(points);
  const tierName = TIER_NAMES[tierIndex];
  const color = TIER_COLORS[tierIndex];

  return (
    <View
      testID={testID ?? 'loyalty-tier-badge'}
      accessible
      accessibilityLabel={`${tierName} tier, ${points.toLocaleString()} points`}
      style={styles.container}
    >
      <View
        style={[styles.badge, { backgroundColor: color, borderRadius: borderRadius.pill }]}
        testID="loyalty-tier-badge-inner"
      >
        <Text style={styles.tierName} testID="loyalty-tier-name">
          {tierName}
        </Text>
      </View>
      <Text style={styles.points} testID="loyalty-points-balance">
        {points.toLocaleString()} pts
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tierName: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  points: {
    color: '#A0A0A0',
    fontSize: 12,
    fontWeight: '500',
  },
});
