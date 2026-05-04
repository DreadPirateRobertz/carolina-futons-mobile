import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { SkeletonBox, SkeletonText } from './Skeleton';

const CARD_WIDTH = 160;
const IMAGE_HEIGHT = 120;

export const SkeletonCarouselItem = memo(function SkeletonCarouselItem({
  testID,
}: {
  testID?: string;
}) {
  const { colors, borderRadius, shadows, spacing } = useTheme();
  const id = testID ?? 'skeleton-carousel-item';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.white, borderRadius: borderRadius.md, ...shadows.card },
      ]}
      testID={id}
      accessibilityLabel="Loading recommendation"
    >
      <SkeletonBox
        testID={`${id}-image`}
        width={CARD_WIDTH}
        height={IMAGE_HEIGHT}
        borderRadius={0}
        style={{
          borderTopLeftRadius: borderRadius.md,
          borderTopRightRadius: borderRadius.md,
        }}
      />
      <View style={[styles.body, { padding: spacing.sm }]}>
        <SkeletonText testID={`${id}-name`} lines={2} lineHeight={13} />
        <SkeletonBox
          testID={`${id}-price`}
          width={50}
          height={14}
          borderRadius={4}
          style={{ marginTop: 6 }}
        />
        <SkeletonBox width={70} height={12} borderRadius={4} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
});

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
