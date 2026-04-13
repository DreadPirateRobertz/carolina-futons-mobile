/**
 * LeaderboardScreen — cf-op6
 *
 * Displays the loyalty leaderboard with weekly / all-time toggle,
 * pull-to-refresh, loading/error/empty states, and current-user rank footer.
 */

import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import type { LeaderboardEntry, LeaderboardPeriod } from '@/hooks/useLeaderboard';
import { LeaderboardRow } from '@/components/LeaderboardRow';
import { SkeletonGrid } from '@/components/Skeleton';

export interface LeaderboardScreenProps {
  testID?: string;
}

export function LeaderboardScreen({ testID }: LeaderboardScreenProps) {
  const { colors, spacing, borderRadius } = useTheme();
  const { entries, currentUserRank, period, loading, error, refresh, setPeriod } = useLeaderboard();

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const renderItem = React.useCallback(
    ({ item }: { item: LeaderboardEntry }) => (
      <LeaderboardRow
        rank={item.rank}
        nickname={item.displayName ?? 'CF Member'}
        points={item.points}
        tier={item.tier}
        isCurrentUser={item.rank === currentUserRank}
        testID={`leaderboard-row-${item.rank}`}
      />
    ),
    [currentUserRank],
  );

  return (
    <View
      testID={testID ?? 'leaderboard-screen'}
      style={[styles.container, { backgroundColor: darkPalette.background }]}
    >
      {/* Period toggle */}
      <View style={[styles.toggle, { marginBottom: spacing.md }]}>
        {(['allTime', 'weekly'] as LeaderboardPeriod[]).map((p) => (
          <TouchableOpacity
            key={p}
            testID={`toggle-${p}`}
            onPress={() => setPeriod(p)}
            style={[
              styles.toggleBtn,
              {
                backgroundColor: period === p ? colors.mountainBlue : darkPalette.surface,
                borderRadius: borderRadius.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
              },
            ]}
          >
            <Text
              style={[
                styles.toggleLabel,
                {
                  color: period === p ? darkPalette.textPrimary : darkPalette.textMuted,
                },
              ]}
            >
              {p === 'allTime' ? 'All Time' : 'Weekly'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loading */}
      {loading && (
        <SkeletonGrid
          testID="leaderboard-loading"
          rows={5}
          columns={1}
          cardHeader
          cardLines={1}
          style={{ paddingHorizontal: spacing.md }}
        />
      )}

      {/* Error */}
      {!loading && error && (
        <View testID="leaderboard-error" style={styles.centered}>
          <Text style={[styles.message, { color: colors.sunsetCoral }]}>{error}</Text>
          <TouchableOpacity
            testID="leaderboard-retry"
            onPress={refresh}
            style={[
              styles.retryBtn,
              {
                backgroundColor: colors.sunsetCoral,
                borderRadius: borderRadius.sm,
                marginTop: spacing.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
              },
            ]}
          >
            <Text style={[styles.retryLabel, { color: darkPalette.textPrimary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty */}
      {!loading && !error && entries.length === 0 && (
        <View testID="leaderboard-empty" style={styles.centered}>
          <Text style={[styles.message, { color: darkPalette.textMuted }]}>
            No leaderboard data yet.
          </Text>
        </View>
      )}

      {/* List */}
      {!loading && !error && entries.length > 0 && (
        <FlatList
          testID="leaderboard-list"
          data={entries}
          keyExtractor={(item) => item.memberId}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: spacing.md }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.mountainBlue}
            />
          }
        />
      )}

      {/* Your rank footer */}
      {currentUserRank !== null && (
        <View
          testID="leaderboard-your-rank"
          style={[
            styles.footer,
            {
              backgroundColor: darkPalette.surface,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
            },
          ]}
        >
          <Text style={[styles.footerText, { color: darkPalette.textPrimary }]}>
            Your rank: #{currentUserRank}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggle: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
  },
  retryBtn: {
    alignItems: 'center',
  },
  retryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
