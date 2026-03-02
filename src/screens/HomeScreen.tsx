import React, { useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { GlassCard } from '@/components/GlassCard';
import type { RootStackParamList } from '@/navigation/AppNavigator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onOpenAR?: () => void;
  onOpenShop?: () => void;
}

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

      {/* AR CTA — Primary, glassmorphism */}
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

      {/* Shop CTA */}
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

      {/* Section divider — placeholder for mountain skyline SVG */}
      <View style={styles.dividerSection}>
        <View style={[styles.dividerLine, { backgroundColor: darkPalette.borderSubtle }]} />
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
    width: SCREEN_WIDTH - 48,
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
  dividerLine: {
    width: 60,
    height: 1,
    marginBottom: 12,
  },
  dividerText: {
    textAlign: 'center',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
