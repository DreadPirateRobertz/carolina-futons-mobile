/**
 * @module SkeletonOrderDetail
 *
 * Full-page skeleton placeholder for the OrderDetailScreen. Mirrors the
 * layout: header with status badge, date, status timeline, line items,
 * totals card, shipping address, and payment info. Shown while the order
 * data is loading from the API.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Shimmer, ShimmerLines, ShimmerCircle } from './Shimmer';

/**
 * Skeleton placeholder matching OrderDetailScreen layout:
 * Header → date → timeline → line items → totals → address → payment
 */
export function SkeletonOrderDetail({ testID }: { testID?: string }) {
  const { colors, spacing, borderRadius, shadows } = useTheme();

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'skeleton-order-detail'}
      accessibilityLabel="Loading order details"
    >
      {/* Header: order number + status badge */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <Shimmer width={160} height={24} borderRadius={6} />
        <Shimmer width={80} height={24} borderRadius={borderRadius.sm} style={{ marginLeft: 12 }} />
      </View>

      {/* Date */}
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Shimmer width={180} height={14} />
      </View>

      {/* Status timeline */}
      <View style={[styles.timeline, { paddingHorizontal: spacing.lg }]}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.timelineStep}>
            <View style={styles.timelineIndicator}>
              <ShimmerCircle size={12} />
              {i < 3 && <Shimmer width={2} height={28} style={{ marginVertical: 2 }} />}
            </View>
            <Shimmer width={70} height={14} style={{ marginLeft: 12 }} />
          </View>
        ))}
      </View>

      {/* Line items */}
      <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
        <Shimmer width={50} height={18} style={{ marginBottom: 12 }} />
        {[0, 1].map((i) => (
          <View
            key={i}
            style={[
              styles.lineItem,
              {
                backgroundColor: colors.sandLight,
                borderRadius: borderRadius.card,
                marginBottom: 8,
              },
              shadows.card,
            ]}
          >
            <View style={styles.lineItemTop}>
              <ShimmerCircle size={24} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Shimmer width="70%" height={15} />
                <Shimmer width="40%" height={13} style={{ marginTop: 4 }} />
              </View>
            </View>
            <View style={styles.lineItemBottom}>
              <Shimmer width={50} height={13} />
              <Shimmer width={70} height={16} />
            </View>
          </View>
        ))}
      </View>

      {/* Totals card */}
      <View
        style={[
          styles.totalsCard,
          {
            backgroundColor: colors.sandLight,
            borderRadius: borderRadius.card,
            marginHorizontal: spacing.lg,
          },
          shadows.card,
        ]}
      >
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.totalRow}>
            <Shimmer width={70} height={15} />
            <Shimmer width={50} height={15} />
          </View>
        ))}
        <View style={[styles.divider, { backgroundColor: colors.sandDark }]} />
        <View style={styles.totalRow}>
          <Shimmer width={50} height={18} />
          <Shimmer width={80} height={22} />
        </View>
      </View>

      {/* Shipping address */}
      <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
        <Shimmer width={130} height={18} style={{ marginBottom: 12 }} />
        <View
          style={[
            styles.addressCard,
            {
              backgroundColor: colors.sandLight,
              borderRadius: borderRadius.card,
            },
            shadows.card,
          ]}
        >
          <ShimmerLines lines={3} lineHeight={14} gap={6} lastLineWidth="60%" />
        </View>
      </View>

      {/* Payment */}
      <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
        <Shimmer width={70} height={18} style={{ marginBottom: 12 }} />
        <Shimmer width={150} height={15} />
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
    paddingTop: 60,
    paddingBottom: 12,
  },
  timeline: {
    paddingVertical: 8,
    marginTop: 12,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineIndicator: {
    alignItems: 'center',
    width: 24,
  },
  section: {
    paddingTop: 20,
  },
  lineItem: {
    padding: 14,
  },
  lineItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineItemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  totalsCard: {
    padding: 20,
    marginTop: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  addressCard: {
    padding: 14,
  },
});
