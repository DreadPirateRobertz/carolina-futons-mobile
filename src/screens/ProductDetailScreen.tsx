/**
 * @module ProductDetailScreen
 *
 * Rich product page for a single futon model. Features a parallax image
 * gallery, fabric swatch selector, physical dimensions card, user reviews
 * with sort/filter, an AR (Augmented Reality) CTA, and add-to-cart with
 * quantity control. Analytics events fire for view, fabric select, AR open,
 * and add-to-cart to power conversion tracking.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { MountainSkyline } from '@/components/MountainSkyline';
import { formatPrice, openARViewer, inchesToFeetDisplay } from '@/utils';
import { type FutonModel, type Fabric } from '@/hooks/useFutonModels';
import { WishlistButton } from '@/components/WishlistButton';
import { useFutonModels } from '@/hooks/useFutonModels';
import { useProduct } from '@/hooks/useProduct';
import { ReviewCard } from '@/components/ReviewCard';
import { ReviewSummary } from '@/components/ReviewSummary';
import { ReviewForm } from '@/components/ReviewForm';
import { useReviews } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from '@/components/EmptyState';
import { ReviewsIllustration } from '@/components/illustrations/ReviewsIllustration';
import { events } from '@/services/analytics';
import { useRecommendations } from '@/hooks/useRecommendations';
import { RecommendationCarousel } from '@/components/RecommendationCarousel';
import { sharedTransitionTag } from '@/utils/sharedTransitionTag';
import { modelIdToProductId, productId as toProductId } from '@/utils';
import { PremiumBadge } from '@/components/PremiumBadge';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ImageGalleryModal } from '@/components/ImageGalleryModal';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { usePremium } from '@/hooks/usePremium';
import { useBackInStockSubscription } from '@/hooks/useBackInStockSubscription';
import { getStockStatus } from '@/hooks/useProducts';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GALLERY_HEIGHT = 400;
const PARALLAX_MULTIPLIER = 0.5;

const GALLERY_VIEWS = ['Front View', 'Side View', 'Flat Position', 'Detail'] as const;

interface Props {
  productId?: string;
  slug?: string;
  route?: { params?: { slug?: string } };
  onAddToCart?: (model: FutonModel, fabric: Fabric, quantity: number) => void;
  onBack?: () => void;
  onOpenAR?: (modelId: string) => void;
  onViewAllReviews?: (productId: string) => void;
  onRelatedProductPress?: (product: import('@/data/products').Product) => void;
  testID?: string;
}

/** Full product detail view with parallax gallery, fabric picker, reviews, and AR launch. */
export function ProductDetailScreen({
  productId,
  slug,
  route,
  onAddToCart,
  onBack,
  onOpenAR,
  onViewAllReviews,
  onRelatedProductPress,
  testID,
}: Props) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const { isPremium } = usePremium();

  const resolvedId = productId ?? slug ?? route?.params?.slug ?? '';
  const { models, getModel } = useFutonModels();
  const model = getModel(resolvedId) ?? models[0];
  const catalogProductId = resolvedId ? `prod-${resolvedId}` : '';
  const { product: catalogProduct } = useProduct(catalogProductId);
  const stockStatus = catalogProduct ? getStockStatus(catalogProduct) : 'in_stock';
  const isOutOfStock = stockStatus === 'out_of_stock';
  const isLowStock = stockStatus === 'low_stock';
  const backInStock = useBackInStockSubscription(catalogProductId);
  const [selectedFabric, setSelectedFabric] = useState<Fabric>(model.fabrics[0]);
  const [quantity, setQuantity] = useState(1);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [sizeGuideExpanded, setSizeGuideExpanded] = useState(false);
  const sizeGuideHeight = useSharedValue(0);

  const sizeGuideAnimStyle = useAnimatedStyle(() => ({
    height: sizeGuideHeight.value,
    overflow: 'hidden' as const,
    opacity: interpolate(sizeGuideHeight.value, [0, 50], [0, 1]),
    pointerEvents: sizeGuideHeight.value === 0 ? ('none' as const) : ('auto' as const),
  }));
  const galleryRef = useRef<FlatList>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated } = useAuth();
  const { similarItems, trackView } = useRecommendations();
  const {
    reviews,
    summary: reviewSummary,
    sort: reviewSort,
    setSort: setReviewSort,
    isSubmitting: isReviewSubmitting,
    submitReview,
    showForm: showReviewForm,
    setShowForm: setShowReviewForm,
    hasReviews,
  } = useReviews(model.id);
  const previewReviews = reviews.slice(0, 3);

  const totalPrice = model.basePrice + selectedFabric.price;

  const { addViewed } = useRecentlyViewed();

  // Track product view on mount
  useEffect(() => {
    events.viewProduct(model.id, 'product_detail');
    const productId = catalogProduct?.id ?? toProductId(`prod-${model.id}`);
    addViewed(productId);
    trackView(productId);
  }, [model.id, catalogProduct?.id, addViewed, trackView]);

  // --- Parallax scroll tracking ---
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Gallery parallax: moves at half scroll speed, zooms on overscroll
  const galleryParallaxStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, GALLERY_HEIGHT],
      [0, GALLERY_HEIGHT * PARALLAX_MULTIPLIER],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [-200, 0, GALLERY_HEIGHT],
      [1.5, 1, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  // Gallery overlay: fades in as user scrolls past gallery
  const galleryOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, GALLERY_HEIGHT * 0.7],
      [0, 0.6],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // Floating button background: becomes more opaque as gallery scrolls away
  const floatingButtonBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, GALLERY_HEIGHT * 0.4],
      [0.85, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // Bottom gradient strips to fake a gradient from gallery to content
  const gradientStrip1Style = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, GALLERY_HEIGHT * 0.3],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });
  const gradientStrip2Style = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, GALLERY_HEIGHT * 0.3],
      [0.7, 0],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // --- Callbacks ---
  const handleSelectFabric = useCallback(
    (fabric: Fabric) => {
      setSelectedFabric(fabric);
      events.selectFabric(model.id, fabric.id);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [model.id],
  );

  const handleAddToCart = useCallback(() => {
    onAddToCart?.(model, selectedFabric, quantity);
    events.addToCart(model.id, totalPrice, quantity);
  }, [model, selectedFabric, quantity, totalPrice, onAddToCart]);

  const handleIncrement = useCallback(() => {
    setQuantity((prev) => Math.min(10, prev + 1));
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleDecrement = useCallback(() => {
    setQuantity((prev) => Math.max(1, prev - 1));
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleOpenAR = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (!isPremium) {
      Alert.alert(
        'CF+ Feature',
        'AR Room Designer is a CF+ premium feature. Upgrade to place furniture in your room.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Learn More', onPress: () => navigation.navigate('Premium') },
        ],
      );
      return;
    }
    onOpenAR?.(model.id);
    events.openAR(model.id);
    openARViewer(model.id, model.name, {
      onWebModelView: (params) => {
        navigation.navigate('ARWeb', {
          glbUrl: params.glbUrl,
          usdzUrl: params.usdzUrl,
          title: params.modelName,
          productId: catalogProduct?.id ?? modelIdToProductId(model.id),
        });
      },
    });
  }, [model.id, model.name, catalogProduct?.id, onOpenAR, navigation, isPremium]);

  const onGalleryScroll = useCallback((e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveGalleryIndex(index);
  }, []);

  const handleOpenFullscreen = useCallback(() => {
    setFullscreenVisible(true);
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    setFullscreenVisible(false);
  }, []);

  const handleShare = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const deepLink = `carolinafutons://product/${model.id}`;
    const message = `Check out the ${model.name} from Carolina Futons — ${formatPrice(totalPrice)}`;
    try {
      await Share.share(
        Platform.OS === 'ios' ? { message, url: deepLink } : { message: `${message}\n${deepLink}` },
      );
      events.shareProduct(model.id);
    } catch {
      // User cancelled share sheet
    }
  }, [model.id, model.name, totalPrice]);

  const renderGalleryItem = useCallback(
    ({ item, index }: { item: (typeof GALLERY_VIEWS)[number]; index: number }) => (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleOpenFullscreen}
        style={[styles.gallerySlide, { width: SCREEN_WIDTH, backgroundColor: darkPalette.surface }]}
        testID={`gallery-slide-${index}`}
        accessibilityLabel={`${item} of ${model.name}. Tap to view fullscreen`}
        accessibilityRole="imagebutton"
      >
        <FutonPlaceholder model={model} fabric={selectedFabric} viewLabel={item} index={index} />
        <View style={styles.galleryLabel}>
          <Text style={[styles.galleryLabelText, { color: colors.espressoLight }]}>{item}</Text>
        </View>
      </TouchableOpacity>
    ),
    [model, selectedFabric, colors, handleOpenFullscreen],
  );

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'product-detail-screen'}
    >
      {/* Floating back button — above scroll */}
      {onBack && (
        <Animated.View style={[styles.floatingBackButton, floatingButtonBgStyle]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.white }]}
            onPress={onBack}
            testID="detail-back-button"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={[styles.backButtonText, { color: colors.espresso }]}>{'‹'}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Floating share button — above scroll */}
      <Animated.View style={[styles.floatingShareButton, floatingButtonBgStyle]}>
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: colors.white }]}
          onPress={handleShare}
          testID="detail-share-button"
          accessibilityLabel={`Share ${model.name}`}
          accessibilityRole="button"
        >
          <Text style={[styles.shareButtonText, { color: colors.espresso }]}>{'↗'}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Floating wishlist button — above scroll */}
      {catalogProduct && (
        <Animated.View style={[styles.floatingWishlistButton, floatingButtonBgStyle]}>
          <WishlistButton product={catalogProduct} size="lg" testID="detail-wishlist-button" />
        </Animated.View>
      )}

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* Parallax Image Gallery — shared element matches ProductCard image */}
        <Animated.View
          sharedTransitionTag={sharedTransitionTag(`product-image-${model.id}`)}
          style={[styles.galleryContainer, galleryParallaxStyle]}
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

          {/* Scroll overlay — dims gallery as user scrolls past */}
          <Animated.View
            style={[
              styles.galleryOverlay,
              { backgroundColor: colors.sandBase },
              galleryOverlayStyle,
            ]}
            pointerEvents="none"
          />

          {/* Bottom gradient transition — gallery to content */}
          <View style={styles.galleryGradientContainer} pointerEvents="none">
            <Animated.View
              style={[
                styles.gradientStrip,
                { backgroundColor: colors.sandBase, height: 24, opacity: 0.15 },
                gradientStrip2Style,
              ]}
            />
            <Animated.View
              style={[
                styles.gradientStrip,
                { backgroundColor: colors.sandBase, height: 20, opacity: 0.4 },
                gradientStrip1Style,
              ]}
            />
            <View
              style={[
                styles.gradientStrip,
                { backgroundColor: colors.sandBase, height: 16, opacity: 0.7 },
              ]}
            />
          </View>
        </Animated.View>

        {/* Mountain skyline transition (decorative) */}
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <MountainSkyline variant="sunset" height={40} testID="product-detail-skyline" />
        </View>

        {/* Pagination dots */}
        <View
          style={styles.paginationContainer}
          testID="gallery-pagination"
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={`Image ${activeGalleryIndex + 1} of ${GALLERY_VIEWS.length}`}
        >
          {GALLERY_VIEWS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.paginationDot,
                i === activeGalleryIndex && styles.paginationDotActive,
                {
                  backgroundColor: i === activeGalleryIndex ? colors.espresso : colors.sandDark,
                },
              ]}
              testID={`gallery-dot-${i}`}
            />
          ))}
        </View>

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
            {model.name}
          </Text>
          <Text
            style={[
              styles.productTagline,
              { color: colors.espressoLight, fontFamily: typography.bodyFamily },
            ]}
            testID="product-tagline"
          >
            {model.tagline}
          </Text>

          {/* Price */}
          <View style={styles.priceRow} testID="price-section">
            <Text
              style={[
                styles.totalPrice,
                { color: colors.espresso, fontFamily: typography.headingFamily },
              ]}
              testID="total-price"
            >
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
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
            ]}
            accessibilityRole="header"
          >
            Fabric
          </Text>
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
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
            ]}
            accessibilityRole="header"
          >
            Dimensions
          </Text>
          <View
            style={[
              styles.dimensionsCard,
              {
                backgroundColor: darkPalette.surfaceElevated,
                borderRadius: borderRadius.card,
              },
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

          {/* Size Guide Toggle */}
          <TouchableOpacity
            style={[
              styles.sizeGuideToggle,
              {
                backgroundColor: darkPalette.surfaceElevated,
                borderRadius: borderRadius.md,
              },
            ]}
            onPress={() => {
              const next = !sizeGuideExpanded;
              setSizeGuideExpanded(next);
              sizeGuideHeight.value = withTiming(next ? 280 : 0, { duration: 300 });
            }}
            testID="size-guide-toggle"
            accessibilityRole="button"
            accessibilityLabel="Size Guide"
            accessibilityState={{ expanded: sizeGuideExpanded }}
          >
            <Text style={[styles.sizeGuideToggleText, { color: colors.espresso }]}>Size Guide</Text>
            <Text style={[styles.sizeGuideChevron, { color: colors.espressoLight }]}>
              {sizeGuideExpanded ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {/* Size Guide Content — always mounted so collapse animation plays */}
          <Animated.View
            style={[sizeGuideAnimStyle]}
            testID={sizeGuideExpanded ? 'size-guide-content' : undefined}
          >
            <SizeGuideDiagram dimensions={model.dimensions} colors={colors} />
          </Animated.View>
        </View>

        {/* Reviews Section */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]} testID="reviews-section">
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
            ]}
            accessibilityRole="header"
          >
            Reviews
          </Text>

          {!hasReviews ? (
            <EmptyState
              title="No Reviews Yet"
              message="Be the first to share your experience with this product."
              illustration={
                <ReviewsIllustration width={200} height={140} testID="reviews-illustration" />
              }
              testID="reviews-empty-state"
            />
          ) : (
            <>
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
                    accessibilityLabel={`Sort reviews by ${sort === 'helpful' ? 'most helpful' : sort === 'recent' ? 'most recent' : sort}`}
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
                  accessibilityLabel={`View all ${reviewSummary.totalReviews} reviews`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.viewAllText, { color: colors.espresso }]}>
                    View All {reviewSummary.totalReviews} Reviews
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Write a Review — authenticated users only */}
          {isAuthenticated && (
            <>
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
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
                      ]}
                    >
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
            </>
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
            {isPremium && <PremiumBadge size="sm" testID="ar-premium-badge" />}
          </TouchableOpacity>
        </View>

        {/* Stock Status */}
        {(isLowStock || isOutOfStock) && (
          <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
            {isLowStock && catalogProduct?.stockCount !== undefined && (
              <View
                style={[styles.stockAlert, { backgroundColor: '#FFF3CD' }]}
                testID="low-stock-alert"
              >
                <Text style={[styles.stockAlertText, { color: '#856404' }]}>
                  Only {catalogProduct.stockCount} left in stock — order soon!
                </Text>
              </View>
            )}
            {isOutOfStock && (
              <View
                style={[styles.stockAlert, { backgroundColor: '#F8D7DA' }]}
                testID="out-of-stock-alert"
              >
                <Text style={[styles.stockAlertText, { color: '#721C24' }]}>
                  Currently out of stock
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Quantity + Add to Cart / Notify Me */}
        <View style={[styles.section, styles.cartSection, { paddingHorizontal: spacing.lg }]}>
          {isOutOfStock ? (
            <>
              <AnimatedPressable
                style={[
                  styles.addToCartButton,
                  {
                    backgroundColor: backInStock.isSubscribed
                      ? colors.mountainBlue
                      : colors.espresso,
                    borderRadius: borderRadius.button,
                  },
                  shadows.button,
                ]}
                onPress={backInStock.toggle}
                haptic="medium"
                scaleDown={0.97}
                testID="notify-back-in-stock-button"
                accessibilityLabel={
                  backInStock.isSubscribed
                    ? 'Cancel back in stock notification'
                    : 'Notify me when back in stock'
                }
                accessibilityRole="button"
              >
                <Text style={styles.addToCartText}>
                  {backInStock.isSubscribed ? 'Subscribed \u2713' : 'Notify Me When Available'}
                </Text>
              </AnimatedPressable>
            </>
          ) : (
            <>
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
              <AnimatedPressable
                style={[
                  styles.addToCartButton,
                  {
                    backgroundColor: colors.sunsetCoral,
                    borderRadius: borderRadius.button,
                  },
                  shadows.button,
                ]}
                onPress={handleAddToCart}
                haptic="medium"
                scaleDown={0.97}
                testID="add-to-cart-button"
                accessibilityLabel={`Add ${quantity} ${model.name} to cart for ${formatPrice(totalPrice * quantity)}`}
                accessibilityRole="button"
              >
                <Text style={styles.addToCartText}>
                  Add to Cart — {formatPrice(totalPrice * quantity)}
                </Text>
              </AnimatedPressable>
            </>
          )}
        </View>

        {/* You May Also Like */}
        {similarItems.length > 0 && (
          <View
            style={[styles.section, { marginTop: spacing.md }]}
            testID="related-products"
            accessibilityLabel="You May Also Like"
          >
            <RecommendationCarousel
              title="You May Also Like"
              products={similarItems}
              onProductPress={onRelatedProductPress}
              testID="related-carousel"
            />
          </View>
        )}

        {/* Bottom spacer */}
        <View style={{ height: spacing.xxl }} />
      </Animated.ScrollView>

      {/* Fullscreen image gallery modal with pinch-to-zoom */}
      <ImageGalleryModal
        visible={fullscreenVisible}
        images={GALLERY_VIEWS.map((label) => ({ label }))}
        initialIndex={activeGalleryIndex}
        onClose={handleCloseFullscreen}
        onIndexChange={setActiveGalleryIndex}
        renderImage={(image, index) => (
          <FutonPlaceholder
            model={model}
            fabric={selectedFabric}
            viewLabel={image.label}
            index={index}
          />
        )}
        testID="fullscreen-gallery-modal"
      />
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
    <View
      style={styles.dimItem}
      testID={`dimension-${label.toLowerCase()}`}
      accessible={true}
      accessibilityLabel={`${label}: ${value}, ${inches} inches`}
    >
      <Text style={[styles.dimValue, { color }]} importantForAccessibility="no">
        {value}
      </Text>
      <Text style={[styles.dimLabel, { color: mutedColor }]} importantForAccessibility="no">
        {label}
      </Text>
      <Text style={[styles.dimInches, { color: mutedColor }]} importantForAccessibility="no">
        {inches}"
      </Text>
    </View>
  );
}

function SizeGuideDiagram({
  dimensions,
  colors,
}: {
  dimensions: { width: number; depth: number; height: number; seatHeight: number };
  colors: {
    espresso: string;
    espressoLight: string;
    mountainBlue: string;
    sandDark: string;
    sandLight: string;
  };
}) {
  const DIAGRAM_W = 200;
  const DIAGRAM_H = 140;
  const scale = DIAGRAM_W / Math.max(dimensions.width, dimensions.depth, dimensions.height);
  const scaledW = dimensions.width * scale * 0.7;
  const scaledD = dimensions.depth * scale * 0.4;
  const scaledH = dimensions.height * scale * 0.6;

  return (
    <View style={styles.sizeGuideInner} testID="size-diagram">
      {/* Visual diagram */}
      <View style={[styles.diagramContainer, { width: DIAGRAM_W, height: DIAGRAM_H }]}>
        {/* Futon shape — isometric box */}
        <View
          style={[
            styles.diagramBox,
            {
              width: scaledW,
              height: scaledH,
              backgroundColor: colors.sandDark,
              borderColor: colors.espressoLight,
              bottom: 0,
              left: (DIAGRAM_W - scaledW) / 2,
            },
          ]}
        />
        {/* Width label — bottom */}
        <View style={[styles.diagramLabelRow, { bottom: -20, left: 0, right: 0 }]}>
          <View
            style={[
              styles.diagramLine,
              { backgroundColor: colors.mountainBlue, width: scaledW, alignSelf: 'center' },
            ]}
          />
          <Text
            style={[styles.diagramLabelText, { color: colors.mountainBlue }]}
            testID="diagram-label-width"
          >
            {dimensions.width}" W
          </Text>
        </View>
        {/* Height label — right side */}
        <View style={[styles.diagramLabelCol, { right: -40, bottom: 0, height: scaledH }]}>
          <View
            style={[styles.diagramLineV, { backgroundColor: colors.mountainBlue, height: scaledH }]}
          />
          <Text
            style={[styles.diagramLabelText, { color: colors.mountainBlue }]}
            testID="diagram-label-height"
          >
            {dimensions.height}" H
          </Text>
        </View>
        {/* Depth label — top */}
        <View style={[styles.diagramLabelRow, { top: -20, left: 0, right: 0 }]}>
          <View
            style={[
              styles.diagramLine,
              { backgroundColor: colors.mountainBlue, width: scaledD, alignSelf: 'center' },
            ]}
          />
          <Text
            style={[styles.diagramLabelText, { color: colors.mountainBlue }]}
            testID="diagram-label-depth"
          >
            {dimensions.depth}" D
          </Text>
        </View>
      </View>

      {/* Room comparison */}
      <View style={styles.roomComparison} testID="room-comparison">
        <Text style={[styles.roomComparisonText, { color: colors.espressoLight }]}>
          Fits comfortably in a 10' × 10' room with space for walking around.
        </Text>
        <View style={styles.roomDiagramRow}>
          <View style={[styles.roomSquare, { borderColor: colors.sandDark }]}>
            <View
              style={[
                styles.futonInRoom,
                {
                  backgroundColor: colors.mountainBlue,
                  width: (dimensions.width / 120) * 50,
                  height: (dimensions.depth / 120) * 50,
                },
              ]}
            />
          </View>
          <Text style={[styles.roomLabel, { color: colors.espressoLight }]}>10' × 10'</Text>
        </View>
      </View>
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
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // Floating navigation buttons — above scroll, fixed position
  floatingBackButton: {
    position: 'absolute',
    top: 52,
    left: 16,
    zIndex: 20,
  },
  floatingShareButton: {
    position: 'absolute',
    top: 52,
    right: 56,
    zIndex: 20,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  shareButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  floatingWishlistButton: {
    position: 'absolute',
    top: 52,
    right: 16,
    zIndex: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: '300',
    marginTop: -2,
  },
  // Parallax gallery
  galleryContainer: {
    height: GALLERY_HEIGHT,
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
  galleryOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  galleryGradientContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  gradientStrip: {
    width: '100%',
  },
  // Pagination
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
  paginationDotActive: {
    width: 24,
    borderRadius: 4,
  },
  // Product info
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
  outOfStockLabel: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
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
  stockAlert: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  stockAlertText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
  // Size Guide
  sizeGuideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  sizeGuideToggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sizeGuideChevron: {
    fontSize: 12,
  },
  sizeGuideInner: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 20,
  },
  diagramContainer: {
    alignSelf: 'center',
    position: 'relative',
  },
  diagramBox: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 4,
  },
  diagramLabelRow: {
    position: 'absolute',
    alignItems: 'center',
  },
  diagramLabelCol: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagramLine: {
    height: 1,
  },
  diagramLineV: {
    width: 1,
  },
  diagramLabelText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  roomComparison: {
    gap: 8,
  },
  roomComparisonText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  roomDiagramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  roomSquare: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  futonInRoom: {
    borderRadius: 2,
  },
  roomLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
