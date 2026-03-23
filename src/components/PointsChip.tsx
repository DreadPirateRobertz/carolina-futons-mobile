/**
 * @module PointsChip
 *
 * Shows 'Earn X pts' pill below the price on ProductDetailScreen.
 * Hidden for guest users (isAuthenticated: false).
 *
 * Formula: floor(price * 0.06)  — matches loyalty earn rate.
 * cfutons_mobile-a02
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  /** Product price in dollars (e.g. 799 → Earn 47 pts). */
  price: number;
  /** Hide chip for unauthenticated / guest users. */
  isAuthenticated: boolean;
  testID?: string;
}

export function calcPoints(price: number): number {
  return Math.floor(price * 0.06);
}

export function PointsChip({ price, isAuthenticated, testID = 'points-chip' }: Props) {
  if (!isAuthenticated) return null;

  const pts = calcPoints(price);
  const label = `Earn ${pts} pts`;

  const { colors, typography, borderRadius, spacing } = useTheme();

  return (
    <View
      style={[styles.chip, { backgroundColor: colors.mountainBlue, borderRadius: borderRadius.sm }]}
      testID={testID}
      accessibilityLabel={`Earn ${pts} loyalty points`}
    >
      <Text
        style={[
          styles.label,
          { color: '#FFFFFF', fontFamily: typography.bodyFamilyBold, marginLeft: spacing.xs },
        ]}
        testID="points-chip-label"
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
