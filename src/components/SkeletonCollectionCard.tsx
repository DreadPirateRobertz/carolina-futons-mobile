/**
 * @module SkeletonCollectionCard
 *
 * Skeleton loading placeholder matching CollectionCard's 'featured' variant:
 * full-bleed image with a gradient overlay, title, and subtitle shimmers.
 * Used while the EditorialCollections list is loading.
 *
 * cm-thv: CollectionsScreen error state + skeleton loader
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Shimmer } from './Shimmer';

const CARD_HEIGHT = 220;

/** Skeleton placeholder matching a single CollectionCard in 'featured' variant. */
export const SkeletonCollectionCard = memo(function SkeletonCollectionCard({
  testID,
}: {
  testID?: string;
}) {
  const { borderRadius, spacing } = useTheme();

  return (
    <View
      style={[styles.card, { borderRadius: borderRadius.card }]}
      testID={testID ?? 'skeleton-collection-card'}
      accessibilityLabel="Loading collection"
    >
      {/* Hero image shimmer */}
      <Shimmer width="100%" height={CARD_HEIGHT} borderRadius={borderRadius.card} />

      {/* Bottom overlay: mood tags + title + subtitle */}
      <View style={[styles.overlay, { padding: spacing.md }]}>
        {/* Mood tag */}
        <Shimmer width={60} height={12} borderRadius={4} style={{ marginBottom: spacing.xs }} />
        {/* Title */}
        <Shimmer width="70%" height={18} borderRadius={4} style={{ marginBottom: spacing.xs }} />
        {/* Subtitle */}
        <Shimmer width="50%" height={13} borderRadius={4} />
      </View>
    </View>
  );
});

/** Vertical list of skeleton collection cards matching CollectionsScreen layout. */
export function SkeletonCollectionList({ count = 3, testID }: { count?: number; testID?: string }) {
  const { spacing } = useTheme();

  return (
    <View testID={testID ?? 'skeleton-collection-list'}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            styles.cardWrapper,
            { paddingHorizontal: spacing.pagePadding, marginBottom: spacing.md },
          ]}
        >
          <SkeletonCollectionCard testID={`skeleton-collection-${i}`} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  cardWrapper: {},
});
