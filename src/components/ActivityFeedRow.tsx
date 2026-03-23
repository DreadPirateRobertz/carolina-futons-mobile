/**
 * @module ActivityFeedRow
 *
 * Single row in the Activity Feed: event type icon, description,
 * points badge, and relative date.
 *
 * cf-2h8
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import type { ActivityEvent, ActivityEventType } from '@/hooks/useActivityFeed';

interface Props {
  event: ActivityEvent;
}

const TYPE_ICONS: Record<ActivityEventType, string> = {
  purchase: '🛒',
  review: '⭐',
  referral: '🤝',
  challenge_complete: '🏆',
  streak_milestone: '🔥',
  daily_quest: '✅',
};

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ActivityFeedRow({ event }: Props) {
  const { colors, spacing, borderRadius } = useTheme();
  const { id, type, description, points, earnedAt } = event;
  const icon = TYPE_ICONS[type] ?? '•';

  return (
    <View
      testID={`activity-feed-row-${id}`}
      accessibilityLabel={`${description}, +${points} pts`}
      style={[styles.row, { paddingVertical: spacing.sm, paddingHorizontal: spacing.md }]}
    >
      {/* Icon */}
      <View
        testID={`activity-feed-icon-${id}`}
        style={[
          styles.iconWrap,
          { backgroundColor: colors.espressoLight, borderRadius: borderRadius.pill },
        ]}
      >
        <Text style={styles.icon}>{icon}</Text>
      </View>

      {/* Description + date */}
      <View style={styles.body}>
        <Text
          style={[styles.description, { color: colors.sandBase }]}
          numberOfLines={2}
        >
          {description}
        </Text>
        <Text
          testID={`activity-feed-date-${id}`}
          style={[styles.date, { color: colors.mountainBlueLight }]}
        >
          {formatDate(earnedAt)}
        </Text>
      </View>

      {/* Points badge */}
      <View
        testID={`activity-feed-points-${id}`}
        style={[
          styles.pointsBadge,
          { backgroundColor: colors.mountainBlueDark, borderRadius: borderRadius.pill, paddingHorizontal: spacing.xs },
        ]}
      >
        <Text style={[styles.pointsText, { color: colors.sandBase }]}>
          {`+${points} pts`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
  },
  pointsBadge: {
    paddingVertical: 3,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
