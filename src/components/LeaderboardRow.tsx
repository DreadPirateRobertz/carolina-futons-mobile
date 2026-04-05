/**
 * LeaderboardRow — cf-op6
 *
 * Displays a single leaderboard entry: rank, nickname, points, tier badge.
 * Highlights the current user's row with a distinct border.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { LoyaltyBadge } from './LoyaltyBadge';
import type { LoyaltyTierConfig } from '@/data/loyaltyTiers';

export interface LeaderboardRowProps {
  rank: number;
  nickname: string;
  points: number;
  tier: LoyaltyTierConfig;
  isCurrentUser?: boolean;
  testID?: string;
}

export function LeaderboardRow({
  rank,
  nickname,
  points,
  tier,
  isCurrentUser = false,
  testID,
}: LeaderboardRowProps) {
  const { colors, spacing, borderRadius } = useTheme();
  const formattedPoints = points.toLocaleString('en-US');
  const a11yLabel = `Rank ${rank}, ${nickname}, ${formattedPoints} points, ${tier.name} tier${isCurrentUser ? ', you' : ''}`;

  return (
    <View
      testID={testID ?? `leaderboard-row-${rank}`}
      accessible
      accessibilityLabel={a11yLabel}
      style={[
        styles.row,
        {
          backgroundColor: darkPalette.surface,
          borderRadius: borderRadius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          marginBottom: spacing.xs,
        },
        isCurrentUser && {
          borderWidth: 2,
          borderColor: colors.mountainBlue,
        },
      ]}
    >
      <Text testID="leaderboard-row-rank" style={[styles.rank, { color: darkPalette.textMuted }]}>
        {rank}
      </Text>
      <Text
        testID="leaderboard-row-nickname"
        style={[styles.nickname, { color: darkPalette.textPrimary }]}
        numberOfLines={1}
      >
        {nickname}
      </Text>
      <View style={styles.right}>
        <LoyaltyBadge tier={tier} />
        <Text
          testID="leaderboard-row-points"
          style={[styles.points, { color: darkPalette.textPrimary }]}
        >
          {formattedPoints} pts
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rank: {
    width: 32,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  nickname: {
    flex: 1,
    fontSize: 15,
    marginHorizontal: 8,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  points: {
    fontSize: 13,
    fontWeight: '600',
  },
});
