import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  onOpenAR?: () => void;
  onOpenShop?: () => void;
}

export function HomeScreen({ onOpenAR, onOpenShop }: Props) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.sandBase, padding: spacing.lg }]}
      testID="home-screen"
    >
      <Text
        style={[
          styles.title,
          { color: colors.espresso, ...typography.h2, fontFamily: typography.headingFamily },
        ]}
      >
        Welcome to Carolina Futons
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: colors.espressoLight, ...typography.body, fontFamily: typography.bodyFamily },
        ]}
      >
        Handcrafted comfort from the Blue Ridge Mountains
      </Text>

      {/* AR CTA */}
      <TouchableOpacity
        style={[styles.ctaButton, { backgroundColor: colors.sunsetCoral }]}
        onPress={onOpenAR}
        testID="home-ar-button"
        accessibilityLabel="Try futons in your room with AR camera"
        accessibilityRole="button"
      >
        <Text style={styles.ctaIcon}>📷</Text>
        <View>
          <Text style={styles.ctaTitle}>Try in Your Room</Text>
          <Text style={styles.ctaSubtitle}>See how our futons fit using your camera</Text>
        </View>
      </TouchableOpacity>

      {/* Shop CTA */}
      <TouchableOpacity
        style={[styles.ctaButton, { backgroundColor: colors.mountainBlue }]}
        onPress={onOpenShop}
        testID="home-shop-button"
        accessibilityLabel="Browse our products"
        accessibilityRole="button"
      >
        <Text style={styles.ctaIcon}>🛋️</Text>
        <View>
          <Text style={styles.ctaTitle}>Browse Products</Text>
          <Text style={styles.ctaSubtitle}>Futons, covers, mattresses & more</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 14,
    shadowColor: '#3A2518',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaIcon: {
    fontSize: 28,
  },
  ctaTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  ctaSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 2,
  },
});
