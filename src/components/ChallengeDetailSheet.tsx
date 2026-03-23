/**
 * @module ChallengeDetailSheet
 *
 * Bottom-sheet modal showing full details for a gamification challenge:
 * title, reward, description, progress percentage, and countdown.
 * Dismissible via close button or backdrop tap.
 */
import React, { memo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/theme';
import type { Challenge } from '@/data/challenges';

interface Props {
  visible: boolean;
  challenge: Challenge | null;
  onClose: () => void;
  testID?: string;
}

function formatDetailCountdown(expiresAt: number, now: number): string {
  const ms = expiresAt - now;
  if (ms <= 0) return 'Expired';
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `Ends in ${days}d ${hours}h`;
  return `Ends in ${totalHours}h`;
}

export const ChallengeDetailSheet = memo(function ChallengeDetailSheet({
  visible,
  challenge,
  onClose,
  testID = 'challenge-detail-sheet',
}: Props) {
  const { colors, spacing, borderRadius } = useTheme();

  if (!challenge) return null;

  const { title, description, reward, progress, expiresAt, isActive } = challenge;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const percentage = Math.round(clampedProgress * 100);
  const countdown = formatDetailCountdown(expiresAt, Date.now());

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
        testID="challenge-detail-backdrop"
        accessibilityLabel="Close challenge details"
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.espresso,
            borderTopLeftRadius: borderRadius.card * 2,
            borderTopRightRadius: borderRadius.card * 2,
          },
        ]}
        onStartShouldSetResponder={() => true}
      >
        {/* Drag handle */}
        <View
          style={[styles.handle, { backgroundColor: colors.espressoLight }]}
          accessible={false}
        />

        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: colors.sandBase }]}
              testID="challenge-detail-title"
              numberOfLines={2}
            >
              {title}
            </Text>
            {isActive && (
              <View
                testID="challenge-detail-active-badge"
                style={[
                  styles.activeBadge,
                  { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.pill },
                ]}
              >
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.reward, { color: colors.sunsetCoral }]}
            testID="challenge-detail-reward"
          >
            {reward}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          {/* Description */}
          <Text
            style={[styles.description, { color: colors.mountainBlueLight }]}
            testID="challenge-detail-description"
          >
            {description}
          </Text>

          {/* Progress label */}
          <Text
            style={[styles.progressLabel, { color: colors.sandBase }]}
            testID="challenge-detail-progress-label"
          >
            {`${percentage}% complete`}
          </Text>

          {/* Progress bar */}
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: colors.espressoLight, borderRadius: borderRadius.pill },
            ]}
            testID="challenge-detail-progress-bar"
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: percentage }}
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
            style={[styles.countdown, { color: colors.mountainBlueLight }]}
            testID="challenge-detail-countdown"
          >
            {countdown}
          </Text>
        </ScrollView>

        {/* Close button */}
        <TouchableOpacity
          style={[
            styles.closeBtn,
            {
              borderColor: colors.espressoLight,
              borderRadius: borderRadius.pill,
              marginHorizontal: spacing.lg,
              marginBottom: spacing.xl,
            },
          ]}
          onPress={onClose}
          testID="challenge-detail-close"
          accessibilityRole="button"
          accessibilityLabel="Close challenge details"
        >
          <Text style={[styles.closeBtnText, { color: colors.sandBase }]}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  reward: {
    fontSize: 15,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressTrack: {
    height: 6,
    width: '100%',
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  countdown: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'right',
  },
  closeBtn: {
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
