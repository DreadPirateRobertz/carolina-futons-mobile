/**
 * @module PromoBannerCarousel
 *
 * Auto-rotating promotional banner carousel with dot indicators.
 * Each banner supports image, title, subtitle, CTA text, and deep link target.
 * Auto-rotates every 5 seconds, pauses on user interaction.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Dimensions,
  type ViewToken,
  type ListRenderItemInfo,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Linking } from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { GlassCard } from '@/components/GlassCard';
import type { RootStackParamList } from '@/navigation/AppNavigator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 48;
const AUTO_ROTATE_MS = 5000;

export interface PromoBannerItem {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  deepLink: string;
  emoji: string;
  accentColor: string;
}

const LAUNCH_PROMOS: PromoBannerItem[] = [
  {
    id: 'promo-free-shipping',
    title: 'Free Shipping',
    subtitle: 'On all orders over $299 — no code needed',
    ctaText: 'Shop Now',
    deepLink: 'carolinafutons://shop',
    emoji: '🚚',
    accentColor: '#5B8FA8', // mountainBlue
  },
  {
    id: 'promo-cf-plus',
    title: 'Try CF+ Free',
    subtitle: '30-day trial — AR room planning, free shipping & more',
    ctaText: 'Start Trial',
    deepLink: 'carolinafutons://account',
    emoji: '✨',
    accentColor: '#E8845C', // sunsetCoral
  },
  {
    id: 'promo-new-collection',
    title: 'Spring Collection',
    subtitle: 'Handcrafted pieces inspired by the Blue Ridge',
    ctaText: 'Explore',
    deepLink: 'carolinafutons://collections/spring-2026',
    emoji: '🌿',
    accentColor: '#6B8E5A', // forest green accent
  },
];

interface Props {
  items?: PromoBannerItem[];
}

export function PromoBannerCarousel({ items = LAUNCH_PROMOS }: Props) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const autoRotateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userInteractedRef = useRef(false);

  const startAutoRotate = useCallback(() => {
    if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    autoRotateRef.current = setInterval(() => {
      if (userInteractedRef.current) {
        userInteractedRef.current = false;
        return;
      }
      setActiveIndex((prev) => {
        const next = (prev + 1) % items.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_ROTATE_MS);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    startAutoRotate();
    return () => {
      if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    };
  }, [items.length, startAutoRotate]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleBannerPress = useCallback((deepLink: string) => {
    Linking.openURL(deepLink).catch(() => {});
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    userInteractedRef.current = true;
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PromoBannerItem>) => (
      <GlassCard
        style={[styles.bannerCard, { width: BANNER_WIDTH }]}
        intensity="medium"
        testID={`promo-banner-${item.id}`}
      >
        <Pressable
          style={styles.bannerInner}
          onPress={() => handleBannerPress(item.deepLink)}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}: ${item.subtitle}. ${item.ctaText}`}
        >
          <View
            style={[
              styles.bannerIconWrap,
              { backgroundColor: item.accentColor, borderRadius: borderRadius.lg },
            ]}
          >
            <Text style={styles.bannerIcon}>{item.emoji}</Text>
          </View>
          <View style={styles.bannerContent}>
            <Text
              style={[
                styles.bannerTitle,
                {
                  color: darkPalette.textPrimary,
                  fontFamily: typography.headingFamily,
                },
              ]}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.bannerSubtitle,
                {
                  color: darkPalette.textMuted,
                  fontFamily: typography.bodyFamily,
                },
              ]}
              numberOfLines={2}
            >
              {item.subtitle}
            </Text>
          </View>
          <View
            style={[
              styles.bannerCta,
              { backgroundColor: item.accentColor, borderRadius: borderRadius.md },
            ]}
          >
            <Text
              style={[
                styles.bannerCtaText,
                { fontFamily: typography.bodyFamilyBold },
              ]}
            >
              {item.ctaText}
            </Text>
          </View>
        </Pressable>
      </GlassCard>
    ),
    [handleBannerPress, borderRadius, typography],
  );

  if (items.length === 0) return null;

  return (
    <View style={[styles.container, { marginHorizontal: spacing.lg }]} testID="promo-banner-carousel">
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={BANNER_WIDTH}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollBeginDrag={handleScrollBeginDrag}
        getItemLayout={(_, index) => ({
          length: BANNER_WIDTH,
          offset: BANNER_WIDTH * index,
          index,
        })}
      />
      {items.length > 1 && (
        <View style={styles.dots} testID="promo-dots">
          {items.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === activeIndex
                      ? colors.sunsetCoral
                      : darkPalette.textMuted,
                  width: index === activeIndex ? 20 : 8,
                  borderRadius: borderRadius.pill,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: BANNER_WIDTH,
    alignSelf: 'center',
    marginBottom: 16,
  },
  bannerCard: {
    width: BANNER_WIDTH,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  bannerIconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIcon: {
    fontSize: 22,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  bannerCta: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bannerCtaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    height: 8,
    opacity: 0.8,
  },
});
