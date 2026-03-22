/**
 * @module SkeletonCollectionCard
 *
 * Skeleton loading placeholder matching CollectionCard dimensions:
 * large hero image with title, subtitle, and mood tags below.
 * Used while editorial collections are loading.
 *
 * cm-thv: CollectionsScreen skeleton / error / empty states
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Shimmer, ShimmerLines } from './Shimmer';

const HERO_HEIGHT = 220;

/** Skeleton placeholder matching a single featured CollectionCard. */
export const SkeletonCollectionCard = memo(function SkeletonCollectionCard({
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
      testID={testID ?? 'skeleton-collection-card'}
      accessibilityLabel="Loading collection"
    >
      {/* Hero image placeholder */}
      <Shimmer
        height={HERO_HEIGHT}
        borderRadius={0}
        style={{
          width: '100%',
          borderTopLeftRadius: borderRadius.card,
          borderTopRightRadius: borderRadius.card,
        }}
      />

      {/* Info area */}
      <View style={[styles.info, { padding: spacing.md }]}>
        {/* Title */}
        <ShimmerLines lines={1} lineHeight={18} gap={0} lastLineWidth="80%" />
        {/* Subtitle */}
        <Shimmer width="60%" height={13} style={{ marginTop: 6 }} />
        {/* Mood tags */}
        <View style={styles.tagsRow}>
          <Shimmer width={60} height={22} borderRadius={11} />
          <Shimmer width={50} height={22} borderRadius={11} />
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
