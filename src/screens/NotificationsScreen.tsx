/**
 * @module NotificationsScreen
 *
 * In-app gamification alerts feed.
 * Displays a FlatList of streak milestones, daily quests, challenge completions,
 * and referral rewards. Unread items show a dot badge. Header includes a
 * "Mark all read" button.
 *
 * cf-tuz
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  useGamificationFeed,
  type GamificationNotification,
  type GamificationNotificationType,
} from '@/hooks/useGamificationFeed';

interface Props {
  testID?: string;
  /** Called when a notification row is tapped. Used for deep-linking to related content. */
  onNotificationPress?: (notification: GamificationNotification) => void;
  /** Called when the delete button on a row is pressed. */
  onDeleteNotification?: (id: string) => void;
}

// ─── Icon map ────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<GamificationNotificationType, string> = {
  streak_milestone: '🔥',
  daily_quest: '✅',
  challenge_complete: '🏆',
  referral: '🤝',
};

// ─── Relative time ───────────────────────────────────────────────────────────

function relativeTime(createdAt: number): string {
  const diffMs = Date.now() - createdAt;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

// ─── Row component ───────────────────────────────────────────────────────────

interface RowProps {
  item: GamificationNotification;
  onPress?: () => void;
  onDelete?: () => void;
}

function NotificationRow({ item, onPress, onDelete }: RowProps) {
  const { colors, spacing, typography } = useTheme();
  return (
    <TouchableOpacity
      testID={`notification-row-${item.id}`}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[
        styles.row,
        {
          backgroundColor: item.read ? colors.sandBase : colors.sandLight,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
      ]}
    >
      {/* Icon */}
      <Text
        testID={`notification-icon-${item.id}`}
        style={[styles.icon, { fontFamily: typography.bodyFamily }]}
        accessibilityLabel={item.type}
      >
        {TYPE_ICON[item.type] ?? '🔔'}
      </Text>

      {/* Message + time */}
      <View style={styles.content}>
        <Text
          style={[styles.message, { color: colors.espresso, fontFamily: typography.bodyFamily }]}
          numberOfLines={2}
        >
          {item.message}
        </Text>
        <Text
          testID={`notification-time-${item.id}`}
          style={[styles.time, { color: colors.espressoLight, fontFamily: typography.bodyFamily }]}
        >
          {relativeTime(item.createdAt)}
        </Text>
      </View>

      {/* Unread dot */}
      {!item.read && (
        <View
          testID={`unread-dot-${item.id}`}
          style={[styles.unreadDot, { backgroundColor: colors.sunsetCoral }]}
        />
      )}

      {/* Delete button */}
      {onDelete && (
        <TouchableOpacity
          testID={`notification-delete-btn-${item.id}`}
          onPress={onDelete}
          accessibilityLabel="Delete notification"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.deleteBtn}
        >
          <Text style={[styles.deleteBtnText, { color: colors.muted }]}>×</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function NotificationsScreen({ testID, onNotificationPress, onDeleteNotification }: Props) {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { notifications, loading, error, markAllRead, refresh } = useGamificationFeed();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderItem = useCallback(
    ({ item }: { item: GamificationNotification }) => (
      <NotificationRow
        item={item}
        onPress={onNotificationPress ? () => onNotificationPress(item) : undefined}
        onDelete={onDeleteNotification ? () => onDeleteNotification(item.id) : undefined}
      />
    ),
    [onNotificationPress, onDeleteNotification],
  );

  const keyExtractor = useCallback((item: GamificationNotification) => item.id, []);

  if (loading && notifications.length === 0) {
    return (
      <View
        testID={testID ?? 'notifications-screen'}
        style={[styles.centered, { backgroundColor: colors.sandBase, paddingTop: insets.top }]}
      >
        <ActivityIndicator testID="notifications-loading" size="large" color={colors.sunsetCoral} />
      </View>
    );
  }

  return (
    <View
      testID={testID ?? 'notifications-screen'}
      style={[styles.root, { backgroundColor: colors.sandBase, paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.md, paddingBottom: spacing.sm }]}>
        <View style={styles.headerTitleRow}>
          <Text
            style={[
              styles.headerTitle,
              { color: colors.espresso, fontFamily: typography.headingFamily },
            ]}
          >
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View
              testID="notification-badge-count"
              style={[styles.badge, { backgroundColor: colors.sunsetCoral }]}
              accessibilityLabel={`${unreadCount} unread`}
            >
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          testID="mark-all-read-btn"
          onPress={markAllRead}
          accessibilityLabel="Mark all notifications as read"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text
            style={[
              styles.markAllText,
              { color: colors.sunsetCoral, fontFamily: typography.bodyFamily },
            ]}
          >
            Mark all read
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error banner (shows above stale list) */}
      {error && (
        <View
          testID="notifications-error"
          style={[styles.errorBanner, { backgroundColor: colors.sandLight, padding: spacing.sm }]}
        >
          <Text
            style={[
              styles.errorText,
              { color: colors.espresso, fontFamily: typography.bodyFamily },
            ]}
          >
            Couldn't load notifications.
          </Text>
          <TouchableOpacity
            testID="notifications-retry-btn"
            onPress={refresh}
            accessibilityLabel="Retry loading notifications"
          >
            <Text style={[styles.retryText, { color: colors.sunsetCoral }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List / empty */}
      <FlatList
        testID="notifications-list"
        data={notifications}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onRefresh={refresh}
        refreshing={loading}
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyContainer : { paddingBottom: insets.bottom }
        }
        ListEmptyComponent={
          !loading ? (
            <View testID="notifications-empty" style={styles.emptyInner}>
              <Text
                style={[
                  styles.emptyText,
                  { color: colors.espressoLight, fontFamily: typography.bodyFamily },
                ]}
              >
                No notifications yet — keep up your streak!
              </Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.sandDark }]} />
        )}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  badge: {
    marginLeft: 8,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  markAllText: { fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  deleteBtn: { marginLeft: 8, padding: 4 },
  deleteBtnText: { fontSize: 18, fontWeight: '700' },
  icon: { fontSize: 22, width: 36, textAlign: 'center' },
  content: { flex: 1, marginLeft: 8 },
  message: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 12, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  separator: { height: 1 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { fontSize: 13 },
  retryText: { fontSize: 13, fontWeight: '600' },
  emptyContainer: { flex: 1 },
  emptyInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
