/**
 * @module CartItemDeliveryEstimate
 *
 * Inline delivery estimate chip shown on each CartItemRow — cm-afc.
 *
 * Renders nothing while loading or when no zip is stored (no-zip state).
 * For local/parcel/freight states shows a compact 🚚 label with the
 * delivery window and an optional "Local" badge.
 */

import React, { memo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/theme';
import { useCartItemDeliveryEstimate } from '@/hooks/useCartItemDeliveryEstimate';
import type { CartItem } from '@/hooks/useCart';

interface Props {
  item: CartItem;
  testID?: string;
}

export const CartItemDeliveryEstimate = memo(function CartItemDeliveryEstimate({
  item,
  testID = 'delivery-estimate',
}: Props) {
  const { colors, typography } = useTheme();
  const { mode, displayText, isLoading } = useCartItemDeliveryEstimate(item);

  if (isLoading || mode === 'no-zip' || !displayText) return null;

  const isFreight = mode === 'freight';
  const isLocal = mode === 'local';

  return (
    <View
      style={styles.row}
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`Estimated delivery: ${displayText}`}
    >
      <Text style={styles.icon}>{isFreight ? '🚛' : '🚚'}</Text>
      <Text
        style={[
          styles.label,
          {
            color: isFreight ? colors.sunsetCoralDark ?? colors.sunsetCoral : colors.espressoLight,
            fontFamily: typography.bodyFamily,
          },
        ]}
        testID={isFreight ? 'delivery-freight-label' : 'delivery-text-label'}
      >
        {displayText}
      </Text>
      {isLocal ? (
        <View style={[styles.badge, { backgroundColor: colors.success ?? '#2E7D32' }]}
          testID="delivery-local-badge"
        >
          <Text style={styles.badgeText}>Local</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  icon: {
    fontSize: 12,
  },
  label: {
    fontSize: 12,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
