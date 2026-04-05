/**
 * @module UGCGalleryStrip
 *
 * Horizontal scrolling gallery of UGC photos on the Product Detail Page — cm-ae8.
 *
 * Shows approved and featured photos for a given productId.
 * Each tile displays the photo, caption, vote count, and a featured badge
 * for status=featured photos. Tap the heart/like button to vote.
 */
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/theme';
import { useUGCPhotos, type UGCPhoto } from '@/hooks/useUGCPhotos';

interface Props {
  productId: string;
}

interface TileProps {
  photo: UGCPhoto;
  onVote: (id: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function PhotoTile({ photo, onVote, colors }: TileProps) {
  return (
    <View
      testID="ugc-photo-tile"
      style={styles.tile}
      accessibilityLabel={`User photo: ${photo.caption || photo.roomType}. ${photo.voteCount} votes.`}
      accessibilityRole="image"
    >
      <Image source={{ uri: photo.photoUrl }} style={styles.tileImage} resizeMode="cover" />

      {photo.status === 'featured' && (
        <View
          testID="ugc-featured-badge"
          style={[styles.featuredBadge, { backgroundColor: colors.espresso }]}
        >
          <Text style={[styles.featuredText, { color: colors.white }]}>Featured</Text>
        </View>
      )}

      {photo.caption ? (
        <Text style={[styles.caption, { color: colors.espresso }]} numberOfLines={2}>
          {photo.caption}
        </Text>
      ) : null}

      <TouchableOpacity
        testID={`ugc-vote-button-${photo.id}`}
        onPress={() => photo.id && onVote(photo.id)}
        style={styles.voteRow}
        accessibilityLabel={`Like this photo. ${photo.voteCount} likes.`}
        accessibilityRole="button"
      >
        <Text style={styles.heartIcon}>♥</Text>
        <Text style={[styles.voteCount, { color: colors.espresso }]}>{photo.voteCount}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function UGCGalleryStrip({ productId }: Props) {
  const { colors, spacing } = useTheme();
  const { photos, loading, fetchError, voteError, votePhoto } = useUGCPhotos(productId);

  if (loading) {
    return (
      <View testID="ugc-gallery-skeleton" style={styles.skeleton}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.skeletonTile, { backgroundColor: `${colors.espressoLight}20` }]}
          />
        ))}
      </View>
    );
  }

  if (fetchError) {
    return (
      <View testID="ugc-gallery-strip" style={styles.strip}>
        <Text style={[styles.errorText, { color: colors.error }]}>{fetchError}</Text>
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View testID="ugc-gallery-strip" style={styles.strip}>
        <View testID="ugc-empty-state" style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.espressoLight }]}>
            Be the first to share your setup!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View testID="ugc-gallery-strip" style={styles.strip}>
      {voteError ? (
        <Text style={[styles.voteErrorText, { color: colors.error }]}>{voteError}</Text>
      ) : null}
      <FlatList
        data={photos}
        keyExtractor={(item, idx) => item.id ?? String(idx)}
        renderItem={({ item }) => <PhotoTile photo={item} onVote={votePhoto} colors={colors} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.sm }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { marginVertical: 8 },
  tile: {
    width: 160,
    marginRight: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tileImage: { width: 160, height: 160 },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  featuredText: { fontSize: 11, fontWeight: '700' },
  caption: {
    fontSize: 12,
    marginTop: 6,
    marginHorizontal: 4,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  heartIcon: { fontSize: 14, color: '#e05c5c', marginRight: 4 },
  voteCount: { fontSize: 13, fontWeight: '600' },
  skeleton: { flexDirection: 'row', paddingHorizontal: 12, marginVertical: 8 },
  skeletonTile: { width: 160, height: 190, borderRadius: 10, marginRight: 12 },
  emptyState: { paddingHorizontal: 16, paddingVertical: 20 },
  emptyText: { fontSize: 14 },
  errorText: { fontSize: 14, paddingHorizontal: 16 },
  voteErrorText: { fontSize: 12, paddingHorizontal: 16, marginBottom: 6 },
});
