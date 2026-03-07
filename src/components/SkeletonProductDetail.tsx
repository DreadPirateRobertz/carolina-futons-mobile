/**
 * @module SkeletonProductDetail
 *
 * Full-page skeleton placeholder for the ProductDetailScreen. Mirrors the
 * exact layout: gallery image, product name/tagline, price, fabric swatches,
 * dimension card, and review section. Shown while the product detail API
 * response is loading.
 */

import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { useTheme } from '@/theme';
import { Shimmer, ShimmerLines, ShimmerCircle } from './Shimmer';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Skeleton placeholder matching ProductDetailScreen layout:
 * Gallery image → product name/tagline → price → fabric swatches → dimensions → reviews
 */
export function SkeletonProductDetail({ testID }: { testID?: string }) {
  const { colors, spacing, borderRadius, shadows } = useTheme();

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'skeleton-product-detail'}
      accessibilityLabel="Loading product details"
    >
      {/* Gallery placeholder */}
      <Shimmer
        width={SCREEN_WIDTH}
        height={300}
        borderRadius={0}
        style={{ backgroundColor: colors.sandLight }}
      />

      {/* Pagination dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map((i) => (
          <Shimmer key={i} width={8} height={8} borderRadius={4} />
        ))}
      </View>

      {/* Product info */}
      <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
        {/* Name */}
        <Shimmer width="80%" height={28} borderRadius={6} />
        {/* Tagline */}
        <Shimmer width="60%" height={15} style={{ marginTop: 6 }} />
        {/* Price */}
        <Shimmer width={100} height={26} borderRadius={6} style={{ marginTop: 14 }} />
      </View>

      {/* Fabric section */}
      <View style={[styles.section, { paddingHorizontal: spacing.lg, paddingTop: 20 }]}>
        <Shimmer width={50} height={16} style={{ marginBottom: 10 }} />
        <Shimmer width={120} height={14} style={{ marginBottom: 12 }} />
        <View style={styles.swatchRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <ShimmerCircle key={i} size={40} />
          ))}
        </View>
      </View>

      {/* Dimensions card */}
      <View style={[styles.section, { paddingHorizontal: spacing.lg, paddingTop: 20 }]}>
        <Shimmer width={90} height={16} style={{ marginBottom: 10 }} />
        <View
          style={[
            styles.dimCard,
            { backgroundColor: colors.sandLight, borderRadius: borderRadius.card },
            shadows.card,
          ]}
        >
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.dimItem}>
              <Shimmer width={40} height={18} />
              <Shimmer width={30} height={12} style={{ marginTop: 4 }} />
            </View>
          ))}
        </View>
      </View>

      {/* Reviews section */}
      <View style={[styles.section, { paddingHorizontal: spacing.lg, paddingTop: 20 }]}>
        <Shimmer width={70} height={16} style={{ marginBottom: 12 }} />
        {/* Review summary bar */}
        <Shimmer width="100%" height={60} borderRadius={borderRadius.md} />
        {/* Review cards */}
        {[0, 1].map((i) => (
          <View key={i} style={[styles.reviewCard, { marginTop: 12 }]}>
            <View style={styles.reviewHeader}>
              <ShimmerCircle size={32} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Shimmer width="50%" height={14} />
                <Shimmer width="30%" height={12} style={{ marginTop: 4 }} />
              </View>
            </View>
            <ShimmerLines
              lines={3}
              lineHeight={12}
              gap={6}
              lastLineWidth="45%"
              style={{ marginTop: 10 }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  section: {
    paddingTop: 4,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dimCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  dimItem: {
    alignItems: 'center',
  },
  reviewCard: {
    paddingVertical: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
