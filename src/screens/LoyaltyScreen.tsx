/**
 * @module LoyaltyScreen
 *
 * Displays the current member's loyalty points balance and tier badge.
 * Transaction history is not available via the webMethod — points/tier only.
 *
 * Points are session-scoped (memberId from WixAuthService.getCurrentMember()).
 * No user-supplied memberId — no IDOR risk.
 */

import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme';
import { useLoyalty } from '@/hooks/useLoyalty';
import { useStreak } from '@/hooks/useStreak';
import { emitStreakExtended } from '@/services/crossRigEventBus';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';
import { captureException } from '@/services/crashReporting';
import { LoyaltyBadge } from '@/components/LoyaltyBadge';

/** Module-level flag to prevent duplicate streak emissions across remounts. */
let streakEmittedThisSession = false;

/** @internal Test-only reset for module-level emission state. */
export function __resetStreakEmitState() {
  streakEmittedThisSession = false;
}

export type LoyaltyInitialTab = 'streak' | 'quests' | 'spin';

interface Props {
  testID?: string;
  onClose?: () => void;
  initialTab?: LoyaltyInitialTab;
}

const TIER_NEXT: Record<string, { label: string; threshold: number } | null> = {
  bronze: { label: 'Silver', threshold: 1000 },
  silver: { label: 'Gold', threshold: 5000 },
  gold: null,
};

export function LoyaltyScreen({ testID, onClose: _onClose }: Props) {
  const { colors, spacing, typography } = useTheme();
  const { points, tier, loading, error, refreshPoints } = useLoyalty();
  const { streak, loading: streakLoading, wasExtendedToday } = useStreak();

  useEffect(() => {
    if (streakLoading || !wasExtendedToday || streakEmittedThisSession) return;
    streakEmittedThisSession = true;
    try {
      const client = getWixClientSingleton();
      emitStreakExtended(client, { streak, delta: 1, newTotal: points })
        .catch((err: unknown) => captureException(err instanceof Error ? err : new Error(String(err))));
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)));
    }
  }, [wasExtendedToday, streakLoading, streak, points]);

  if (loading) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'loyalty-screen'}
      >
        <ActivityIndicator size="large" color={colors.sunsetCoral} testID="loyalty-loading" />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'loyalty-screen'}
      >
        <Text
          style={[
            styles.errorText,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
          testID="loyalty-error"
        >
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.sunsetCoral }]}
          onPress={refreshPoints}
          testID="loyalty-retry"
          accessibilityRole="button"
        >
          <Text style={[styles.retryText, { fontFamily: typography.bodyFamilyBold }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nextTier = TIER_NEXT[tier];
  const progressPct = nextTier
    ? Math.min(100, Math.round((points / nextTier.threshold) * 100))
    : 100;

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'loyalty-screen'}
    >
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <Text
          style={[styles.points, { color: colors.espresso, fontFamily: typography.headingFamily }]}
          testID="loyalty-points"
        >
          {points}
        </Text>
        <Text
          style={[
            styles.pointsLabel,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
        >
          points
        </Text>
        <LoyaltyBadge tier={tier} testID="loyalty-tier-badge" />
        {nextTier && (
          <View style={styles.progressWrap} testID="loyalty-progress">
            <View style={[styles.progressTrack, { backgroundColor: colors.sandDark }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.mountainBlue,
                    width: `${progressPct}%` as `${number}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.progressLabel,
                { color: colors.espressoLight, fontFamily: typography.bodyFamily },
              ]}
            >
              {points} / {nextTier.threshold} to {nextTier.label}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: colors.espressoLight,
            fontFamily: typography.bodyFamilyBold,
            paddingHorizontal: spacing.lg,
          },
        ]}
      >
        Activity
      </Text>
      <View style={styles.emptyTx}>
        <Text
          style={[
            styles.emptyText,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
          testID="loyalty-no-transactions"
        >
          No transactions yet. Earn points by shopping!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 40, paddingBottom: 20, alignItems: 'center' },
  points: { fontSize: 64, fontWeight: '700', lineHeight: 72 },
  pointsLabel: { fontSize: 16, marginBottom: 16 },
  progressWrap: { width: '100%', marginTop: 16 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: 12, marginTop: 6, textAlign: 'center' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  emptyTx: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  errorText: { fontSize: 15, textAlign: 'center', marginHorizontal: 32, marginBottom: 20 },
  retryButton: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
