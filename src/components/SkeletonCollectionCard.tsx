import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { SkeletonBox, SkeletonText } from './Skeleton';

const HERO_HEIGHT = 220;

export const SkeletonCollectionCard = memo(function SkeletonCollectionCard({
  testID,
}: {
  testID?: string;
}) {
  const { colors, borderRadius, shadows, spacing } = useTheme();
  const id = testID ?? 'skeleton-collection-card';

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        { backgroundColor: colors.white, borderRadius: borderRadius.card },
      ]}
      testID={id}
      accessibilityLabel="Loading collection"
    >
      <SkeletonBox
        testID={`${id}-image`}
        height={HERO_HEIGHT}
        borderRadius={0}
        style={{
          width: '100%',
          borderTopLeftRadius: borderRadius.card,
          borderTopRightRadius: borderRadius.card,
        }}
      />

      <View style={[styles.info, { padding: spacing.md }]}>
        <SkeletonText testID={`${id}-title`} lines={1} lineHeight={18} />
        <SkeletonBox width="60%" height={13} borderRadius={4} style={{ marginTop: 6 }} />
        <View style={styles.tagsRow}>
          <SkeletonBox width={60} height={22} borderRadius={11} />
          <SkeletonBox width={50} height={22} borderRadius={11} />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    marginBottom: 12,
  },
  info: {
    gap: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
});
