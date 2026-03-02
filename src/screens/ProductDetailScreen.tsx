import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, { SharedTransition, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme';
import { formatPrice, openARViewer, inchesToFeetDisplay } from '@/utils';
import { type FutonModel, type Fabric } from '@/hooks/useFutonModels';
import { WishlistButton } from '@/components/WishlistButton';
import { useFutonModels } from '@/hooks/useFutonModels';
import { useProduct } from '@/hooks/useProduct';
import { ReviewCard } from '@/components/ReviewCard';
import { ReviewSummary } from '@/components/ReviewSummary';
import { ReviewForm } from '@/components/ReviewForm';
import { useReviews } from '@/hooks/useReviews';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GALLERY_HEIGHT = 300;

const SPRING_CONFIG = { damping: 18, stiffness: 160 };
const heroTransition = SharedTransition.custom((values) => {
  'worklet';
  return {
    originX: withSpring(values.targetOriginX, SPRING_CONFIG),
    originY: withSpring(values.targetOriginY, SPRING_CONFIG),
    width: withSpring(values.targetWidth, SPRING_CONFIG),
    height: withSpring(values.targetHeight, SPRING_CONFIG),
  };
});

const GALLERY_VIEWS = ['Front View', 'Side View', 'Flat Position', 'Detail'] as const;

interface Props {
  productId?: string;
  slug?: string;
  route?: { params?: { slug?: string } };
  onAddToCart?: (model: FutonModel, fabric: Fabric, quantity: number) => void;
  onBack?: () => void;
  onOpenAR?: (modelId: string) => void;
  onViewAllReviews?: (productId: string) => void;
  testID?: string;
}

export function ProductDetailScreen({
  productId,
  slug,
  route,
  onAddToCart,
  onBack,
  onOpenAR,
  onViewAllReviews,
  testID,
}: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();

  const resolvedId = productId ?? slug ?? route?.params?.slug ?? '';
  const { models, getModel } = useFutonModels();
  const model = getModel(resolvedId) ?? models[0];
  const catalogProductId = resolvedId ? `prod-${resolvedId}` : '';
  const { product: catalogProduct } = useProduct(catalogProductId);
  const [selectedFabric, setSelectedFabric] = useState<Fabric>(model.fabrics[0]);
  const [quantity, setQuantity] = useState(1);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const galleryRef = useRef<FlatList>(null);
  const navigation = useNavigation<any>();
  const {
    reviews,
    summary: reviewSummary,
    sort: reviewSort,
    setSort: setReviewSort,
    isSubmitting: isReviewSubmitting,
    submitReview,
    showForm: showReviewForm,
    setShowForm: setShowReviewForm,
  } = useReviews(model.id);
  const previewReviews = reviews.slice(0, 3);

  const totalPrice = model.basePrice + selectedFabric.price;

  const handleSelectFabric = useCallback((fabric: Fabric) => {
    setSelectedFabric(fabric);
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  }, []);

  const handleAddToCart = useCallback(() => {
    onAddToCart?.(model, selectedFabric, quantity);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [model, selectedFabric, quantity, onAddToCart]);

  const handleIncrement = useCallback(() => {
    setQuantity((prev) => Math.min(10, prev + 1));
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  }, []);

  const handleDecrement = useCallback(() => {
    setQuantity((prev) => Math.max(1, prev - 1));
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  }, []);

  const handleOpenAR = useCallback(() => {
    onOpenAR?.(model.id);
    openARViewer(model.id, model.name, {
      onWebModelView: (params) => {
        navigation.navigate('ARWeb', {
          glbUrl: params.glbUrl,
          usdzUrl: params.usdzUrl,
          title: params.modelName,
          productId: catalogProduct?.id ?? `prod-${model.id}`,
        });
      },
    });
  }, [model.id, model.name, catalogProduct?.id, onOpenAR, navigation]);

  const onGalleryScroll = useCallback((e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveGalleryIndex(index);
  }, []);

  const renderGalleryItem = useCallback(
    ({ item, index }: { item: (typeof GALLERY_VIEWS)[number]; index: number }) => (
      <View
        style={[styles.gallerySlide, { width: SCREEN_WIDTH, backgroundColor: colors.sandLight }]}
        testID={`gallery-slide-${index}`}
      >
        <FutonPlaceholder model={model} fabric={selectedFabric} viewLabel={item} index={index} />
        <View style={styles.galleryLabel}>
          <Text style={[styles.galleryLabelText, { color: colors.espressoLight }]}>{item}</Text>
        </View>
      </View>
    ),
    [model, selectedFabric, colors],
  );

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'product-detail-screen'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        {onBack && (
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.white }]}
            onPress={onBack}
            testID="detail-back-button"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={[styles.backButtonText, { color: colors.espresso }]}>{'‹'}</Text>
          </TouchableOpacity>
        )}

        {/* Wishlist button */}
        {catalogProduct && (
          <View style={styles.wishlistButtonContainer}>
            <WishlistButton product={catalogProduct} size="lg" testID="detail-wishlist-button" />
          </View>
        )}

        {/* Image Gallery — shared element transition from ProductCard */}
        <Animated.View
          sharedTransitionTag={`product-image-${resolvedId}`}
          sharedTransitionStyle={heroTransition}
          style={styles.galleryContainer}
        >
          <FlatList
            ref={galleryRef}
            data={[...GALLERY_VIEWS]}
            renderItem={renderGalleryItem}
            keyExtractor={(_, i) => `gallery-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onGalleryScroll}
            scrollEventThrottle={16}
            testID="gallery-list"
          />

          {/* Pagination dots */}
          <View style={styles.paginationContainer} testID="gallery-pagination">
            {GALLERY_VIEWS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.paginationDot,
                  {
                    backgroundColor: i === activeGalleryIndex ? colors.espresso : colors.sandDark,
                  },
                ]}
                testID={`gallery-dot-${i}`}
              />
            ))}
          </View>
        </Animated.View>

        {/* Product Info */}
        <View style={[styles.infoSection, { paddingHorizontal: spacing.lg }]}>
          <Text
            style={[styles.productName, { color: colors.espresso }]}
            testID="product-name"
            accessibilityRole="header"
          >
            {model.name}
          </Text>
          <Text
            style={[styles.productTagline, { color: colors.espressoLight }]}
            testID="product-tagline"
          >
            {model.tagline}
          </Text>

          {/* Price */}
          <View style={styles.priceRow} testID="price-section">
            <Text style={[styles.totalPrice, { color: colors.espresso }]} testID="total-price">
              {formatPrice(totalPrice)}
            </Text>
            {selectedFabric.price > 0 && (
              <Text
                style={[styles.priceBreakdown, { color: colors.espressoLight }]}
                testID="price-breakdown"
              >
                {formatPrice(model.basePrice)} + {formatPrice(selectedFabric.price)} fabric
              </Text>
            )}
          </View>
        </View>

        {/* Fabric Selector */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.espresso }]}>Fabric</Text>
          <Text
            style={[styles.fabricName, { color: colors.espressoLight }]}
            testID="selected-fabric-name"
          >
            {selectedFabric.name}
            {selectedFabric.price > 0 && ` (+${formatPrice(selectedFabric.price)})`}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.fabricRow}
            testID="fabric-selector"
          >
            {model.fabrics.map((fabric) => (
              <TouchableOpacity
                key={fabric.id}
                style={[
                  styles.fabricSwatch,
                  { backgroundColor: fabric.color },
                  fabric.id === selectedFabric.id && styles.fabricSwatchSelected,
                  fabric.id === selectedFabric.id && {
                    borderColor: colors.espresso,
                  },
                ]}
                onPress={() => handleSelectFabric(fabric)}
                testID={`fabric-swatch-${fabric.id}`}
                accessibilityLabel={`${fabric.name}${fabric.price > 0 ? `, add ${formatPrice(fabric.price)}` : ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: fabric.id === selectedFabric.id }}
              >
                {fabric.id === selectedFabric.id && <Text style={styles.fabricCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Dimensions */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.espresso }]}>Dimensions</Text>
          <View
            style={[
              styles.dimensionsCard,
              { backgroundColor: colors.sandLight, borderRadius: borderRadius.card },
              shadows.card,
            ]}
            testID="dimensions-card"
          >
            <DimensionItem
              label="Width"
              value={inchesToFeetDisplay(model.dimensions.width)}
              inches={model.dimensions.width}
              color={colors.espresso}
              mutedColor={colors.espressoLight}
            />
            <View style={[styles.dimDivider, { backgroundColor: colors.sandDark }]} />
            <DimensionItem
              label="Depth"
              value={inchesToFeetDisplay(model.dimensions.depth)}
              inches={model.dimensions.depth}
              color={colors.espresso}
              mutedColor={colors.espressoLight}
            />
            <View style={[styles.dimDivider, { backgroundColor: colors.sandDark }]} />
            <DimensionItem
              label="Height"
              value={inchesToFeetDisplay(model.dimensions.height)}
              inches={model.dimensions.height}
              color={colors.espresso}
              mutedColor={colors.espressoLight}
            />
            <View style={[styles.dimDivider, { backgroundColor: colors.sandDark }]} />
            <DimensionItem
              label="Seat"
              value={inchesToFeetDisplay(model.dimensions.seatHeight)}
              inches={model.dimensions.seatHeight}
              color={colors.espresso}
              mutedColor={colors.espressoLight}
            />
          </View>
        </View>

        {/* Reviews Section */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]} testID="reviews-section">
          <Text style={[styles.sectionTitle, { color: colors.espresso }]}>Reviews</Text>
          <ReviewSummary summary={reviewSummary} testID="review-summary" />

          {/* Sort pills */}
          <View style={styles.sortRow} testID="review-sort-options">
            {(['helpful', 'recent', 'highest', 'lowest'] as const).map((sort) => (
              <TouchableOpacity
                key={sort}
                style={[
                  styles.sortPill,
                  {
                    backgroundColor: reviewSort === sort ? colors.espresso : colors.sandLight,
                    borderRadius: borderRadius.pill,
                  },
                ]}
                onPress={() => setReviewSort(sort)}
                testID={`sort-${sort}`}
                accessibilityRole="button"
                accessibilityState={{ selected: reviewSort === sort }}
              >
                <Text
                  style={[
                    styles.sortPillText,
                    { color: reviewSort === sort ? colors.white : colors.espressoLight },
                  ]}
                >
                  {sort === 'helpful'
                    ? 'Most Helpful'
                    : sort === 'recent'
                      ? 'Most Recent'
                      : sort === 'highest'
                        ? 'Highest'
                        : 'Lowest'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Preview reviews */}
          {previewReviews.map((review) => (
            <ReviewCard key={review.id} review={review} testID={`review-card-${review.id}`} />
          ))}

          {/* View all reviews link */}
          {reviews.length > 3 && (
            <TouchableOpacity
              style={[
                styles.viewAllButton,
                { borderColor: colors.espresso, borderRadius: borderRadius.button },
              ]}
              onPress={() => onViewAllReviews?.(model.id)}
              testID="view-all-reviews"
              accessibilityRole="button"
            >
              <Text style={[styles.viewAllText, { color: colors.espresso }]}>
                View All {reviewSummary.totalReviews} Reviews
              </Text>
            </TouchableOpacity>
          )}

          {/* Write a Review */}
          {!showReviewForm ? (
            <TouchableOpacity
              style={[
                styles.writeReviewButton,
                {
                  backgroundColor: colors.sunsetCoral,
                  borderRadius: borderRadius.button,
                },
              ]}
              onPress={() => setShowReviewForm(true)}
              testID="write-review-button"
              accessibilityLabel="Write a review"
              accessibilityRole="button"
            >
              <Text style={styles.writeReviewText}>Write a Review</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.reviewFormContainer} testID="review-form-container">
              <View style={styles.reviewFormHeader}>
                <Text style={[styles.sectionTitle, { color: colors.espresso }]}>
                  Write Your Review
                </Text>
                <TouchableOpacity
                  onPress={() => setShowReviewForm(false)}
                  testID="cancel-review"
                  accessibilityLabel="Cancel review"
                >
                  <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <ReviewForm
                onSubmit={submitReview}
                isSubmitting={isReviewSubmitting}
                testID="review-form"
              />
            </View>
          )}
        </View>

        {/* Try in AR CTA */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <TouchableOpacity
            style={[
              styles.arCta,
              {
                backgroundColor: colors.mountainBlue,
                borderRadius: borderRadius.button,
              },
            ]}
            onPress={handleOpenAR}
            testID="detail-ar-button"
            accessibilityLabel={`Try ${model.name} in your room with AR camera`}
            accessibilityRole="button"
          >
            <Text style={styles.arCtaIcon}>📷</Text>
            <Text style={styles.arCtaText}>Try in Your Room</Text>
          </TouchableOpacity>
        </View>

        {/* Quantity + Add to Cart */}
        <View style={[styles.section, styles.cartSection, { paddingHorizontal: spacing.lg }]}>
          {/* Quantity selector */}
          <View style={styles.quantityRow} testID="quantity-selector">
            <Text style={[styles.quantityLabel, { color: colors.espresso }]}>Qty</Text>
            <TouchableOpacity
              style={[
                styles.quantityButton,
                {
                  backgroundColor: colors.sandLight,
                  borderRadius: borderRadius.sm,
                },
                quantity <= 1 && styles.quantityButtonDisabled,
              ]}
              onPress={handleDecrement}
              disabled={quantity <= 1}
              testID="quantity-decrement"
              accessibilityLabel="Decrease quantity"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.quantityButtonText,
                  { color: quantity <= 1 ? colors.muted : colors.espresso },
                ]}
              >
                −
              </Text>
            </TouchableOpacity>
            <Text
              style={[styles.quantityValue, { color: colors.espresso }]}
              testID="quantity-value"
              accessibilityLabel={`Quantity: ${quantity}`}
            >
              {quantity}
            </Text>
            <TouchableOpacity
              style={[
                styles.quantityButton,
                {
                  backgroundColor: colors.sandLight,
                  borderRadius: borderRadius.sm,
                },
                quantity >= 10 && styles.quantityButtonDisabled,
              ]}
              onPress={handleIncrement}
              disabled={quantity >= 10}
              testID="quantity-increment"
              accessibilityLabel="Increase quantity"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.quantityButtonText,
                  { color: quantity >= 10 ? colors.muted : colors.espresso },
                ]}
              >
                +
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add to Cart */}
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              {
                backgroundColor: colors.sunsetCoral,
                borderRadius: borderRadius.button,
              },
              shadows.button,
            ]}
            onPress={handleAddToCart}
            testID="add-to-cart-button"
            accessibilityLabel={`Add ${quantity} ${model.name} to cart for ${formatPrice(totalPrice * quantity)}`}
            accessibilityRole="button"
          >
            <Text style={styles.addToCartText}>
              Add to Cart — {formatPrice(totalPrice * quantity)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

/** Simplified futon shape for gallery placeholders */
function FutonPlaceholder({
  model,
  fabric,
  viewLabel,
  index,
}: {
  model: FutonModel;
  fabric: Fabric;
  viewLabel: string;
  index: number;
}) {
  const aspectRatio = model.dimensions.width / model.dimensions.depth;
  const baseWidth = 180;
  const baseDepth = baseWidth / aspectRatio;
  // Rotate/scale slightly per view for visual variety
  const transforms = [
    [{ rotateX: '10deg' }, { rotateY: '0deg' }],
    [{ rotateX: '5deg' }, { rotateY: '25deg' }],
    [{ rotateX: '40deg' }, { rotateY: '0deg' }],
    [{ rotateX: '8deg' }, { rotateY: '-15deg' }],
  ];
  const viewTransforms = transforms[index] ?? transforms[0];

  const darkerFabric = darkenColor(fabric.color, 0.15);

  return (
    <View
      style={[
        styles.placeholderFuton,
        {
          width: baseWidth,
          height: baseDepth + 20,
          transform: [{ perspective: 600 }, ...viewTransforms],
        },
      ]}
      testID={`futon-placeholder-${index}`}
    >
      {/* Back cushion */}
      <View
        style={{
          width: baseWidth - 20,
          height: baseDepth * 0.4,
          backgroundColor: darkerFabric,
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          alignSelf: 'center',
        }}
      />
      {/* Seat cushion */}
      <View
        style={{
          width: baseWidth - 20,
          height: baseDepth * 0.55,
          backgroundColor: fabric.color,
          borderRadius: 4,
          marginTop: 2,
          alignSelf: 'center',
        }}
      />
      {/* Arms */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 10,
          height: baseDepth * 0.9,
          backgroundColor: darkerFabric,
          borderRadius: 3,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 10,
          height: baseDepth * 0.9,
          backgroundColor: darkerFabric,
          borderRadius: 3,
        }}
      />
    </View>
  );
}

function DimensionItem({
  label,
  value,
  inches,
  color,
  mutedColor,
}: {
  label: string;
  value: string;
  inches: number;
  color: string;
  mutedColor: string;
}) {
  return (
    <View style={styles.dimItem} testID={`dimension-${label.toLowerCase()}`}>
      <Text style={[styles.dimValue, { color }]}>{value}</Text>
      <Text style={[styles.dimLabel, { color: mutedColor }]}>{label}</Text>
      <Text style={[styles.dimInches, { color: mutedColor }]}>{inches}"</Text>
    </View>
  );
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount));
  const b = Math.max(0, (num & 0xff) * (1 - amount));
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    position: 'absolute',
    top: 52,
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: '300',
    marginTop: -2,
  },
  wishlistButtonContainer: {
    position: 'absolute',
    top: 52,
    right: 16,
    zIndex: 10,
  },
  galleryContainer: {
    overflow: 'hidden',
  },
  gallerySlide: {
    height: GALLERY_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryLabel: {
    position: 'absolute',
    bottom: 12,
    right: 16,
  },
  galleryLabelText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoSection: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  productName: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  productTagline: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 12,
    gap: 10,
  },
  totalPrice: {
    fontSize: 26,
    fontWeight: '700',
  },
  priceBreakdown: {
    fontSize: 13,
  },
  section: {
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  fabricName: {
    fontSize: 14,
    marginBottom: 10,
  },
  fabricRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
  fabricSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fabricSwatchSelected: {
    borderWidth: 3,
  },
  fabricCheck: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dimensionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  dimItem: {
    alignItems: 'center',
    flex: 1,
  },
  dimDivider: {
    width: 1,
    height: 40,
  },
  dimValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  dimLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dimInches: {
    fontSize: 11,
    marginTop: 1,
  },
  arCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  arCtaIcon: {
    fontSize: 18,
  },
  arCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  cartSection: {
    paddingBottom: 16,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  quantityButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
  },
  addToCartButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  placeholderFuton: {
    position: 'relative',
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  sortPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewAllButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  writeReviewButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  writeReviewText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  reviewFormContainer: {
    marginTop: 16,
  },
  reviewFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
