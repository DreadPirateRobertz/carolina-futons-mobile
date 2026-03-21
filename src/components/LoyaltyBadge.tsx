/**
 * LoyaltyBadge — cm-elo
 *
 * Displays a color-coded tier badge (Bronze / Silver / Gold).
 * Pure presentational component.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LoyaltyTier } from '@/hooks/useLoyalty';
import { useTheme } from '@/theme';

const TIER_LABELS: Record<LoyaltyTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
};

const TIER_COLORS: Record<LoyaltyTier, string> = {
  bronze: '#CD7F32',
  silver: '#A8A9AD',
  gold: '#D4AF37',
};

interface Props {
  tier: LoyaltyTier;
  testID?: string;
}

export function LoyaltyBadge({ tier, testID }: Props) {
  const { borderRadius } = useTheme();
  const color = TIER_COLORS[tier];
  const label = TIER_LABELS[tier];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color + '22', borderColor: color, borderRadius: borderRadius.sm },
      ]}
      testID={testID ?? `loyalty-badge-${tier}`}
      accessibilityLabel={`${label} tier`}
    >
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
