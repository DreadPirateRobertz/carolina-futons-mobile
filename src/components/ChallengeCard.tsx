/**
 * @module ChallengeCard
 *
 * Gamification challenge card showing title, reward, progress bar, and countdown.
 * Used in the ChallengesRail on HomeScreen.
 */
import React, { memo, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import type { Challenge } from '@/data/challenges';

const CARD_WIDTH = 160;

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
        <View
          style={[
            styles.progressFill,
            {
              width: `${clampedProgress * 100}%`,
              backgroundColor: colors.mountainBlue,
              borderRadius: borderRadius.pill,
            },
          ]}
        />
      </View>

      {/* Countdown */}
      <Text
        testID={`challenge-countdown-${id}`}
        style={[styles.countdown, { color: colors.mountainBlueLight }]}
      >
        {countdown}
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
  countdown: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
  },
});
