import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList } from 'react-native';
import { useTheme } from '@/theme';
import { type Store, calculateDistance } from '@/data/stores';
import { useStores } from '@/hooks/useStores';
import { StoreCard } from '@/components/StoreCard';
import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';

interface Props {
  onStorePress?: (store: Store) => void;
  userLatitude?: number;
  userLongitude?: number;
  testID?: string;
}

export function StoreLocatorScreen({ onStorePress, userLatitude, userLongitude, testID }: Props) {
  const { colors, spacing } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Data from hook — replaces direct STORES import
  const { stores, isLoading, error } = useStores();

  const storesWithDistance = useMemo(() => {
    return stores.map((store) => ({
      store,
      distance:
        userLatitude != null && userLongitude != null
          ? calculateDistance(userLatitude, userLongitude, store.latitude, store.longitude)
          : undefined,
    })).sort((a, b) => {
      if (a.distance != null && b.distance != null) return a.distance - b.distance;
      if (a.distance != null) return -1;
      if (b.distance != null) return 1;
      return 0;
    });
  }, [stores, userLatitude, userLongitude]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return storesWithDistance;
    const q = searchQuery.toLowerCase();
    return storesWithDistance.filter(
      ({ store }) =>
        store.name.toLowerCase().includes(q) ||
        store.city.toLowerCase().includes(q) ||
        store.state.toLowerCase().includes(q) ||
        store.zip.includes(q),
    );
  }, [storesWithDistance, searchQuery]);

  const renderStore = useCallback(
    ({ item }: { item: (typeof storesWithDistance)[number] }) => (
      <StoreCard store={item.store} distance={item.distance} onPress={onStorePress} />
    ),
    [onStorePress],
  );

  const keyExtractor = useCallback(
    (item: (typeof storesWithDistance)[number]) => item.store.id,
    [],
  );

  const renderEmpty = useCallback(
    () => (
      <EmptyState
        icon="📍"
        title="No stores found"
        message={
          searchQuery
            ? `No results for "${searchQuery}". Try a different city or zip code.`
            : 'No showroom locations available.'
        }
        testID="store-locator-empty"
      />
    ),
    [searchQuery],
  );

  // Loading state
  if (isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.sandBase }]}
        testID="stores-loading"
      >
        <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
          <Text style={[styles.title, { color: colors.espresso }]}>Find a Showroom</Text>
        </View>
        <View style={styles.centeredMessage}>
          <Text style={[styles.messageText, { color: colors.espressoLight }]}>
            Loading showrooms...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.sandBase }]}
        testID="stores-error"
      >
        <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
          <Text style={[styles.title, { color: colors.espresso }]}>Find a Showroom</Text>
        </View>
        <View style={styles.centeredMessage}>
          <Text style={[styles.messageText, { color: colors.espressoLight }]}>
            We couldn't load showroom locations
          </Text>
          <Text style={[styles.errorDetail, { color: colors.espressoLight }]}>
            {error.message}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'store-locator-screen'}
    >
      <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
        <Text style={[styles.title, { color: colors.espresso }]}>Find a Showroom</Text>
        <Text style={[styles.subtitle, { color: colors.espressoLight }]}>
          {stores.length} locations across the Carolinas
        </Text>
      </View>

      <View style={[styles.searchContainer, { paddingHorizontal: spacing.md }]}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by city, state, or zip..."
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderStore}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        testID="store-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  searchContainer: {
    marginBottom: 8,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  centeredMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
});
