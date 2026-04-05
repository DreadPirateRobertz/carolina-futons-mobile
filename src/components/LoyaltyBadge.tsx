/**
 * LoyaltyBadge — cm-elo / deacon-cjv
 *
 * Displays a color-coded tier badge.
 * Accepts a LoyaltyTierConfig object — reads .name and .color directly.
 * Pure presentational component.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LoyaltyTierConfig } from '@/data/loyaltyTiers';
import { useTheme } from '@/theme';

interface Props {
  tier: LoyaltyTierConfig;
  testID?: string;
}

export function LoyaltyBadge({ tier, testID }: Props) {
  const { borderRadius } = useTheme();
  const color = tier.color;
  const label = tier.name;
  const slug = tier.name.toLowerCase().replace(/\s+/g, '-');

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color + '22', borderColor: color, borderRadius: borderRadius.sm },
      ]}
      testID={testID ?? `loyalty-badge-${slug}`}
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
