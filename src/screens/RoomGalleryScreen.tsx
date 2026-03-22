/**
 * @module RoomGalleryScreen
 *
 * Shoppable customer room gallery. Displays a grid of room photos sourced
 * from the Wix Data `roomGallery` collection. Tapping a room card navigates
 * to the ProductDetailScreen for the first associated product.
 *
 * States handled: loading skeleton, empty gallery, API error with retry,
 * and the populated grid.
 */
import React, { useCallback } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme';
import { useRoomGallery, type RoomGalleryItem } from '@/hooks/useRoomGallery';
import { MountainSkyline } from '@/components/MountainSkyline';
import { SkeletonRoomGrid } from '@/components/SkeletonRoomCard';

interface Props {
  /** Called when a room card is tapped with the first productId of that room. */
  onProductPress?: (productId: string) => void;
  /** Called when the "Share Your Room!" upload CTA is pressed. */
  onSharePress?: () => void;
  testID?: string;
}

const NUM_COLUMNS = 2;

function RoomCard({
  item,
  onProductPress,
}: {
  item: RoomGalleryItem;
  onProductPress?: (productId: string) => void;
}) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  const handlePress = useCallback(() => {
    if (item.productIds.length > 0) {
      onProductPress?.(item.productIds[0]);
    }
  }, [item.productIds, onProductPress]);

  return (
    <TouchableOpacity
      style={[styles.card, { borderRadius: borderRadius.card, margin: spacing.xs }]}
      onPress={handlePress}
      testID={`room-card-${item.roomId}`}
      accessibilityLabel={`${item.roomStyle} room, ${item.productIds.length} ${item.productIds.length === 1 ? 'product' : 'products'}`}
      accessibilityRole="button"
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.image}
        resizeMode="cover"
        testID={`room-image-${item.roomId}`}
      />
      <View
        style={[
          styles.overlay,
          { backgroundColor: colors.espresso + 'CC', borderRadius: borderRadius.card },
        ]}
      >
        <Text
          style={[
            styles.styleLabel,
            { color: colors.sandBase, fontFamily: typography.bodyFamilyBold },
          ]}
          testID={`room-style-${item.roomId}`}
          numberOfLines={1}
        >
          {item.roomStyle}
        </Text>
        <Text
          style={[
            styles.productCount,
            { color: colors.sandLight, fontFamily: typography.bodyFamily },
          ]}
          testID={`room-product-count-${item.roomId}`}
        >
          {item.productIds.length} {item.productIds.length === 1 ? 'product' : 'products'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/** Shoppable customer room photo gallery with error/empty/loading states. */
export function RoomGalleryScreen({ onProductPress, onSharePress, testID }: Props) {
  const { colors, spacing, typography } = useTheme();
  const { rooms, isLoading, error, refresh, isPlaceholder } = useRoomGallery();

  const renderItem = useCallback(
    ({ item }: { item: RoomGalleryItem }) => (
      <RoomCard item={item} onProductPress={onProductPress} />
    ),
    [onProductPress],
  );

  const keyExtractor = useCallback((item: RoomGalleryItem) => item.roomId, []);

  if (isLoading) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'room-gallery-screen'}
      >
        <SkeletonRoomGrid count={6} />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'room-gallery-screen'}
      >
        <View testID="room-gallery-error-illustration" style={styles.illustrationContainer}>
          <MountainSkyline variant="sunset" height={100} testID="room-gallery-error-skyline" />
        </View>
        <Text
          style={[
            styles.errorTitle,
            { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
          ]}
          testID="room-gallery-error"
        >
          Couldn't load the gallery
        </Text>
        <Text
          style={[
            styles.errorText,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
        >
          Check your connection and try again.
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.sunsetCoral }]}
          onPress={refresh}
          testID="room-gallery-retry"
          accessibilityRole="button"
        >
          <Text style={[styles.retryText, { fontFamily: typography.bodyFamilyBold }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (rooms.length === 0) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'room-gallery-screen'}
      >
        <Text
          style={[
            styles.emptyText,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
          testID="room-gallery-empty"
        >
          No room photos yet. Check back soon!
        </Text>
      </View>
    );
  }

  const shareCTA = (
    <TouchableOpacity
      style={[styles.shareCTA, { backgroundColor: colors.sunsetCoral }]}
      onPress={onSharePress}
      testID="room-gallery-share-cta"
      accessibilityRole="button"
      accessibilityLabel="Share a photo of your Carolina Futons room"
    >
      <Text style={[styles.shareCTAText, { fontFamily: typography.bodyFamilyBold }]}>
        Share Your Room!
      </Text>
    </TouchableOpacity>
  );

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'room-gallery-screen'}
    >
      <Text
        style={[
          styles.header,
          {
            color: colors.espresso,
            paddingHorizontal: spacing.lg,
            fontFamily: typography.headingFamily,
          },
        ]}
        accessibilityRole="header"
        testID="room-gallery-header"
      >
        Customer Rooms
      </Text>

      {isPlaceholder && (
        <Text
          style={[
            styles.placeholderBanner,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
          testID="room-gallery-placeholder-banner"
        >
          Be the first to share your room!
        </Text>
      )}

      <FlatList
        data={rooms}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.gridContent}
        testID="room-gallery-grid"
        showsVerticalScrollIndicator={false}
        windowSize={5}
        maxToRenderPerBatch={8}
        removeClippedSubviews
        initialNumToRender={6}
        ListFooterComponent={shareCTA}
      />
    </View>
  );
}

const CARD_HEIGHT = 180;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    paddingTop: 60,
    paddingBottom: 16,
  },
  gridContent: {
    paddingHorizontal: 4,
    paddingBottom: 32,
  },
  card: {
    flex: 1,
    height: CARD_HEIGHT,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  styleLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  productCount: {
    fontSize: 11,
    marginTop: 2,
  },
  illustrationContainer: {
    marginBottom: 16,
    width: '80%',
    overflow: 'hidden',
    borderRadius: 12,
  },
  errorTitle: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginHorizontal: 32,
  },
  placeholderBanner: {
    fontSize: 13,
    textAlign: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  shareCTA: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 32,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareCTAText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
