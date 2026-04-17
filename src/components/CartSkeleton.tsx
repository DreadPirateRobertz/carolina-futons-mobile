/**
 * @module CartSkeleton
 *
 * Loading skeleton for CartScreen. Mirrors the rough layout (header row,
 * 2-3 item cards, summary card, checkout bar) while cart state hydrates
 * from AsyncStorage to prevent flash-of-empty-content.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { SkeletonRow, SkeletonCard } from './Skeleton';

export function CartSkeleton({ testID }: { testID?: string }) {
  const { spacing } = useTheme();

  return (
    <View
      style={[styles.root, { backgroundColor: darkPalette.background }]}
      testID={testID ?? 'cart-skeleton'}
      accessibilityLabel="Loading cart"
      accessibilityRole="progressbar"
    >
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <SkeletonRow width={140} height={28} testID="cart-skeleton-header" />
        <SkeletonRow width={70} height={16} />
      </View>

      <View style={[styles.itemList, { paddingHorizontal: spacing.lg, gap: spacing.md }]}>
        <SkeletonCard header lines={2} testID="cart-skeleton-item-0" />
        <SkeletonCard header lines={2} testID="cart-skeleton-item-1" />
        <SkeletonCard header lines={2} testID="cart-skeleton-item-2" />
      </View>

      <View style={[styles.summary, { paddingHorizontal: spacing.lg, marginTop: spacing.lg }]}>
        <SkeletonCard header lines={4} testID="cart-skeleton-summary" />
      </View>

      <View style={[styles.checkout, { paddingHorizontal: spacing.lg, marginTop: spacing.lg }]}>
        <SkeletonRow height={52} borderRadius={8} testID="cart-skeleton-checkout" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 12,
  },
  itemList: {
    marginTop: 8,
  },
  summary: {},
  checkout: {},
});
