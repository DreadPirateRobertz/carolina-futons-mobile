/**
 * @module PointsHistoryScreen
 *
 * Feed of recent points events. Shows icon, description, points earned,
 * and relative date for each event. Loading / empty / error states included.
 *
 * Uses mock data until getMyActivity webMethod ships (cf-backend-activity).
 *
 * cf-g4r / Phase 7
 */

import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/theme';
import { usePointsHistory, type PointsEvent } from '@/hooks/usePointsHistory';

// ── Icon map ──────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<PointsEvent['type'], string> = {
  purchase: '🛒',
  review: '⭐',
  referral: '🤝',
  challenge_complete: '🏆',
  streak_milestone: '🔥',
  daily_quest: '✅',
};

// ── Relative date ─────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  testID?: string;
}

export function PointsHistoryScreen({ testID }: Props) {
  const { colors, spacing, typography } = useTheme();
  const { events, loading, error, refresh } = usePointsHistory();

  const renderItem = useCallback(
    ({ item }: { item: PointsEvent }) => (
      <View
        style={[styles.row, { borderBottomColor: colors.sandDark }]}
        testID={`points-event-row-${item.id}`}
      >
        <Text
          style={styles.icon}
          testID={`points-event-icon-${item.id}`}
          accessibilityRole="image"
          accessibilityLabel=""
        >
          {TYPE_ICON[item.type] ?? '✨'}
        </Text>
        <View style={styles.rowBody}>
          <Text
            style={[
              styles.description,
              { color: colors.espresso, fontFamily: typography.bodyFamily },
            ]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
          <Text
            style={[
              styles.date,
              { color: colors.espressoLight, fontFamily: typography.bodyFamily },
            ]}
          >
            {relativeDate(item.earnedAt)}
          </Text>
        </View>
        <Text
          style={[
            styles.points,
            { color: colors.mountainBlue, fontFamily: typography.bodyFamilyBold },
          ]}
          testID={`points-event-points-${item.id}`}
        >
          {`+${item.points} pts`}
        </Text>
      </View>
    ),
    [colors, typography],
  );

  const keyExtractor = useCallback((item: PointsEvent) => item.id, []);

  if (loading) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'points-history-screen'}
      >
        <ActivityIndicator
          size="large"
          color={colors.sunsetCoral}
          testID="points-history-loading"
        />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'points-history-screen'}
      >
        <Text
          style={[
            styles.errorText,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
          testID="points-history-error"
        >
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.sunsetCoral }]}
          onPress={refresh}
          testID="points-history-retry"
          accessibilityRole="button"
          accessibilityLabel="Retry loading points history"
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'points-history-screen'}
      >
        <Text
          style={[
            styles.emptyText,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
          testID="points-history-empty"
        >
          No points activity yet.{'\n'}Start shopping to earn points!
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'points-history-screen'}
    >
      <Text
        style={[
          styles.heading,
          {
            color: colors.espresso,
            fontFamily: typography.bodyFamilyBold,
            paddingHorizontal: spacing.lg,
          },
        ]}
      >
        Points History
      </Text>
      <FlatList
        data={events}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        testID="points-history-list"
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
        windowSize={7}
        maxToRenderPerBatch={10}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 32 },
  heading: { fontSize: 18, fontWeight: '700', marginTop: 20, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  icon: { fontSize: 22, width: 32, textAlign: 'center' },
  rowBody: { flex: 1 },
  description: { fontSize: 14 },
  date: { fontSize: 12, marginTop: 2 },
  points: { fontSize: 14 },
  errorText: { fontSize: 15, textAlign: 'center', marginBottom: 20 },
  retryButton: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 24 },
});
