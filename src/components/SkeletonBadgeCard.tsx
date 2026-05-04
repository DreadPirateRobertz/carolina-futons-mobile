/**
 * @module SkeletonBadgeCard
 *
 * Skeleton placeholder matching a single badge card in AchievementBadgesScreen's
 * 3-column grid. Circular shimmer for the icon + text shimmer for the label.
 *
 * cm-bue: migrate AchievementBadgesScreen from ActivityIndicator to skeleton
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { ShimmerCircle, Shimmer } from './Shimmer';

/** Single skeleton badge card — mirrors the TouchableOpacity card layout. */
export const SkeletonBadgeCard = memo(function SkeletonBadgeCard({
  testID,
}: {
  testID?: string;
}) {
  const { spacing, borderRadius } = useTheme();
  return (
    <View
      testID={testID}
      style={[styles.card, { borderRadius: borderRadius.card, padding: spacing.sm }]}
    >
      <ShimmerCircle size={48} />
      <Shimmer width="80%" height={10} borderRadius={4} style={{ marginTop: spacing.xs }} />
      <Shimmer width="55%" height={10} borderRadius={4} style={{ marginTop: 4 }} />
    </View>
  );
});

/** 3-column grid of 6 skeleton badge cards matching AchievementBadgesScreen layout. */
export function SkeletonBadgeGrid({ testID }: { testID?: string }) {
  return (
    <View testID={testID ?? 'achievements-skeleton'} style={styles.grid}>
      {Array.from({ length: 6 }, (_, i) => (
        <SkeletonBadgeCard key={i} testID={`badge-skeleton-${i}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  card: {
    width: '30%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
