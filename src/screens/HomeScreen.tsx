/**
 * @module HomeScreen
 *
 * Landing screen and brand showcase for the Carolina Futons app. Features the
 * mountain skyline hero, brand headline, and two primary Call To Action cards:
 *   1. "Try in Your Room" - launches the AR (Augmented Reality) camera experience.
 *   2. "Browse Products" - navigates to the Shop tab.
 *
 * This screen establishes the Blue Ridge Mountains brand identity and funnels
 * users into the two main engagement paths.
 */

import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, Pressable, Platform } from 'react-native';
import { StreakBadge } from '@/components/StreakBadge';
import { useStreak } from '@/hooks/useStreak';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { GlassCard } from '@/components/GlassCard';
import { CollectionCard } from '@/components/CollectionCard';
import { SkeletonCarouselRow } from '@/components/SkeletonCarouselItem';
import { MountainSkyline } from '@/components/MountainSkyline';
import { LivingSkyBackground } from '@/components/LivingSkyBackground';
import { LivingSkyMountainSkyline } from '@/components/LivingSkyMountainSkyline';
import { useLivingSky } from '@/hooks/useLivingSky';
import { PromoBannerCarousel } from '@/components/PromoBannerCarousel';
import { useCollections } from '@/hooks/useCollections';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useQuizRecommendations } from '@/hooks/useQuizRecommendations';
import { RecommendationCarousel } from '@/components/RecommendationCarousel';
import { ChallengesRail } from '@/components/ChallengesRail';
import { useActiveChallenges } from '@/hooks/useActiveChallenges';
import { StreakDangerBanner } from '@/components/StreakDangerBanner';
import { ChallengeCompletedToast } from '@/components/ChallengeCompletedToast';
import { TierUpgradeToast } from '@/components/TierUpgradeToast';
import { useTriggerMoments } from '@/hooks/useTriggerMoments';
import { ProductCard } from '@/components/ProductCard';
import type { EditorialCollection } from '@/data/collections';
import type { Product } from '@/data/products';
import type { RootStackParamList } from '@/navigation/AppNavigator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Props for the HomeScreen component. */
interface Props {
  /** Override callback for the AR Call To Action; defaults to navigating to the AR screen. */
  onOpenAR?: () => void;
  /** Override callback for the Shop Call To Action; defaults to switching to the Shop tab. */
  onOpenShop?: () => void;
  /** Override callback when a collection card is tapped; defaults to navigating to CollectionDetail. */
  onCollectionPress?: (collection: EditorialCollection) => void;
}

/**
 * App landing screen with brand hero, mountain skyline, and two glassmorphism
 * Call To Action cards for AR and product browsing.
 *
 * @param props - {@link Props}
 * @returns The home screen view.
 */
export function HomeScreen({ onOpenAR, onOpenShop, onCollectionPress }: Props) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { streak, loading: streakLoading } = useStreak();
  const { featured, isLoading: collectionsLoading, error: collectionsError } = useCollections();
  const { recentProducts } = useRecentlyViewed();
  const {
    recommendations: quizRecs,
    label: quizLabel,
    isLoading: quizLoading,
    quizTaken,
  } = useQuizRecommendations();
  const { challenges } = useActiveChallenges();
  const { triggers, dismiss } = useTriggerMoments();
  const skyState = useLivingSky();

  // cf-7l2 — propagate sky nav colours to navigator options (e.g. for status bar theming)
  useEffect(() => {
    navigation.setOptions?.({
      headerStyle: { backgroundColor: skyState.navBg },
      headerTintColor: skyState.navText,
    });
  }, [skyState.navBg, skyState.navText, navigation]);

  const handleOpenAR = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (onOpenAR) return onOpenAR();
    navigation.navigate('AR');
  }, [onOpenAR, navigation]);

  const handleOpenShop = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (onOpenShop) return onOpenShop();
    navigation.navigate('Tabs', { screen: 'Shop' });
  }, [onOpenShop, navigation]);

  const handleCollectionPress = useCallback(
    (collection: EditorialCollection) => {
      if (onCollectionPress) return onCollectionPress(collection);
      navigation.navigate('CollectionDetail', { slug: collection.slug });
    },
    [onCollectionPress, navigation],
  );

  const handleProductPress = useCallback(
    (product: Product) => {
      navigation.navigate('ProductDetail', { slug: product.slug });
    },
    [navigation],
  );

  const handleOpenSearch = useCallback(() => {
    navigation.navigate('Search');
  }, [navigation]);

  return (
    <View style={styles.root}>
      {/* cf-7l2 — full-screen sky gradient, absolute behind all content */}
      <LivingSkyBackground />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom },
        ]}
        testID="home-screen"
      >
        {/* Hero — Mountain skyline backdrop (decorative) */}
        <View
          style={styles.heroBackdrop}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <LivingSkyMountainSkyline state={skyState} height={140} testID="home-hero-skyline" />
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.heroBadge,
              {
                backgroundColor: darkPalette.surfaceElevated,
                borderRadius: borderRadius.pill,
              },
            ]}
          >
            <Text style={[styles.heroBadgeText, { color: colors.sunsetCoral }]}>
              Handcrafted in NC
            </Text>
          </View>

          {!streakLoading && streak > 0 && (
            <StreakBadge streak={streak} testID="home-streak-badge" />
          )}

          <Text
            style={[
              styles.heroTitle,
              {
                color: colors.espresso,
                ...typography.heroTitle,
                fontFamily: typography.headingFamily,
              },
            ]}
            accessibilityRole="header"
          >
            Carolina{'\n'}Futons
          </Text>

          <Text
            style={[
              styles.heroSubtitle,
              {
                color: colors.espressoLight,
                ...typography.bodyLarge,
                fontFamily: typography.bodyFamily,
              },
            ]}
          >
            Handcrafted comfort from the Blue Ridge Mountains
          </Text>
        </View>

        {/* Streak danger banner — cm-a7bqj */}
        {triggers.streakDanger && (
          <View style={[styles.streakBannerWrap, { marginHorizontal: spacing.lg }]}>
            <StreakDangerBanner
              visible={triggers.streakDanger}
              onDismiss={() => dismiss('streakDanger')}
            />
          </View>
        )}

        {/* Connection error banner — shows when Wix fetch fails but static content is visible.
          Positioned here (below hero, above CTA cards) so it's visible without scrolling. cm-1b4 */}
        {collectionsError ? (
          <View
            style={[styles.connectionErrorBanner, { backgroundColor: colors.espresso + 'E6' }]}
            testID="home-connection-error"
          >
            <View
              testID="home-connection-error-illustration"
              style={styles.connectionErrorIllustration}
            >
              <MountainSkyline variant="sunset" height={40} testID="home-error-skyline" />
            </View>
            <Text
              style={[
                styles.connectionErrorText,
                { color: colors.sandBase, fontFamily: typography.bodyFamily },
              ]}
            >
              Couldn't refresh content. Showing saved data.
            </Text>
          </View>
        ) : null}

        {/* Promotional Banner Carousel */}
        <PromoBannerCarousel />

        {/* AR (Augmented Reality) Call To Action — Primary, glassmorphism */}
        <GlassCard style={[styles.ctaCard, { marginHorizontal: spacing.lg }]} intensity="medium">
          <Pressable
            style={styles.ctaInner}
            onPress={handleOpenAR}
            testID="home-ar-button"
            accessibilityLabel="Try futons in your room with AR camera"
            accessibilityRole="button"
          >
            <View
              style={[
                styles.ctaIconWrap,
                {
                  backgroundColor: colors.sunsetCoral,
                  borderRadius: borderRadius.lg,
                },
              ]}
            >
              <Text style={styles.ctaIcon}>📷</Text>
            </View>
            <View style={styles.ctaText}>
              <Text
                style={[
                  styles.ctaTitle,
                  {
                    color: darkPalette.textPrimary,
                    fontFamily: typography.bodyFamilyBold,
                  },
                ]}
              >
                Try in Your Room
              </Text>
              <Text
                style={[
                  styles.ctaSubtitle,
                  {
                    color: darkPalette.textMuted,
                    fontFamily: typography.bodyFamily,
                  },
                ]}
              >
                See how our futons fit using your camera
              </Text>
            </View>
            <Text
              style={[styles.ctaArrow, { color: darkPalette.textMuted }]}
              importantForAccessibility="no"
            >
              ›
            </Text>
          </Pressable>
        </GlassCard>

        {/* Shop Call To Action */}
        <GlassCard style={[styles.ctaCard, { marginHorizontal: spacing.lg }]} intensity="light">
          <Pressable
            style={styles.ctaInner}
            onPress={handleOpenShop}
            testID="home-shop-button"
            accessibilityLabel="Browse our products"
            accessibilityRole="button"
          >
            <View
              style={[
                styles.ctaIconWrap,
                {
                  backgroundColor: colors.mountainBlue,
                  borderRadius: borderRadius.lg,
                },
              ]}
            >
              <Text style={styles.ctaIcon}>🛋️</Text>
            </View>
            <View style={styles.ctaText}>
              <Text
                style={[
                  styles.ctaTitle,
                  {
                    color: darkPalette.textPrimary,
                    fontFamily: typography.bodyFamilyBold,
                  },
                ]}
              >
                Browse Products
              </Text>
              <Text
                style={[
                  styles.ctaSubtitle,
                  {
                    color: darkPalette.textMuted,
                    fontFamily: typography.bodyFamily,
                  },
                ]}
              >
                Futons, covers, mattresses & more
              </Text>
            </View>
            <Text
              style={[styles.ctaArrow, { color: darkPalette.textMuted }]}
              importantForAccessibility="no"
            >
              ›
            </Text>
          </Pressable>
        </GlassCard>

        {/* Gamification Challenges Rail */}
        <ChallengesRail challenges={challenges} />

        {/* Collection Carousel */}
        {(collectionsLoading || featured.length > 0) && (
          <View style={styles.carouselSection}>
            <Text
              style={[
                styles.carouselTitle,
                {
                  color: colors.espresso,
                  fontFamily: typography.headingFamily,
                  ...typography.h3,
                  paddingHorizontal: spacing.lg,
                },
              ]}
              accessibilityRole="header"
            >
              Shop the Look
            </Text>
            {collectionsLoading && featured.length === 0 ? (
              <SkeletonCarouselRow count={3} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.carouselContent,
                  { paddingHorizontal: spacing.lg, gap: spacing.md },
                ]}
                testID="collection-carousel"
                accessibilityRole="adjustable"
                accessibilityLabel="Shop the Look collections"
                accessibilityHint="Swipe left or right to browse collections"
              >
                {featured.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    onPress={handleCollectionPress}
                    variant="compact"
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Personalized Picks (quiz-driven) */}
        {quizTaken && (
          <View style={styles.carouselSection}>
            {quizLoading ? (
              <View testID="skeleton-personalized-picks">
                <SkeletonCarouselRow count={3} />
              </View>
            ) : quizRecs.length > 0 ? (
              <View testID="personalized-picks">
                <RecommendationCarousel
                  title={quizLabel || 'Picked for You'}
                  products={quizRecs}
                  onProductPress={handleProductPress}
                  testID="personalized-picks-carousel"
                />
              </View>
            ) : null}
          </View>
        )}

        {/* Recently Viewed Products */}
        {recentProducts.length > 0 && (
          <View style={styles.carouselSection} testID="recently-viewed-section">
            <Text
              style={[
                styles.carouselTitle,
                {
                  color: colors.espresso,
                  fontFamily: typography.headingFamily,
                  ...typography.h3,
                  paddingHorizontal: spacing.lg,
                },
              ]}
              accessibilityRole="header"
            >
              Recently Viewed
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.carouselContent,
                { paddingHorizontal: spacing.lg, gap: spacing.md },
              ]}
              testID="recently-viewed-carousel"
              accessibilityRole="adjustable"
              accessibilityLabel="Recently viewed products"
              accessibilityHint="Swipe left or right to browse recently viewed products"
            >
              {recentProducts.slice(0, 10).map((product) => (
                <View key={product.id} style={styles.recentProductCard}>
                  <ProductCard product={product} onPress={() => handleProductPress(product)} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Mountain skyline section divider (decorative) */}
        <View
          style={styles.dividerSection}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <MountainSkyline variant="sunrise" height={80} testID="home-mountain-skyline" />
          <Text
            style={[
              styles.dividerText,
              {
                color: colors.espressoLight,
                fontFamily: typography.bodyFamily,
                ...typography.caption,
              },
            ]}
          >
            Since 1985 · Hendersonville, NC
          </Text>
        </View>
      </ScrollView>

      {/* Gamification toasts — cfutons_mobile-0lt */}
      {triggers.challengeCompleted && (
        <ChallengeCompletedToast
          title={triggers.challengeCompleted.title}
          rewardPoints={triggers.challengeCompleted.rewardPoints}
          visible={true}
          testID="home-challenge-toast"
          onDismiss={() => dismiss('challengeCompleted')}
        />
      )}
      {triggers.tierChanged && (
        <TierUpgradeToast
          tier={triggers.tierChanged}
          visible={true}
          testID="home-tier-upgrade-toast"
          onDismiss={() => dismiss('tierChanged')}
        />
      )}

      {/* Search icon — absolute top-right, overlays hero */}
      <Pressable
        testID="home-search-button"
        style={[styles.searchBtn, { top: insets.top + spacing.sm, right: spacing.lg }]}
        onPress={handleOpenSearch}
        accessibilityRole="button"
        accessibilityLabel="Search products"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.searchIcon}>🔍</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  heroBackdrop: {
    width: '100%',
    marginBottom: -40,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 40,
  },
  heroBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 24,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    textAlign: 'center',
    maxWidth: SCREEN_WIDTH * 0.75,
  },
  ctaCard: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - 48,
    alignSelf: 'center',
    marginBottom: 16,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  ctaIconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIcon: {
    fontSize: 24,
  },
  ctaText: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  ctaSubtitle: {
    fontSize: 13,
  },
  ctaArrow: {
    fontSize: 28,
    fontWeight: '300',
  },
  carouselSection: {
    width: '100%',
    marginTop: 24,
  },
  carouselTitle: {
    marginBottom: 12,
  },
  carouselContent: {
    flexDirection: 'row',
  },
  recentProductCard: {
    width: 160,
  },
  dividerSection: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 48,
  },
  dividerText: {
    textAlign: 'center',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  connectionErrorBanner: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  connectionErrorIllustration: {
    width: '100%',
  },
  connectionErrorText: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  streakBannerWrap: {
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
  },
  searchBtn: {
    position: 'absolute',
    zIndex: 10,
    padding: 4,
  },
  searchIcon: {
    fontSize: 22,
  },
});
