/**
 * @module ActivityFeedScreen
 *
 * Paginated loyalty event history. Infinite scroll (20 items/page),
 * filter chips (All / Points / Streaks / Quests / Challenges),
 * loading / error / empty states.
 *
 * API: POST /_functions/getMyActivity (cf-2h8 / web PR #750)
 *
 * cf-2h8
 */

import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/theme';
import { useActivityFeed, type ActivityFilter, type ActivityEvent } from '@/hooks/useActivityFeed';
import { ActivityFeedRow } from '@/components/ActivityFeedRow';

const FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'points', label: 'Points' },
  { key: 'streaks', label: 'Streaks' },
  { key: 'quests', label: 'Quests' },
  { key: 'challenges', label: 'Challenges' },
];

export function ActivityFeedScreen() {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all');
  const { events, loading, error, hasMore, loadMore, refresh } = useActivityFeed(activeFilter);

  const handleFilterPress = useCallback((key: ActivityFilter) => {
    setActiveFilter(key);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ActivityEvent }) => <ActivityFeedRow event={item} />,
    [],
  );

  const keyExtractor = useCallback((item: ActivityEvent) => item.id, []);

  const ListFooter = () => {
    if (!hasMore) return null;
    return (
      <View testID="activity-feed-load-more" style={styles.footer}>
        <ActivityIndicator size="small" color={colors.mountainBlueLight} />
      </View>
    );
  };

  return (
    <View
      testID="activity-feed-screen"
      style={[styles.screen, { backgroundColor: colors.espresso }]}
    >
      {/* Header */}
      <Text
        style={[
          styles.heading,
          { color: colors.sandBase, fontFamily: typography.headingFamily, marginTop: spacing.lg, marginHorizontal: spacing.lg },
        ]}
      >
        Activity
      </Text>

      {/* Filter chips */}
      <View style={[styles.chips, { paddingHorizontal: spacing.lg, marginTop: spacing.sm }]}>
        {FILTERS.map(({ key, label }) => {
          const selected = activeFilter === key;
          return (
            <TouchableOpacity
              key={key}
              testID={`filter-chip-${key}`}
              onPress={() => handleFilterPress(key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                {
                  borderRadius: borderRadius.pill,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 6,
                  backgroundColor: selected ? colors.mountainBlueDark : colors.espressoLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selected ? colors.sandBase : colors.mountainBlueLight },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Loading (initial) */}
      {loading && events.length === 0 && (
        <View testID="activity-feed-loading" style={styles.centered}>
          <ActivityIndicator size="large" color={colors.mountainBlueLight} />
        </View>
      )}

      {/* Error */}
      {!loading && error && events.length === 0 && (
        <View testID="activity-feed-error" style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.mountainBlueLight }]}>{error}</Text>
          <TouchableOpacity
            testID="activity-feed-retry"
            onPress={refresh}
            style={[
              styles.retryBtn,
              { backgroundColor: colors.mountainBlueDark, borderRadius: borderRadius.sm, marginTop: spacing.sm },
            ]}
          >
            <Text style={[styles.retryText, { color: colors.sandBase }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty */}
      {!loading && !error && events.length === 0 && (
        <View style={styles.centered}>
          <Text testID="activity-feed-empty" style={[styles.emptyText, { color: colors.mountainBlueLight }]}>
            No activity yet — start earning points!
          </Text>
        </View>
      )}

      {/* List */}
      {events.length > 0 && (
        <FlatList
          data={events}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={<ListFooter />}
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xl }}
          style={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {},
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
