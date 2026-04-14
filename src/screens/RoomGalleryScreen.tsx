/**
 * @module RoomGalleryScreen
 *
 * Shoppable customer room gallery. Displays a grid of approved UGC room photos
 * sourced from the Wix Data `RealRoomPhotos` collection. Each room card shows
 * member attribution, and hotspot buttons that link to specific products
 * ('shop this room').
 *
 * States handled: loading skeleton, empty gallery, API error with retry,
 * and the populated grid.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import { useRoomGallery, type RoomGalleryItem } from '@/hooks/useRoomGallery';
import { MountainSkyline } from '@/components/MountainSkyline';
import { SkeletonRoomGrid } from '@/components/SkeletonRoomCard';
import { UGCPhotoSubmitModal } from '@/components/UGCPhotoSubmitModal';
import { RoomGalleryFilterBar } from '@/components/RoomGalleryFilterBar';
import { useRoomGalleryFilters } from '@/hooks/useRoomGalleryFilters';
import { PRODUCTS } from '@/data/products';

interface Props {
  /** Called when a room card or hotspot is tapped with the targeted productId. */
  onProductPress?: (productId: string) => void;
  /** Called when the "Share Your Room!" upload CTA is pressed. */
  onSharePress?: () => void;
  testID?: string;
}

const NUM_COLUMNS = 2;

/** Warm neutral blurhash used while room images load. */
const DEFAULT_ROOM_BLURHASH = 'LKO2:N%2Tw=w]~RBVZRi};RPxuwH';

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
      accessibilityLabel={`${item.memberName || item.roomStyle} from ${item.city}, ${item.state}`}
      accessibilityRole="button"
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
        placeholder={{ blurhash: DEFAULT_ROOM_BLURHASH }}
        testID={`room-image-${item.roomId}`}
        accessibilityLabel={item.altText || undefined}
      />

      {/* Product hotspot overlay buttons */}
      {item.tags.map((tag) => (
        <TouchableOpacity
          key={tag.productId}
          style={[
            styles.hotspot,
            {
              left: `${tag.x * 100}%` as any,
              top: `${tag.y * 100}%` as any,
            },
          ]}
          onPress={() => {
            onProductPress?.(tag.productId);
          }}
          testID={`hotspot-${item.roomId}-${tag.productId}`}
          accessibilityRole="button"
          accessibilityLabel={`Shop ${tag.productName}`}
        >
          <Text style={styles.hotspotIcon}>+</Text>
        </TouchableOpacity>
      ))}

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
            styles.memberName,
            { color: colors.sandLight, fontFamily: typography.bodyFamily },
          ]}
          testID={`room-member-${item.roomId}`}
          numberOfLines={1}
        >
          {item.memberName}
        </Text>
        <Text
          style={[styles.location, { color: colors.sandLight, fontFamily: typography.bodyFamily }]}
          testID={`room-location-${item.roomId}`}
          numberOfLines={1}
        >
          {item.city}, {item.state}
        </Text>
        <Text
          style={[
            styles.memberName,
            { color: colors.sandLight, fontFamily: typography.bodyFamily },
          ]}
          testID={`room-member-${item.roomId}`}
          numberOfLines={1}
        >
          {item.memberName}
        </Text>
        <Text
          style={[styles.location, { color: colors.sandLight, fontFamily: typography.bodyFamily }]}
          testID={`room-location-${item.roomId}`}
          numberOfLines={1}
        >
          {item.city}, {item.state}
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
      {item.featured && (
        <View
          style={styles.featuredBadge}
          testID={`featured-badge-${item.roomId}`}
          accessibilityLabel="Featured room"
        >
          <Text style={[styles.featuredBadgeText, { fontFamily: typography.bodyFamilyBold }]}>
            ★ Featured
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/** Shoppable customer room photo gallery with error/empty/loading states. */
export function RoomGalleryScreen({ onProductPress, onSharePress, testID }: Props) {
  const { colors, spacing, typography } = useTheme();
  const { rooms, isLoading, error, refresh, isPlaceholder } = useRoomGallery();
  const {
    filteredRooms,
    filters,
    setStyleFilter,
    setProductFilter,
    setFeaturedOnly,
    clearFilters,
    hasActiveFilters,
    isEmpty: isFilterEmpty,
  } = useRoomGalleryFilters(rooms);
  const [ugcModalVisible, setUgcModalVisible] = useState(false);

  const productOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { id: string; name: string }[] = [];
    for (const room of rooms) {
      for (const tag of room.tags) {
        if (!seen.has(tag.productId)) {
          seen.add(tag.productId);
          const product = PRODUCTS.find((p) => p.id === tag.productId || p.slug === tag.productId);
          options.push({ id: tag.productId, name: product?.name ?? tag.productName });
        }
      }
    }
    return options;
  }, [rooms]);

  const handleSharePress = useCallback(() => {
    setUgcModalVisible(true);
    onSharePress?.();
  }, [onSharePress]);

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
      onPress={handleSharePress}
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

      <RoomGalleryFilterBar
        filters={filters}
        setStyleFilter={setStyleFilter}
        setProductFilter={setProductFilter}
        clearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        productOptions={productOptions}
      />
      <TouchableOpacity
        style={[
          styles.featuredToggle,
          filters.featuredOnly && { backgroundColor: colors.sunsetCoral },
        ]}
        onPress={() => setFeaturedOnly(!filters.featuredOnly)}
        testID="filter-featured-toggle"
        accessibilityRole="button"
        accessibilityState={{ selected: filters.featuredOnly }}
        accessibilityLabel="Show featured rooms only"
      >
        <Text
          style={[
            styles.featuredToggleText,
            { fontFamily: typography.bodyFamilyBold },
            filters.featuredOnly && { color: '#FFFFFF' },
          ]}
        >
          ★ Featured Only
        </Text>
      </TouchableOpacity>

      {isFilterEmpty ? (
        <View
          style={[styles.centered, styles.filterEmptyContainer]}
          testID="room-gallery-filter-empty"
        >
          <Text
            style={[
              styles.emptyText,
              { color: colors.espressoLight, fontFamily: typography.bodyFamily },
            ]}
          >
            No rooms match the selected filters.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.sunsetCoral }]}
            onPress={clearFilters}
            testID="filter-empty-clear"
            accessibilityRole="button"
          >
            <Text style={[styles.retryText, { fontFamily: typography.bodyFamilyBold }]}>
              Clear Filters
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredRooms}
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
      )}
      <UGCPhotoSubmitModal
        visible={ugcModalVisible}
        productId=""
        onClose={() => setUgcModalVisible(false)}
      />
    </View>
  );
}

const CARD_HEIGHT = 200;

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
  hotspot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.5,
    borderColor: '#8B6F47',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -12,
    marginTop: -12,
  },
  hotspotIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B6F47',
    lineHeight: 16,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
  styleLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  memberName: {
    fontSize: 11,
    marginTop: 1,
  },
  location: {
    fontSize: 10,
    marginTop: 1,
    opacity: 0.85,
  },
  productCount: {
    fontSize: 10,
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
  filterEmptyContainer: {
    flex: 1,
    paddingTop: 60,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F5A623',
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  featuredToggle: {
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F5A623',
  },
  featuredToggleText: {
    color: '#F5A623',
    fontSize: 13,
  },
});
