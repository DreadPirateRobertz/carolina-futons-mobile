/**
 * @module DeliveryTierBadge
 *
 * Compact delivery tier badge for PDP and checkout.
 * Shows tier name (Fastest / Standard / Freight) + estimated window.
 * Renders nothing when zip is absent or invalid.
 *
 * cm-ej2: delivery date estimation — fastest/standard/freight tiers
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import {
  getShippingTier,
  getDeliveryEstimate,
  type ShippingTier,
  type ItemDimensions,
} from '@/utils/deliveryEstimate';

interface Props {
  zip: string;
  dimensions?: ItemDimensions;
  testID?: string;
}

const TIER_CONFIG: Record<
  ShippingTier,
  { label: string; icon: string; colorKey: 'success' | 'mountainBlue' | 'sunsetCoral'; subtitle: string | null }
> = {
  fastest: { label: 'Fastest', icon: '⚡', colorKey: 'success', subtitle: null },
  standard: { label: 'Standard', icon: '🚚', colorKey: 'mountainBlue', subtitle: null },
  freight: {
    label: 'Freight',
    icon: '🚛',
    colorKey: 'sunsetCoral',
    subtitle: 'Carrier will contact you to schedule delivery',
  },
};

export const DeliveryTierBadge = memo(function DeliveryTierBadge({
  zip,
  dimensions,
  testID = 'delivery-tier-badge',
}: Props) {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const tier = getShippingTier(zip, dimensions);
  if (!tier) return null;

  const config = TIER_CONFIG[tier];
  const estimate = tier !== 'freight' ? getDeliveryEstimate(zip) : null;
  const badgeColor = colors[config.colorKey];

  return (
    <View testID={testID} style={styles.row} accessibilityRole="text">
      <View style={[styles.pill, { backgroundColor: badgeColor, borderRadius: borderRadius.sm }]}>
        <Text style={styles.pillText}>
          {config.icon} {config.label}
        </Text>
      </View>
      <Text
        style={[
          styles.detail,
          { color: colors.espresso, fontFamily: typography.bodyFamily, marginLeft: spacing.sm },
        ]}
      >
        {config.subtitle ?? estimate}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  detail: {
    fontSize: 13,
  },
});
