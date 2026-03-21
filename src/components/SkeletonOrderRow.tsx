/**
 * @module SkeletonOrderRow
 *
 * Skeleton loading placeholder for a compact order history row:
 * avatar thumbnail + 2 text lines + status badge.
 * Used while useOrders is fetching in OrderHistoryScreen.
 *
 * cm-1jd: skeleton loading on all list views
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { darkPalette } from '@/theme/tokens';
import { Shimmer } from './Shimmer';

/** Skeleton placeholder for a single compact order row. */
export const SkeletonOrderRow = memo(function SkeletonOrderRow({ testID }: { testID?: string }) {
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: darkPalette.surface, borderColor: darkPalette.borderSubtle },
      ]}
      testID={testID ?? 'skeleton-order-row'}
      accessibilityLabel="Loading order"
    >
      {/* Avatar / thumbnail */}
      <View testID="skeleton-order-row-avatar">
        <Shimmer width={44} height={44} borderRadius={8} />
      </View>

      {/* Text lines */}
      <View style={styles.textBlock}>
        <View testID="skeleton-order-row-line1">
          <Shimmer width="60%" height={14} borderRadius={3} />
        </View>
        <View testID="skeleton-order-row-line2" style={{ marginTop: 6 }}>
          <Shimmer width="40%" height={12} borderRadius={3} />
        </View>
      </View>

      {/* Status badge */}
      <View testID="skeleton-order-row-badge">
        <Shimmer width={70} height={22} borderRadius={6} />
      </View>
    </View>
  );
});

/** Vertical list of skeleton order rows. */
export function SkeletonOrderRowList({ count = 4 }: { count?: number }) {
  return (
    <View testID="skeleton-order-row-list" style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonOrderRow key={i} testID={`skeleton-order-row-${i}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  textBlock: {
    flex: 1,
  },
});
