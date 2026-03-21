/**
 * @module SkeletonOrderCard
 *
 * Skeleton loading placeholder matching OrderHistoryScreen's order card:
 * order number + status badge, date, items summary + total.
 * Used while useOrders is fetching.
 *
 * cm-3l5: skeleton loading on all list views
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { darkPalette } from '@/theme/tokens';
import { Shimmer } from './Shimmer';

/** Skeleton placeholder matching a single order card. */
export const SkeletonOrderCard = memo(function SkeletonOrderCard({ testID }: { testID?: string }) {
  return (
    <View
      style={[styles.card, { backgroundColor: darkPalette.surface }]}
      testID={testID ?? 'skeleton-order-card'}
      accessibilityLabel="Loading order"
    >
      {/* Header row: order number + status badge */}
      <View style={styles.headerRow}>
        <Shimmer width="45%" height={16} borderRadius={4} />
        <Shimmer width={70} height={22} borderRadius={6} />
      </View>

      {/* Date */}
      <Shimmer width="35%" height={13} borderRadius={3} style={{ marginTop: 6 }} />

      {/* Footer: item summary + total */}
      <View style={styles.footerRow}>
        <Shimmer width="55%" height={14} borderRadius={3} />
        <Shimmer width={70} height={20} borderRadius={4} />
      </View>
    </View>
  );
});

/** Vertical list of skeleton order cards. */
export function SkeletonOrderList({ count = 5 }: { count?: number }) {
  return (
    <View testID="skeleton-order-list" style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonOrderCard key={i} testID={`skeleton-order-${i}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: darkPalette.borderSubtle,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
});
