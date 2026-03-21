/**
 * @module SkeletonRoomCard
 *
 * Skeleton loading placeholder matching RoomGalleryScreen's RoomCard:
 * full-bleed image with an overlay label and product count.
 * Used while the roomGallery collection is loading.
 *
 * cm-3l5: skeleton loading on all list views
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Shimmer } from './Shimmer';

const CARD_HEIGHT = 180;

/** Skeleton placeholder matching a single RoomCard. */
export const SkeletonRoomCard = memo(function SkeletonRoomCard({ testID }: { testID?: string }) {
  const { borderRadius, spacing } = useTheme();

  return (
    <View
      style={[styles.card, { borderRadius: borderRadius.card }]}
      testID={testID ?? 'skeleton-room-card'}
      accessibilityLabel="Loading room"
    >
      {/* Full-bleed image placeholder */}
      <Shimmer width="100%" height={CARD_HEIGHT} borderRadius={borderRadius.card} />

      {/* Overlay shimmer labels (absolute, bottom-left) */}
      <View style={[styles.overlay, { padding: spacing.sm }]}>
        {/* Room style label */}
        <Shimmer width={100} height={13} borderRadius={3} />
        {/* Product count */}
        <Shimmer width={60} height={11} borderRadius={3} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
});

/** Two-column grid of skeleton room cards matching RoomGalleryScreen layout. */
export function SkeletonRoomGrid({ count = 4 }: { count?: number }) {
  const { spacing } = useTheme();
  const rows: React.ReactElement[] = [];

  for (let i = 0; i < count; i += 2) {
    rows.push(
      <View key={i} style={[styles.row, { paddingHorizontal: spacing.xs }]}>
        <SkeletonRoomCard testID={`skeleton-room-${i}`} />
        {i + 1 < count && <SkeletonRoomCard testID={`skeleton-room-${i + 1}`} />}
      </View>,
    );
  }

  return (
    <View testID="skeleton-room-grid" style={styles.grid}>
      {rows}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {},
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  card: {
    flex: 1,
    height: CARD_HEIGHT,
    overflow: 'hidden',
    margin: 4,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
