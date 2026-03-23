/**
 * @module ChallengeCard
 *
 * Gamification challenge card showing title, reward, progress bar, and countdown.
 * Used in the ChallengesRail on HomeScreen.
 */
import React, { memo, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import type { Challenge } from '@/data/challenges';

const CARD_WIDTH = 160;
const PROGRESS_DURATION_MS = 600;

interface Props {
  challenge: Challenge;
  onPress?: (id: string) => void;
}

function formatCountdown(expiresAt: number, now: number): string {
  const ms = expiresAt - now;
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export const ChallengeCard = memo(function ChallengeCard({ challenge, onPress }: Props) {
  const { colors, spacing, borderRadius } = useTheme();
  const { id, title, description, reward, progress, expiresAt, isActive } = challenge;

  const countdown = useMemo(() => formatCountdown(expiresAt, Date.now()), [expiresAt]);

  const clampedProgress = Math.min(1, Math.max(0, progress));
  const isCompleted = clampedProgress >= 1;

  const animatedProgress = useSharedValue(clampedProgress);

  useEffect(() => {
    animatedProgress.value = withTiming(clampedProgress, {
      duration: PROGRESS_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [clampedProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  return (
    <TouchableOpacity
      testID={`challenge-card-${id}`}
      style={[
        styles.card,
        {
          backgroundColor: colors.espresso,
          borderRadius: borderRadius.card,
          padding: spacing.md,
        },
      ]}
      onPress={() => onPress?.(id)}
      accessibilityRole="button"
      accessibilityLabel={`${title} — ${reward}`}
    >
      {/* Header row: reward + active badge */}
      <View style={styles.headerRow}>
        <Text style={[styles.reward, { color: colors.sunsetCoral }]}>{reward}</Text>
        {isActive && (
          <View
            testID={`challenge-active-badge-${id}`}
            style={[
              styles.activeBadge,
              { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.pill },
            ]}
          >
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.sandBase }]} numberOfLines={1}>
        {title}
      </Text>

      {/* Description */}
      <Text style={[styles.description, { color: colors.mountainBlueLight }]} numberOfLines={2}>
        {description}
      </Text>

      {/* Progress bar */}
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: colors.espressoLight, borderRadius: borderRadius.pill },
        ]}
        testID={`challenge-progress-${id}`}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(clampedProgress * 100) }}
      >
        <Animated.View
          testID={`challenge-progress-fill-${id}`}
          style={[
            styles.progressFill,
            fillStyle,
            {
              backgroundColor: isCompleted ? colors.sunsetCoral : colors.mountainBlue,
              borderRadius: borderRadius.pill,
            },
          ]}
        />
      </View>

      {/* Completion checkmark + reward earned label */}
      {isCompleted && (
        <View testID={`challenge-complete-check-${id}`} style={styles.completionRow}>
          <View
            style={[
              styles.checkCircle,
              { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.pill },
            ]}
          >
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <Text style={[styles.rewardEarned, { color: colors.sunsetCoral }]}>Reward earned!</Text>
        </View>
      )}

      {/* Countdown */}
      <Text
        testID={`challenge-countdown-${id}`}
        style={[
          styles.countdown,
          { color: isCompleted ? colors.sunsetCoral : colors.mountainBlueLight },
        ]}
      >
        {isCompleted ? 'Completed!' : countdown}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reward: {
    fontSize: 13,
    fontWeight: '700',
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
  },
  progressTrack: {
    height: 4,
    width: '100%',
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  checkCircle: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 11,
  },
  rewardEarned: {
    fontSize: 11,
    fontWeight: '600',
  },
  countdown: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
  },
});
