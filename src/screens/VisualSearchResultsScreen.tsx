/**
 * @module VisualSearchResultsScreen
 *
 * Displays top-5 visually similar products for a captured photo — deacon-905.
 *
 * On mount: fetches catalog export, runs image embedding search, renders matches.
 * Handles loading skeleton, empty state, and network error with retry.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import { fetchCatalogExport } from '@/services/visualSearch';
import { searchByImage } from '@/services/visualSearchEmbedding';
import type { VisualSearchMatch } from '@/services/visualSearchEmbedding';
import { captureException } from '@/services/crashReporting';
import { useOptionalWixClient } from '@/services/wix';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'VisualSearchResults'>;

// ── State ─────────────────────────────────────────────────────────────────────

type SearchState =
  | { status: 'loading' }
  | { status: 'success'; matches: VisualSearchMatch[] }
  | { status: 'empty' }
  | { status: 'error'; message: string };

// ── Screen ────────────────────────────────────────────────────────────────────

export function VisualSearchResultsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const wixClient = useOptionalWixClient();
  const { imageUri } = route.params;

  const [state, setState] = useState<SearchState>({ status: 'loading' });
  const retryRef = useRef(0);

  const runSearch = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const catalogResult = await fetchCatalogExport(wixClient);
      if (!catalogResult.success) {
        setState({ status: 'error', message: catalogResult.error ?? 'Failed to load catalog' });
        return;
      }

      const searchResult = await searchByImage(imageUri, catalogResult.products);
      if (!searchResult.success) {
        setState({ status: 'error', message: searchResult.error ?? 'Search failed' });
        return;
      }

      if (searchResult.matches.length === 0) {
        setState({ status: 'empty' });
      } else {
        setState({ status: 'success', matches: searchResult.matches });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      captureException(error);
      setState({ status: 'error', message: error.message });
    }
  }, [imageUri, wixClient]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  const handleRetry = useCallback(() => {
    retryRef.current += 1;
    runSearch();
  }, [runSearch]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleProductPress = useCallback(
    (slug: string) => {
      navigation.navigate('ProductDetail', { slug });
    },
    [navigation],
  );

  return (
    <View
      style={[styles.container, { paddingTop: insets.top }]}
      testID="visual-search-results-screen"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="visual-search-results-back"
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visual Search</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Captured image preview */}
      <Image
        testID="visual-search-preview-image"
        source={{ uri: imageUri }}
        style={styles.previewImage}
        resizeMode="cover"
        accessibilityLabel="Your captured photo"
      />

      {/* Content */}
      {state.status === 'loading' && <LoadingState />}
      {state.status === 'success' && (
        <ResultsList matches={state.matches} onProductPress={handleProductPress} />
      )}
      {state.status === 'empty' && <EmptyState />}
      {state.status === 'error' && <ErrorState message={state.message} onRetry={handleRetry} />}
    </View>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <View style={styles.loadingContainer} testID="visual-search-results-loading">
      <ActivityIndicator size="large" color="#E8845C" />
      <Text style={styles.loadingText}>Finding similar products…</Text>
    </View>
  );
}

// ── Results list ──────────────────────────────────────────────────────────────

interface ResultsListProps {
  matches: VisualSearchMatch[];
  onProductPress: (slug: string) => void;
}

function ResultsList({ matches, onProductPress }: ResultsListProps) {
  return (
    <FlatList
      testID="visual-search-results-list"
      data={matches}
      keyExtractor={(item) => item.product.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <TouchableOpacity
          testID={`visual-search-result-card-${item.product.id}`}
          style={styles.resultCard}
          onPress={() => onProductPress(item.product.slug)}
          accessibilityLabel={`${item.product.name}, ${Math.round(item.score * 100)}% match`}
          accessibilityRole="button"
        >
          {item.product.images[0] ? (
            <Image
              source={{ uri: item.product.images[0] }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productImage, styles.productImagePlaceholder]} />
          )}
          <View style={styles.cardBody}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.product.name}
            </Text>
            <Text style={styles.productPrice}>${item.product.price.toFixed(2)}</Text>
          </View>
          <View
            testID={`visual-search-result-score-${item.product.id}`}
            style={styles.scoreBadge}
          >
            <Text style={styles.scoreText}>{Math.round(item.score * 100)}%</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.centeredState} testID="visual-search-results-empty">
      <Text style={styles.emptyTitle}>No matches found</Text>
      <Text style={styles.emptyBody}>
        Try taking a clearer photo of the furniture item you want to find.
      </Text>
    </View>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.centeredState} testID="visual-search-results-error">
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <TouchableOpacity
        testID="visual-search-results-retry"
        style={styles.retryButton}
        onPress={onRetry}
        accessibilityLabel="Retry visual search"
        accessibilityRole="button"
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EFE4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D4C4A8',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#2C1A0E',
  },
  headerSpacer: {
    width: 44,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 32,
    color: '#2C1A0E',
    lineHeight: 36,
  },
  previewImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#D4C4A8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6B4C30',
    fontSize: 15,
  },
  listContent: {
    padding: 12,
    gap: 10,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  productImage: {
    width: 88,
    height: 88,
  },
  productImagePlaceholder: {
    backgroundColor: '#E8D5B7',
  },
  cardBody: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C1A0E',
  },
  productPrice: {
    fontSize: 14,
    color: '#6B4C30',
    fontWeight: '500',
  },
  scoreBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#E8845C',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C1A0E',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: '#6B4C30',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C1A0E',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B4C30',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: '#E8845C',
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
