import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Shimmer } from './Shimmer';

const CARD_WIDTH = 160;
const IMAGE_HEIGHT = 120;

/**
 * Skeleton placeholder matching RecommendationCarousel card layout:
 * Image (160x120) → name (2 lines) → price → rating stars
 */
export const SkeletonCarouselItem = memo(function SkeletonCarouselItem({
  testID,
}: {
  testID?: string;
}) {
  const { colors, borderRadius, shadows, spacing } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.white, borderRadius: borderRadius.md, ...shadows.card },
      ]}
      testID={testID ?? 'skeleton-carousel-item'}
      accessibilityLabel="Loading recommendation"
    >
      <Shimmer
        width={CARD_WIDTH}
        height={IMAGE_HEIGHT}
        borderRadius={0}
        style={{
          borderTopLeftRadius: borderRadius.md,
          borderTopRightRadius: borderRadius.md,
        }}
      />
      <View style={[styles.body, { padding: spacing.sm }]}>
        <Shimmer width="90%" height={13} />
        <Shimmer width="60%" height={13} style={{ marginTop: 4 }} />
        <Shimmer width={50} height={14} style={{ marginTop: 6 }} />
        <Shimmer width={70} height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
});

/** Horizontal row of skeleton carousel items. */
export function SkeletonCarouselRow({ count = 3 }: { count?: number }) {
  const { spacing } = useTheme();

  return (
    <View style={[styles.row, { paddingHorizontal: spacing.md }]} testID="skeleton-carousel-row">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={i > 0 ? { marginLeft: spacing.sm } : undefined}>
          <SkeletonCarouselItem testID={`skeleton-carousel-${i}`} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    overflow: 'hidden',
  },
  body: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
  },
});
