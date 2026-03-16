/**
 * @module WixProductDetail
 *
 * Simplified product detail view for Wix-sourced products that don't have
 * a matching local FutonModel. Displays CDN gallery images, product name,
 * description, price, and a "Call for Price" CTA when price is 0.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ScrollView,
  Share,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import { MountainSkyline } from '@/components/MountainSkyline';
import { formatPrice } from '@/utils';
import { WishlistButton } from '@/components/WishlistButton';
import { SkeletonProductDetail } from '@/components/SkeletonProductDetail';
import { ImageGalleryModal } from '@/components/ImageGalleryModal';
import type { Product } from '@/data/products';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GALLERY_HEIGHT = 400;
const DEFAULT_BLURHASH = 'L5H2EC=PM+yV0g-mq.wG9c010J}I';

interface Props {
  product: Product;
  isLoading?: boolean;
  onBack?: () => void;
  testID?: string;
}

export function WixProductDetail({ product, isLoading, onBack, testID }: Props) {
  const { colors, spacing, typography } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const galleryRef = useRef<FlatList>(null);

  const images = product.images.length > 0 ? product.images : [{ uri: '', alt: product.name }];

  const onGalleryScroll = useCallback((e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  }, []);

  const handleShare = useCallback(async () => {
    const message = `Check out ${product.name} from Carolina Futons`;
    try {
      await Share.share(Platform.OS === 'ios' ? { message } : { message });
    } catch {
      // User cancelled
    }
  }, [product.name]);

  if (isLoading) {
    return <SkeletonProductDetail testID="product-detail-skeleton" />;
  }

  const hasPrice = product.price > 0;

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'wix-product-detail-screen'}
    >
      {/* Back button */}
      {onBack && (
        <View style={styles.floatingBackButton}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.white }]}
            onPress={onBack}
            testID="detail-back-button"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={[styles.backButtonText, { color: colors.espresso }]}>{'‹'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Share button */}
      <View style={styles.floatingShareButton}>
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: colors.white }]}
          onPress={handleShare}
          testID="detail-share-button"
          accessibilityLabel={`Share ${product.name}`}
          accessibilityRole="button"
        >
          <Text style={[styles.shareButtonText, { color: colors.espresso }]}>{'↗'}</Text>
        </TouchableOpacity>
      </View>

      {/* Wishlist button */}
      <View style={styles.floatingWishlistButton}>
        <WishlistButton product={product} size="lg" testID="detail-wishlist-button" />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Gallery */}
        <View style={styles.galleryContainer}>
          <FlatList
            ref={galleryRef}
            data={images}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setFullscreenVisible(true)}
                style={[
                  styles.gallerySlide,
                  { width: SCREEN_WIDTH, backgroundColor: colors.espresso },
                ]}
                testID={`gallery-slide-${index}`}
                accessibilityLabel={`${item.alt || product.name} image ${index + 1}. Tap to view fullscreen`}
                accessibilityRole="imagebutton"
              >
                {item.uri ? (
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.galleryImage}
                    contentFit="cover"
                    placeholder={{ blurhash: item.blurhash ?? DEFAULT_BLURHASH }}
                    transition={300}
                    testID={`gallery-image-${index}`}
                  />
                ) : (
                  <View style={[styles.galleryImage, styles.placeholderImage]}>
                    <Text style={{ color: colors.sandDark, fontSize: 16 }}>No image available</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            keyExtractor={(_, i) => `gallery-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onGalleryScroll}
            scrollEventThrottle={16}
            testID="gallery-list"
          />
        </View>

        {/* Mountain skyline */}
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <MountainSkyline variant="sunset" height={40} testID="product-detail-skyline" />
        </View>

        {/* Pagination dots */}
        {images.length > 1 && (
          <View style={styles.paginationContainer} testID="gallery-pagination">
            {images.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.paginationDot,
                  i === activeIndex && styles.paginationDotActive,
                  {
                    backgroundColor: i === activeIndex ? colors.espresso : colors.sandDark,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {/* Product Info */}
        <View style={[styles.infoSection, { paddingHorizontal: spacing.lg }]}>
          <Text
            style={[
              styles.productName,
              { color: colors.espresso, fontFamily: typography.headingFamily },
            ]}
            testID="product-name"
            accessibilityRole="header"
          >
            {product.name}
          </Text>

          {product.shortDescription ? (
            <Text
              style={[
                styles.productTagline,
                { color: colors.espressoLight, fontFamily: typography.bodyFamily },
              ]}
              testID="product-tagline"
            >
              {product.shortDescription}
            </Text>
          ) : null}

          {/* Price */}
          <View style={styles.priceRow} testID="price-section">
            {hasPrice ? (
              <>
                <Text
                  style={[
                    styles.totalPrice,
                    { color: colors.espresso, fontFamily: typography.headingFamily },
                  ]}
                  testID="total-price"
                >
                  {formatPrice(product.price)}
                </Text>
                {product.originalPrice && product.originalPrice > product.price && (
                  <Text
                    style={[styles.originalPrice, { color: colors.espressoLight }]}
                    testID="original-price"
                  >
                    {formatPrice(product.originalPrice)}
                  </Text>
                )}
              </>
            ) : (
              <Text
                style={[
                  styles.callForPrice,
                  { color: colors.sunsetCoral, fontFamily: typography.headingFamily },
                ]}
                testID="call-for-price"
              >
                Call for Price
              </Text>
            )}
          </View>
        </View>

        {/* Description */}
        {product.description ? (
          <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
              ]}
            >
              About This Product
            </Text>
            <Text
              style={[
                styles.description,
                { color: colors.espressoLight, fontFamily: typography.bodyFamily },
              ]}
              testID="product-description"
            >
              {product.description}
            </Text>
          </View>
        ) : null}

        {/* Stock status */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <View
            style={[
              styles.stockBadge,
              { backgroundColor: product.inStock ? '#E8F5E9' : '#FFEBEE' },
            ]}
          >
            <Text style={[styles.stockText, { color: product.inStock ? '#2E7D32' : '#C62828' }]}>
              {product.inStock ? 'In Stock' : 'Out of Stock'}
            </Text>
          </View>
        </View>

        {/* Fabric options (if available) */}
        {product.fabricOptions.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
              ]}
            >
              Available Fabrics
            </Text>
            <View style={styles.fabricList}>
              {product.fabricOptions.map((fabric) => (
                <View
                  key={fabric}
                  style={[styles.fabricChip, { backgroundColor: colors.sandDark + '30' }]}
                >
                  <Text style={[styles.fabricChipText, { color: colors.espresso }]}>{fabric}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Category badge */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg, paddingBottom: 100 }]}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.sandDark + '30' }]}>
            <Text style={[styles.categoryText, { color: colors.espressoLight }]}>
              {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Fullscreen gallery modal */}
      <ImageGalleryModal
        visible={fullscreenVisible}
        images={images
          .filter((img) => !!img.uri)
          .map((img, i) => ({ uri: img.uri, alt: img.alt, label: img.alt || `Image ${i + 1}` }))}
        initialIndex={activeIndex}
        onClose={() => {
          setFullscreenVisible(false);
          galleryRef.current?.scrollToIndex({ index: activeIndex, animated: false });
        }}
        renderImage={(image) => (
          <Image
            source={{ uri: image.uri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
            transition={300}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  floatingBackButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  backButtonText: {
    fontSize: 28,
    fontWeight: '600',
    marginTop: -2,
  },
  floatingShareButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  shareButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  floatingWishlistButton: {
    position: 'absolute',
    top: 50,
    right: 64,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  galleryContainer: {
    height: GALLERY_HEIGHT,
    overflow: 'hidden',
  },
  gallerySlide: {
    height: GALLERY_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    opacity: 0.4,
  },
  paginationDotActive: {
    width: 20,
    opacity: 1,
  },
  infoSection: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  productName: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  productTagline: {
    fontSize: 16,
    marginTop: 4,
    lineHeight: 22,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 12,
    gap: 8,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: 16,
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  callForPrice: {
    fontSize: 22,
    fontWeight: '600',
  },
  section: {
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  stockBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fabricList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fabricChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  fabricChipText: {
    fontSize: 14,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
  },
});
