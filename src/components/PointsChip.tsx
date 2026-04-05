/**
 * @module PointsChip
 *
 * Shows 'Earn X pts' pill below the price on ProductDetailScreen.
 * Hidden for guest users (isAuthenticated: false).
 *
 * Formula: floor(price * earnRate). Default earnRate 0.06 (Trail Blazer 1×).
 * Pass earnRate from useLoyaltyEarnEstimate for tier-aware display (cm-2qq).
 * Phase 6 (hq-xfib1): shows '2×' bonus badge when bonusPointsDayActive=true.
 * cfutons_mobile-a02, hq-xfib1, cm-2qq
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { calcTieredPoints } from '@/data/loyaltyTiers';

interface Props {
  /** Product price in dollars (e.g. 799 → Earn 47 pts at Trail Blazer rate). */
  price: number;
  /** Hide chip for unauthenticated / guest users. */
  isAuthenticated: boolean;
  /** Points earned per dollar. Defaults to 0.06 (Trail Blazer). Pass from useLoyaltyEarnEstimate for tier-aware display. */
  earnRate?: number;
  /** When true, shows a '2×' bonus badge (Phase 6 BONUS_POINTS_DAY perk). */
  bonusPointsDayActive?: boolean;
  testID?: string;
}

/** @deprecated Use calcTieredPoints from loyaltyTiers instead. Kept for external callers. */
export function calcPoints(price: number): number {
  return calcTieredPoints(price, 0.06);
}

export function PointsChip({
  price,
  isAuthenticated,
  earnRate = 0.06,
  bonusPointsDayActive = false,
  testID = 'points-chip',
}: Props) {
  const { colors, typography, borderRadius, spacing } = useTheme();

  if (!isAuthenticated) return null;

  const pts = calcTieredPoints(price, earnRate);
  const a11yLabel = bonusPointsDayActive
    ? `Earn ${pts} loyalty points — bonus points day, 2× multiplier active`
    : `Earn ${pts} loyalty points`;

  return (
    <View
      style={[styles.chip, { backgroundColor: colors.mountainBlue, borderRadius: borderRadius.sm }]}
      testID={testID}
      accessibilityLabel={a11yLabel}
    >
      <Text
        style={[
          styles.label,
          { color: '#FFFFFF', fontFamily: typography.bodyFamilyBold, marginLeft: spacing.xs },
        ]}
        testID="points-chip-label"
      >
        {`Earn ${pts} pts`}
      </Text>
      {bonusPointsDayActive && (
        <Text
          style={[styles.bonus, { color: '#FFD700', fontFamily: typography.bodyFamilyBold }]}
          testID="points-chip-bonus"
          accessible={false}
        >
          {'  2×'}
        </Text>
      )}
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
  bonus: {
    fontSize: 13,
    fontWeight: '700',
  },
});
