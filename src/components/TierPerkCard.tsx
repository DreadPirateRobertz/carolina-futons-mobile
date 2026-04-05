/**
 * TierPerkCard — deacon-cjv
 *
 * Displays a loyalty tier's name and full perks list.
 * Pure presentational — receives a LoyaltyTierConfig object.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import type { LoyaltyTierConfig } from '@/data/loyaltyTiers';

interface Props {
  tier: LoyaltyTierConfig;
  testID?: string;
}

export function TierPerkCard({ tier, testID }: Props) {
  const { borderRadius, typography } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: tier.color + '88',
          borderRadius: borderRadius.card,
        },
      ]}
      testID={testID ?? 'tier-perk-card'}
      accessibilityRole="none"
    >
      <View
        style={[styles.header, { backgroundColor: tier.color + '22', borderRadius: borderRadius.sm }]}
      >
        <Text
          style={[styles.title, { color: tier.color, fontFamily: typography.headingFamily }]}
          testID="tier-perk-card-title"
        >
          {tier.name}
        </Text>
      </View>
      <View style={styles.perks}>
        {tier.perks.map((perk) => (
          <View key={perk} style={styles.perkRow} testID="tier-perk-item">
            <View style={[styles.dot, { backgroundColor: tier.color }]} />
            <Text
              style={[styles.perkText, { fontFamily: typography.bodyFamily }]}
            >
              {perk}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  perks: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  perkText: {
    fontSize: 13,
    flex: 1,
    color: '#666666',
  },
});
