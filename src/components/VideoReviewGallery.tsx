/**
 * @module VideoReviewGallery
 *
 * Horizontal thumbnail strip of video reviews for the Product Detail Page.
 * Tap a thumbnail to open a fullscreen video player modal.
 *
 * Bead: cm-vid / deacon-2c0d
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme } from '@/theme';
import { useVideoReviews, type UseVideoReviewsResult } from '@/hooks/useVideoReviews';
import { type VideoReview } from '@/data/videoReviews';

interface Props {
  productId: string;
}

/** Formats seconds as m:ss (e.g. 62 → "1:02"). */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ── Thumbnail tile ────────────────────────────────────────────────────────────

interface TileProps {
  video: VideoReview;
  onPress: (video: VideoReview) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  borderRadius: ReturnType<typeof useTheme>['borderRadius'];
}

function VideoThumbnail({ video, onPress, colors, spacing, borderRadius }: TileProps) {
  return (
    <TouchableOpacity
      testID="video-review-thumbnail"
      onPress={() => onPress(video)}
      style={[styles.tile, { borderRadius: borderRadius.md, marginRight: spacing.sm }]}
      accessibilityLabel={`Video review by ${video.authorName}: ${video.title}. Duration ${formatDuration(video.duration)}.`}
      accessibilityRole="button"
    >
      <Image
        source={{ uri: video.thumbnailUrl }}
        style={[styles.tileImage, { borderRadius: borderRadius.md }]}
        resizeMode="cover"
      />
      <View style={[styles.durationBadge, { backgroundColor: colors.espresso }]}>
        <Text style={[styles.durationText, { color: colors.white }]}>
          {formatDuration(video.duration)}
        </Text>
      </View>
      <View style={[styles.tileInfo, { backgroundColor: colors.sandLight }]}>
        <Text style={[styles.tileTitle, { color: colors.espresso }]} numberOfLines={1}>
          {video.title}
        </Text>
        <Text style={[styles.tileAuthor, { color: colors.espressoLight }]} numberOfLines={1}>
          {video.authorName}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Fullscreen player ─────────────────────────────────────────────────────────

interface PlayerProps {
  video: VideoReview;
  onClose: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
}

function FullscreenPlayer({ video, onClose, colors, spacing }: PlayerProps) {
  const player = useVideoPlayer(video.videoUrl, (p) => {
    p.play();
  });

  return (
    <SafeAreaView
      testID="video-review-fullscreen"
      style={[styles.fullscreen, { backgroundColor: colors.espresso }]}
    >
      <VideoView
        testID="video-review-player"
        player={player}
        style={styles.playerView}
        contentFit="contain"
        nativeControls
      />
      <View style={[styles.playerMeta, { padding: spacing.md }]}>
        <Text
          testID="video-review-fullscreen-title"
          style={[styles.playerTitle, { color: colors.white }]}
        >
          {video.title}
        </Text>
        <Text
          testID="video-review-fullscreen-author"
          style={[styles.playerAuthor, { color: colors.sandLight }]}
        >
          {video.authorName}
        </Text>
      </View>
      <TouchableOpacity
        testID="video-review-fullscreen-close"
        onPress={onClose}
        style={[styles.closeButton, { backgroundColor: colors.espressoLight }]}
        accessibilityLabel="Close video"
        accessibilityRole="button"
      >
        <Text style={[styles.closeText, { color: colors.white }]}>✕</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function VideoReviewGallery({ productId }: Props) {
  const { colors, spacing, borderRadius } = useTheme();
  const { videos, isLoading, error }: UseVideoReviewsResult = useVideoReviews(productId);
  const [selectedVideo, setSelectedVideo] = useState<VideoReview | null>(null);

  const handleThumbnailPress = useCallback((video: VideoReview) => {
    setSelectedVideo(video);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedVideo(null);
  }, []);

  return (
    <View testID="video-review-gallery" style={styles.container}>
      {isLoading && (
        <View testID="video-review-skeleton" style={styles.skeleton}>
          <ActivityIndicator color={colors.espresso} />
        </View>
      )}

      {!isLoading && error && (
        <View testID="video-review-error" style={styles.centerState}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {!isLoading && !error && videos.length === 0 && (
        <View testID="video-review-empty" style={styles.centerState}>
          <Text style={[styles.emptyText, { color: colors.espressoLight }]}>
            No video reviews yet
          </Text>
        </View>
      )}

      {!isLoading && !error && videos.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={videos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.sm }}
          renderItem={({ item }) => (
            <VideoThumbnail
              video={item}
              onPress={handleThumbnailPress}
              colors={colors}
              spacing={spacing}
              borderRadius={borderRadius}
            />
          )}
        />
      )}

      {selectedVideo && (
        <Modal visible animationType="slide" onRequestClose={handleClose}>
          <FullscreenPlayer
            video={selectedVideo}
            onClose={handleClose}
            colors={colors}
            spacing={spacing}
          />
        </Modal>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const TILE_WIDTH = 160;
const TILE_HEIGHT = 120;

const styles = StyleSheet.create({
  container: {
    minHeight: TILE_HEIGHT + 48,
  },
  skeleton: {
    height: TILE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerState: {
    height: TILE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  tile: {
    width: TILE_WIDTH,
    overflow: 'hidden',
  },
  tileImage: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    backgroundColor: '#E0D5C5',
  },
  durationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tileInfo: {
    padding: 6,
  },
  tileTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  tileAuthor: {
    fontSize: 11,
    marginTop: 2,
  },
  fullscreen: {
    flex: 1,
  },
  playerView: {
    flex: 1,
  },
  playerMeta: {},
  playerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  playerAuthor: {
    fontSize: 14,
    marginTop: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
