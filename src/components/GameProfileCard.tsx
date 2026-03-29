/**
 * @module GameProfileCard
 *
 * Hero widget for Profile/Member screen.
 * Displays current streak (with fire icon), leaderboard rank, total points,
 * and tier badge. Per-slice loading skeletons.
 *
 * Tap streak → StreakDetail bottom sheet.
 * Tap rank   → onNavigateToLeaderboard callback.
 * Tap points → onNavigateToPointsHistory callback.
 *
 * Zero-streak hides the streak chip entirely.
 *
 * cf-zlp
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { useGameProfile } from '@/hooks/useGameProfile';
import type { LoyaltyTier } from '@/hooks/useLoyalty';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface GameProfileCardProps {
  onNavigateToLeaderboard?: () => void;
  onNavigateToPointsHistory?: () => void;
  testID?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<LoyaltyTier, string> = {
  bronze: '#CD7F32',
  silver: '#A8A9AD',
  gold: '#FFD700',
};

const TIER_LABELS: Record<LoyaltyTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonBar({ testID }: { testID: string }) {
  return <View testID={testID} style={styles.skeleton} />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GameProfileCard({
  onNavigateToLeaderboard,
  onNavigateToPointsHistory,
  testID,
}: GameProfileCardProps) {
  const { colors, spacing, borderRadius } = useTheme();
  const {
    streakDays,
    streakStartDate,
    nextMilestoneDays,
    rank,
    totalPoints,
    tier,
    streakLoading,
    rankLoading,
    pointsLoading,
  } = useGameProfile();

  const [streakSheetOpen, setStreakSheetOpen] = useState(false);

  const openStreakSheet = useCallback(() => setStreakSheetOpen(true), []);
  const closeStreakSheet = useCallback(() => setStreakSheetOpen(false), []);

  return (
    <View
      testID={testID ?? 'game-profile-card'}
      style={[
        styles.card,
        {
          backgroundColor: darkPalette.surfaceElevated,
          borderRadius: borderRadius.card,
          padding: spacing.md,
        },
      ]}
    >
      {/* ── Row of chips ─────────────────────────────────────────────────── */}
      <View style={styles.row}>
        {/* Streak chip */}
        {streakLoading ? (
          <SkeletonBar testID="streak-loading" />
        ) : streakDays > 0 ? (
          <TouchableOpacity
            testID="streak-chip"
            onPress={openStreakSheet}
            accessibilityLabel={`${streakDays}-day streak, tap for details`}
            accessibilityRole="button"
            style={[
              styles.chip,
              {
                backgroundColor: darkPalette.surface,
                borderRadius: borderRadius.md,
                borderColor: '#FF6B35',
              },
            ]}
            activeOpacity={0.7}
          >
            <Text style={styles.chipIcon}>🔥</Text>
            <Text testID="streak-days" style={[styles.chipValue, { color: '#FF6B35' }]}>
              {streakDays}
            </Text>
            <Text style={[styles.chipLabel, { color: darkPalette.textMuted }]}>days</Text>
          </TouchableOpacity>
        ) : null}

        {/* Rank chip */}
        {rankLoading ? (
          <SkeletonBar testID="rank-loading" />
        ) : (
          <TouchableOpacity
            testID="rank-chip"
            onPress={onNavigateToLeaderboard}
            accessibilityLabel={`Leaderboard rank ${rank ?? 'unranked'}, tap to view`}
            accessibilityRole="button"
            style={[
              styles.chip,
              {
                backgroundColor: darkPalette.surface,
                borderRadius: borderRadius.md,
                borderColor: colors.mountainBlue,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text style={styles.chipIcon}>🏆</Text>
            <Text style={[styles.chipLabel, { color: darkPalette.textMuted }]}>#</Text>
            <Text testID="rank-value" style={[styles.chipValue, { color: colors.mountainBlue }]}>
              {rank ?? '—'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Points chip */}
        {pointsLoading ? (
          <SkeletonBar testID="points-loading" />
        ) : (
          <TouchableOpacity
            testID="points-chip"
            onPress={onNavigateToPointsHistory}
            accessibilityLabel={`${totalPoints} points, ${TIER_LABELS[tier]} tier, tap to view history`}
            accessibilityRole="button"
            style={[
              styles.chip,
              {
                backgroundColor: darkPalette.surface,
                borderRadius: borderRadius.md,
                borderColor: TIER_COLORS[tier],
              },
            ]}
            activeOpacity={0.7}
          >
            <Text style={styles.chipIcon}>⭐</Text>
            <Text testID="points-value" style={[styles.chipValue, { color: TIER_COLORS[tier] }]}>
              {totalPoints}
            </Text>
            <Text style={[styles.chipLabel, { color: darkPalette.textMuted }]}>pts</Text>
          </TouchableOpacity>
        )}

        {/* Tier badge */}
        <View
          testID="tier-badge"
          accessibilityLabel={`${TIER_LABELS[tier]} tier`}
          style={[
            styles.tierBadge,
            {
              backgroundColor: darkPalette.surface,
              borderRadius: borderRadius.pill,
              borderColor: TIER_COLORS[tier],
            },
          ]}
        >
          <Text style={[styles.tierLabel, { color: TIER_COLORS[tier] }]}>{TIER_LABELS[tier]}</Text>
        </View>
      </View>

      {/* ── Streak detail bottom sheet ────────────────────────────────────── */}
      {streakSheetOpen && (
        <Modal
          testID="streak-sheet"
          visible
          transparent
          animationType="slide"
          onRequestClose={closeStreakSheet}
        >
          <View style={styles.sheetOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              onPress={closeStreakSheet}
              activeOpacity={1}
            />
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: darkPalette.surfaceElevated,
                  borderRadius: borderRadius.xl ?? 16,
                  padding: spacing.lg,
                },
              ]}
            >
              <Text style={styles.sheetEmoji}>🔥</Text>
              <Text style={[styles.sheetTitle, { color: darkPalette.textPrimary }]}>
                {streakDays}-Day Streak
              </Text>
              {streakStartDate ? (
                <Text
                  testID="streak-sheet-start-date"
                  style={[styles.sheetDetail, { color: darkPalette.textMuted }]}
                >
                  Started: {formatDate(streakStartDate)}
                </Text>
              ) : null}
              <Text
                testID="streak-sheet-next-milestone"
                style={[styles.sheetDetail, { color: colors.mountainBlueLight }]}
              >
                Next milestone: {nextMilestoneDays} days
              </Text>
              <TouchableOpacity
                testID="streak-sheet-close"
                onPress={closeStreakSheet}
                accessibilityLabel="Close streak details"
                accessibilityRole="button"
                style={[
                  styles.closeBtn,
                  {
                    backgroundColor: colors.mountainBlue,
                    borderRadius: borderRadius.button,
                    marginTop: spacing.md,
                  },
                ]}
              >
                <Text style={[styles.closeBtnLabel, { color: darkPalette.textPrimary }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 4,
  },
  chipIcon: {
    fontSize: 16,
  },
  chipValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  skeleton: {
    width: 80,
    height: 42,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  // Bottom sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  sheetEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  sheetDetail: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  closeBtn: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
