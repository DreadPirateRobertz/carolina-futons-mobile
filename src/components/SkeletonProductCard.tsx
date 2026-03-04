import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Shimmer, ShimmerLines } from './Shimmer';

/**
 * Skeleton placeholder matching ProductCard layout:
 * 4:3 image area + name (2 lines) + description (1 line) + rating + price
 */
export const SkeletonProductCard = memo(function SkeletonProductCard({
  testID,
}: {
  testID?: string;
}) {
  const { colors, borderRadius, shadows, spacing } = useTheme();

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        { backgroundColor: colors.white, borderRadius: borderRadius.card },
      ]}
      testID={testID ?? 'skeleton-product-card'}
      accessibilityLabel="Loading product"
    >
      {/* Image placeholder */}
      <Shimmer
        height={0}
        borderRadius={0}
        style={{
          aspectRatio: 4 / 3,
          width: '100%',
          borderTopLeftRadius: borderRadius.card,
          borderTopRightRadius: borderRadius.card,
        }}
      />

      {/* Info area */}
      <View style={[styles.info, { padding: spacing.sm }]}>
        {/* Name - 2 lines */}
        <ShimmerLines lines={2} lineHeight={14} gap={4} lastLineWidth="70%" />

        {/* Description - 1 line */}
        <Shimmer width="85%" height={12} style={{ marginTop: 4 }} />

        {/* Rating row */}
        <View style={styles.ratingRow}>
          <Shimmer width={70} height={12} />
          <Shimmer width={24} height={12} />
        </View>

        {/* Price */}
        <Shimmer width={60} height={16} borderRadius={4} style={{ marginTop: 2 }} />
      </View>
    </View>
  );
});

/** Grid of skeleton product cards matching ShopScreen 2-column layout. */
export function SkeletonProductGrid({ count = 4 }: { count?: number }) {
  const rows = [];
  for (let i = 0; i < count; i += 2) {
    rows.push(
      <View key={i} style={styles.row}>
        <SkeletonProductCard testID={`skeleton-card-${i}`} />
        {i + 1 < count && <SkeletonProductCard testID={`skeleton-card-${i + 1}`} />}
      </View>,
    );
  }
  return <View testID="skeleton-product-grid">{rows}</View>;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 12,
    overflow: 'hidden',
  },
  info: {
    gap: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
});
