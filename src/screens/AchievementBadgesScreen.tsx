/**
 * AchievementBadgesScreen — cf-ljq
 *
 * 3-column grid of all streak achievement badges.
 * Earned badges show full color + earnedAt date.
 * Locked badges are desaturated.
 * Tapping any badge opens a bottom sheet with details.
 *
 * Uses mock data while cf-7sb (backend) is in-flight.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { useAchievements } from '@/hooks/useAchievements';
import type { Achievement } from '@/hooks/useAchievements';

// ── Badge catalog ─────────────────────────────────────────────────────────────

interface BadgeDef {
  milestone: number;
  label: string;
  emoji: string;
  description: string;
}

const BADGE_CATALOG: BadgeDef[] = [
  { milestone: 7, label: 'Week Warrior', emoji: '🏅', description: 'Reach a 7-day streak' },
  { milestone: 14, label: 'Fortnight Fighter', emoji: '🥇', description: 'Reach a 14-day streak' },
  { milestone: 30, label: 'Monthly Master', emoji: '🌟', description: 'Reach a 30-day streak' },
  { milestone: 60, label: 'Two Month Titan', emoji: '💫', description: 'Reach a 60-day streak' },
  { milestone: 100, label: 'Century Club', emoji: '🏆', description: 'Reach a 100-day streak' },
  {
    milestone: 365,
    label: 'Year-Round Legend',
    emoji: '👑',
    description: 'Reach a 365-day streak',
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface SelectedBadge {
  def: BadgeDef;
  achievement: Achievement | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ITEM_WIDTH = (Dimensions.get('window').width - 48) / 3;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function AchievementBadgesScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const { achievements, loading, error } = useAchievements();
  const [selected, setSelected] = useState<SelectedBadge | null>(null);

  const earnedMap = React.useMemo(() => {
    const map = new Map<number, Achievement>();
    for (const a of achievements) {
      if (a.earnedAt !== null) {
        map.set(a.milestone, a);
      }
    }
    return map;
  }, [achievements]);

  const handleBadgePress = useCallback(
    (def: BadgeDef) => {
      setSelected({ def, achievement: earnedMap.get(def.milestone) ?? null });
    },
    [earnedMap],
  );

  const handleClose = useCallback(() => setSelected(null), []);

  const renderBadge = useCallback(
    ({ item }: { item: BadgeDef }) => {
      const earned = earnedMap.get(item.milestone);
      const isEarned = earned !== undefined;
      return (
        <TouchableOpacity
          testID={`badge-card-${item.milestone}`}
          onPress={() => handleBadgePress(item)}
          style={[
            styles.badgeCard,
            {
              backgroundColor: isEarned ? darkPalette.surfaceElevated : darkPalette.surface,
              borderRadius: borderRadius.card,
              borderColor: isEarned ? colors.mountainBlue : darkPalette.borderSubtle,
              opacity: isEarned ? 1 : 0.5,
              width: ITEM_WIDTH,
            },
          ]}
          activeOpacity={0.7}
        >
          <Text style={styles.badgeEmoji}>{item.emoji}</Text>
          <Text
            style={[
              styles.badgeLabel,
              { color: isEarned ? darkPalette.textPrimary : darkPalette.textMuted },
            ]}
            numberOfLines={2}
          >
            {item.label}
          </Text>
          {isEarned && earned?.earnedAt && (
            <Text
              testID={`badge-date-${item.milestone}`}
              style={[styles.badgeDate, { color: colors.mountainBlueLight }]}
              numberOfLines={1}
            >
              {formatDate(earned.earnedAt)}
            </Text>
          )}
        </TouchableOpacity>
      );
    },
    [earnedMap, handleBadgePress, colors, borderRadius],
  );

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View
        testID="achievements-screen"
        style={[styles.centered, { backgroundColor: darkPalette.background }]}
      >
        <ActivityIndicator testID="achievements-loading" size="large" color={colors.mountainBlue} />
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <View
        testID="achievements-screen"
        style={[styles.centered, { backgroundColor: darkPalette.background }]}
      >
        <Text testID="achievements-error" style={[styles.errorText, { color: colors.sunsetCoral }]}>
          {error}
        </Text>
      </View>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────

  return (
    <View
      testID="achievements-screen"
      style={[styles.container, { backgroundColor: darkPalette.background }]}
    >
      <FlatList
        testID="badge-grid"
        data={BADGE_CATALOG}
        keyExtractor={(item) => String(item.milestone)}
        renderItem={renderBadge}
        numColumns={3}
        contentContainerStyle={{ padding: spacing.md }}
        columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
      />

      {/* Bottom sheet */}
      {selected !== null && (
        <Modal
          testID="badge-sheet"
          visible
          transparent
          animationType="slide"
          onRequestClose={handleClose}
        >
          <View style={styles.sheetOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              onPress={handleClose}
              activeOpacity={1}
            />
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: darkPalette.surfaceElevated,
                  borderRadius: borderRadius.lg ?? 16,
                  padding: spacing.lg,
                },
              ]}
            >
              <Text style={styles.sheetEmoji}>{selected.def.emoji}</Text>
              <Text
                testID="badge-sheet-title"
                style={[styles.sheetTitle, { color: darkPalette.textPrimary }]}
              >
                {selected.def.label}
              </Text>
              <Text
                testID="badge-sheet-description"
                style={[styles.sheetDesc, { color: darkPalette.textMuted }]}
              >
                {selected.achievement
                  ? `You reached a ${selected.def.milestone}-day streak!`
                  : selected.def.description}
              </Text>
              {selected.achievement?.earnedAt ? (
                <Text
                  testID="badge-sheet-date"
                  style={[styles.sheetDate, { color: colors.mountainBlueLight }]}
                >
                  Earned: {formatDate(selected.achievement.earnedAt)}
                </Text>
              ) : null}
              {selected.achievement === null ? (
                <Text
                  testID="badge-sheet-cta"
                  style={[styles.sheetCta, { color: colors.sunsetCoralLight }]}
                >
                  Keep your streak going!
                </Text>
              ) : null}
              <TouchableOpacity
                testID="badge-sheet-close"
                onPress={handleClose}
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
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
  },
  // Badge card
  badgeCard: {
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
  },
  badgeEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  badgeDate: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
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
    fontSize: 56,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  sheetDesc: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 4,
  },
  sheetDate: {
    fontSize: 13,
    marginTop: 8,
  },
  sheetCta: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
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
