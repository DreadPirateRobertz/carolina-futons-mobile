/**
 * @module InventoryBadge
 *
 * Displays live inventory urgency information on product cards and detail screens.
 *
 *   - 'low_stock'      → "Only X left"  (amber/warm tone)
 *   - 'just_restocked' → "Just restocked" (green/mountain tone)
 *   - 'none'           → renders nothing
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import type { InventoryBadgeType } from '@/hooks/useInventoryBadge';

interface Props {
  badge: InventoryBadgeType;
  quantity: number;
  /** Smaller layout for compact product cards */
  compact?: boolean;
  testID?: string;
}

export function InventoryBadge({
  badge,
  quantity,
  compact = false,
  testID = 'inventory-badge',
}: Props) {
  const { colors, borderRadius } = useTheme();

  if (badge === 'none') return null;

  const isLowStock = badge === 'low_stock';
  const label = isLowStock ? `Only ${quantity} left` : 'Just restocked';
  const accessibilityLabel = isLowStock
    ? `Only ${quantity} left in stock`
    : 'Just restocked — limited availability';

  const backgroundColor = isLowStock ? colors.sunsetCoral : colors.mountainBlue;

  return (
    <View
      style={[
        styles.badge,
        compact && styles.compact,
        { backgroundColor, borderRadius: borderRadius.sm },
      ]}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={[styles.text, compact && styles.compactText, { color: colors.white }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  compact: {
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  compactText: {
    fontSize: 10,
  },
});
