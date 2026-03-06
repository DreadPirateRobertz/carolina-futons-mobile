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

import React, { useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { darkPalette, colors as tokenColors } from '@/theme/tokens';
import { GlassCard } from '@/components/GlassCard';
import { MountainSkyline } from '@/components/MountainSkyline';
import type { RootStackParamList } from '@/navigation/AppNavigator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Props for the HomeScreen component. */
interface Props {
  /** Override callback for the AR Call To Action; defaults to navigating to the AR screen. */
  onOpenAR?: () => void;
  /** Override callback for the Shop Call To Action; defaults to switching to the Shop tab. */
  onOpenShop?: () => void;
}

/**
 * App landing screen with brand hero, mountain skyline, and two glassmorphism
 * Call To Action cards for AR and product browsing.
 *
 * @param props - {@link Props}
 * @returns The home screen view.
 */
export function HomeScreen({ onOpenAR, onOpenShop }: Props) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const handleOpenAR = useCallback(() => {
    if (onOpenAR) return onOpenAR();
    navigation.navigate('AR');
  }, [onOpenAR, navigation]);

  const handleOpenShop = useCallback(() => {
    if (onOpenShop) return onOpenShop();
    const parent = navigation.getParent?.();
    if (parent) {
      parent.navigate('Shop' as never);
    }
  }, [onOpenShop, navigation]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.sandBase }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom },
      ]}
      testID="home-screen"
    >
      {/* Hero — Mountain skyline backdrop */}
      <View style={styles.heroBackdrop}>
        <MountainSkyline variant="sunrise" height={140} showGlow testID="home-hero-skyline" />
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

        <Text
          style={[
            styles.heroTitle,
            {
              color: colors.espresso,
              ...typography.heroTitle,
              fontFamily: typography.headingFamily,
            },
          ]}
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
          <Text style={[styles.ctaArrow, { color: darkPalette.textMuted }]}>›</Text>
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
          <Text style={[styles.ctaArrow, { color: darkPalette.textMuted }]}>›</Text>
        </Pressable>
      </GlassCard>

      {/* Mountain skyline section divider */}
      <View style={styles.dividerSection}>
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
  );
}

const styles = StyleSheet.create({
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
});
