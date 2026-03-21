/**
 * VisualSearchResultsScreen — shown after a visual search via camera.
 * Receives productSlugs + query as route params, looks up full Product objects,
 * renders a ProductCard grid with match-reason chips under each card.
 */
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/theme';
import { PRODUCTS, type Product } from '@/data/products';
import { ProductCard } from '@/components/ProductCard';
import { VisualSearchEmptyState } from '@/components/VisualSearchEmptyState';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import type { VisualSearchQuery } from '@/hooks/useVisualSearch';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = RouteProp<RootStackParamList, 'VisualSearchResults'>;

interface Props {
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

function matchReason(product: Product, query: VisualSearchQuery): string {
  const parts: string[] = [];
  if (product.category === query.category) parts.push('Similar category');
  if (product.colorFamily === query.colorFamily) parts.push(`${query.colorFamily} tones`);
  if (product.tags?.includes(query.style)) parts.push(`${query.style} style`);
  return parts.join(' · ') || 'Visual match';
}

export function VisualSearchResultsScreen({ loading, error, onRetry }: Props) {
  const navigation = useNavigation<NavProp>();
  const { params } = useRoute<RouteParams>();
  const { colors, spacing } = useTheme();

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.sandBase }]} testID="vs-loading">
        <ActivityIndicator size="large" color={colors.espresso} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.sandBase }]}>
        <Text style={[styles.errorText, { color: colors.espresso }]}>{error}</Text>
        {onRetry && (
          <TouchableOpacity
            testID="vs-retry-btn"
            onPress={onRetry}
            style={[styles.retryBtn, { borderColor: colors.espresso }]}
          >
            <Text style={[styles.retryText, { color: colors.espresso }]}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const products = (params.productSlugs ?? [])
    .map((slug) => PRODUCTS.find((p) => p.slug === slug))
    .filter((p): p is Product => Boolean(p));

  if (products.length === 0) {
    return (
      <VisualSearchEmptyState onBrowseAll={() => navigation.navigate('Tabs', { screen: 'Shop' })} />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.sandBase }]}>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ padding: spacing.md }}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ProductCard
              testID={`product-card-${item.slug}`}
              product={item}
              onPress={() => navigation.navigate('ProductDetail', { slug: item.slug })}
            />
            <Text
              testID={`match-reason-${item.slug}`}
              style={[styles.chip, { color: colors.espressoLight }]}
            >
              {params.query ? matchReason(item, params.query) : 'Visual match'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  row: { gap: 8, marginBottom: 8 },
  cardWrapper: { flex: 1 },
  chip: { fontSize: 11, textAlign: 'center', paddingBottom: 8, paddingTop: 4 },
  errorText: { fontSize: 15, marginBottom: 16, textAlign: 'center' },
  retryBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { fontSize: 14, fontWeight: '600' },
});
