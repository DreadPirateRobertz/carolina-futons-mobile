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
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/theme';
import { useRoomGallery, type RoomGalleryItem } from '@/hooks/useRoomGallery';

interface Props {
  /** Called when a room card is tapped with the first productId of that room. */
  onProductPress?: (productId: string) => void;
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
export function RoomGalleryScreen({ onProductPress, testID }: Props) {
  const { colors, spacing, typography } = useTheme();
  const { rooms, isLoading, error, refresh } = useRoomGallery();

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
        <ActivityIndicator size="large" color={colors.sunsetCoral} testID="room-gallery-loading" />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'room-gallery-screen'}
      >
        <Text
          style={[
            styles.errorText,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
          testID="room-gallery-error"
        >
          Unable to load gallery. Check your connection.
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
  errorText: {
    fontSize: 15,
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
});
