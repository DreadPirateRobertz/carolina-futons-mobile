import React, { useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/theme';
import { useCollections } from '@/hooks/useCollections';
import { CollectionCard } from '@/components/CollectionCard';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import type { EditorialCollection } from '@/data/collections';

interface Props {
  onOpenAR?: () => void;
  onOpenShop?: () => void;
}

const collectionKeyExtractor = (item: EditorialCollection) => item.id;

export function HomeScreen({ onOpenAR, onOpenShop }: Props) {
  const { colors, spacing, typography, shadows, borderRadius } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { featured, collections } = useCollections();

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

  const handleCollectionPress = useCallback(
    (collection: EditorialCollection) => {
      navigation.navigate('CollectionDetail', { slug: collection.slug });
    },
    [navigation],
  );

  const handleSeeAllCollections = useCallback(() => {
    navigation.navigate('Collections');
  }, [navigation]);

  const renderCollectionItem = useCallback(
    ({ item }: { item: EditorialCollection }) => (
      <CollectionCard collection={item} onPress={handleCollectionPress} variant="compact" />
    ),
    [handleCollectionPress],
  );

  return (
    <ScrollView
      style={[styles.scrollContainer, { backgroundColor: colors.sandBase }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      testID="home-screen"
    >
      <View style={{ padding: spacing.lg, alignItems: 'center' }}>
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
          style={[
            styles.ctaButton,
            shadows.cardHover,
            { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.xl },
          ]}
          onPress={handleOpenAR}
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
          style={[
            styles.ctaButton,
            shadows.cardHover,
            { backgroundColor: colors.mountainBlue, borderRadius: borderRadius.xl },
          ]}
          onPress={handleOpenShop}
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

      {/* Curated Collections Carousel */}
      <View style={{ marginTop: spacing.lg }}>
        <View
          style={[
            styles.sectionHeader,
            { paddingHorizontal: spacing.pagePadding, marginBottom: spacing.sm },
          ]}
        >
          <Text
            style={[
              typography.h3,
              { color: colors.espresso, fontFamily: typography.headingFamily },
            ]}
          >
            Shop Curated Looks
          </Text>
          <TouchableOpacity
            onPress={handleSeeAllCollections}
            testID="home-see-all-collections"
          >
            <Text
              style={[
                typography.navLink,
                { color: colors.mountainBlue },
              ]}
            >
              See All
            </Text>
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={collections}
          keyExtractor={collectionKeyExtractor}
          renderItem={renderCollectionItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.pagePadding, gap: spacing.md }}
          testID="home-collections-carousel"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    gap: 14,
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
