import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { SkeletonBox, SkeletonText } from './Skeleton';

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
      <SkeletonBox
        testID={`${testID ?? 'skeleton-product-card'}-image`}
        height={0}
        borderRadius={0}
        style={{
          aspectRatio: 4 / 3,
          width: '100%',
          borderTopLeftRadius: borderRadius.card,
          borderTopRightRadius: borderRadius.card,
        }}
      />

      <View style={[styles.info, { padding: spacing.sm }]}>
        <SkeletonText
          testID={`${testID ?? 'skeleton-product-card'}-name`}
          lines={2}
          lineHeight={14}
        />

        <SkeletonText
          testID={`${testID ?? 'skeleton-product-card'}-description`}
          lines={1}
          lineHeight={12}
          style={{ marginTop: 4 }}
        />

        <View style={styles.ratingRow}>
          <SkeletonBox width={70} height={12} borderRadius={4} />
          <SkeletonBox width={24} height={12} borderRadius={4} />
        </View>

        <SkeletonBox
          testID={`${testID ?? 'skeleton-product-card'}-price`}
          width={60}
          height={16}
          borderRadius={4}
          style={{ marginTop: 2 }}
        />
      </View>
    </View>
  );
});

export function SkeletonProductGrid({ count = 4, testID }: { count?: number; testID?: string }) {
  const rows = [];
  for (let i = 0; i < count; i += 2) {
    rows.push(
      <View key={i} style={styles.row}>
        <SkeletonProductCard testID={`skeleton-card-${i}`} />
        {i + 1 < count && <SkeletonProductCard testID={`skeleton-card-${i + 1}`} />}
      </View>,
    );
  }
  return <View testID={testID ?? 'skeleton-product-grid'}>{rows}</View>;
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
