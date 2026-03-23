/**
 * @module CartPointsSummary
 *
 * Shows "You'll earn X pts on this order" in the cart order summary,
 * above the total. Hidden for guests and when cart is empty.
 *
 * Formula: floor(subtotal * 0.06)  — matches loyalty earn rate.
 * cfutons_mobile-a02
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { calcPoints } from './PointsChip';

interface Props {
  /** Cart subtotal in dollars. */
  subtotal: number;
  /** Hide for unauthenticated / guest users. */
  isAuthenticated: boolean;
  testID?: string;
}

export function CartPointsSummary({
  subtotal,
  isAuthenticated,
  testID = 'cart-points-summary',
}: Props) {
  if (!isAuthenticated || subtotal <= 0) return null;

  const pts = calcPoints(subtotal);
  const label = `You'll earn ${pts} pts on this order`;

  const { colors, typography } = useTheme();

  return (
    <View
      style={styles.row}
      testID={testID}
      accessibilityLabel={`You'll earn ${pts} loyalty points on this order`}
    >
      <Text
        style={[styles.label, { color: colors.mountainBlue, fontFamily: typography.bodyFamily }]}
        testID="cart-points-label"
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 4,
  },
  label: {
    fontSize: 13,
  },
});
