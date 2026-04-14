/**
 * @module LoyaltyScreen
 *
 * Displays the current member's loyalty points balance and tier badge.
 * Transaction history is not available via the webMethod — points/tier only.
 *
 * Points are session-scoped (memberId from WixAuthService.getCurrentMember()).
 * No user-supplied memberId — no IDOR risk.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme';
import { useLoyalty } from '@/hooks/useLoyalty';
import type { LoyaltyTierConfig } from '@/data/loyaltyTiers';
import { useStreak } from '@/hooks/useStreak';
import { usePointsHistory, type PointsEvent } from '@/hooks/usePointsHistory';
import { useTierPerks, type TierPerk } from '@/hooks/useTierPerks';
import { emitStreakExtended, emitTierChanged } from '@/services/crossRigEventBus';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';
import { captureException } from '@/services/crashReporting';
import { LoyaltyBadge } from '@/components/LoyaltyBadge';
import { TierPerkCard } from '@/components/TierPerkCard';
import { SkeletonCard, SkeletonRow } from '@/components/Skeleton';

/** Module-level flag to prevent duplicate streak emissions across remounts. */
let streakEmittedThisSession = false;

/** Module-level flag to prevent duplicate tier-change emissions across remounts. */
let tierEmittedThisSession = false;

/** @internal Test-only reset for module-level emission state. */
export function __resetStreakEmitState() {
  streakEmittedThisSession = false;
}

/** @internal Test-only reset for tier emit state. */
export function __resetTierEmitState() {
  tierEmittedThisSession = false;
}

export type LoyaltyInitialTab = 'streak' | 'quests' | 'spin';

interface Props {
  testID?: string;
  onClose?: () => void;
  initialTab?: LoyaltyInitialTab;
}

/** Icon map matching PointsHistoryScreen. */
const ACTIVITY_ICON: Record<PointsEvent['type'], string> = {
  purchase: '🛒',
  review: '⭐',
  referral: '🤝',
  challenge_complete: '🏆',
  streak_milestone: '🔥',
  daily_quest: '✅',
};

/** Human-readable label for a perk type. */
function perkLabel(perkType: string): string {
  const labels: Record<string, string> = {
    BIRTHDAY_DISCOUNT: 'Birthday Discount',
    ACCESSORY_DISCOUNT: 'Accessory Discount',
    PRIORITY_SUPPORT: 'Priority Support',
    FREE_WHITE_GLOVE: 'Free White-Glove Delivery',
    EARLY_ACCESS: 'Early Access',
    STYLING_CALL: 'Free Styling Consultation',
  };
  return labels[perkType] ?? perkType;
}

export function LoyaltyScreen({ testID, onClose: _onClose }: Props) {
  const { colors, spacing, typography } = useTheme();
  const { points, tier, nextTier, progress, loading, error, refreshPoints } = useLoyalty();
  const { streak, loading: streakLoading, wasExtendedToday } = useStreak();
  const {
    events: activityEvents,
    loading: activityLoading,
    error: activityError,
  } = usePointsHistory();
  const { perks, loading: perksLoading } = useTierPerks();
  const prevTierRef = useRef<LoyaltyTierConfig | null>(null);

  useEffect(() => {
    if (streakLoading || !wasExtendedToday || streakEmittedThisSession) return;
    streakEmittedThisSession = true;
    try {
      const client = getWixClientSingleton();
      emitStreakExtended(client, { streak, delta: 1, newTotal: points }).catch((err: unknown) =>
        captureException(err instanceof Error ? err : new Error(String(err))),
      );
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)));
    }
  }, [wasExtendedToday, streakLoading, streak, points]);

  useEffect(() => {
    if (loading) return;
    const prevTier = prevTierRef.current;
    if (prevTier !== null && prevTier !== tier && !tierEmittedThisSession) {
      tierEmittedThisSession = true;
      try {
        const client = getWixClientSingleton();
        emitTierChanged(client, { oldTier: prevTier.name, newTier: tier.name }).catch(
          (err: unknown) => captureException(err instanceof Error ? err : new Error(String(err))),
        );
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)));
      }
    }
    prevTierRef.current = tier;
  }, [tier, loading]);

  if (loading) {
    return (
      <View
        style={[styles.root, { backgroundColor: colors.sandBase, padding: spacing.lg }]}
        testID={testID ?? 'loyalty-screen'}
      >
        <SkeletonCard
          testID="loyalty-loading"
          header
          lines={3}
          style={{ marginBottom: spacing.md }}
        />
        <SkeletonCard lines={2} />
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
          accessibilityLabel="Retry loading loyalty points"
        >
          <Text style={[styles.retryText, { fontFamily: typography.bodyFamilyBold }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
                    width: `${progress}%` as `${number}%`,
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
              {points} / {nextTier.minPoints} to {nextTier.name}
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
        testID="loyalty-perks-heading"
      >
        Your Perks
      </Text>
      <View style={[styles.perksWrap, { paddingHorizontal: spacing.lg }]}>
        {perksLoading ? (
          <SkeletonRow testID="loyalty-perks-loading" height={16} />
        ) : perks.length === 0 ? (
          <View testID="loyalty-perks-empty">
            <TierPerkCard tier={tier} testID="loyalty-tier-perk-card" />
          </View>
        ) : (
          perks.map((perk: TierPerk) => (
            <View
              key={perk.perkType}
              style={styles.perkRow}
              testID={`loyalty-perk-${perk.perkType}`}
            >
              <Text
                style={[styles.perkLabel, { color: colors.espresso, fontFamily: typography.bodyFamily }]}
              >
                {perkLabel(perk.perkType)}
              </Text>
              {perk.couponCode ? (
                <Text
                  style={[styles.perkCode, { color: colors.mountainBlue, fontFamily: typography.bodyFamilySemiBold }]}
                  testID={`loyalty-perk-coupon-${perk.perkType}`}
                >
                  {perk.couponCode}
                </Text>
              ) : null}
              {perk.bookingUrl ? (
                <Text
                  style={[styles.perkCode, { color: colors.sunsetCoral, fontFamily: typography.bodyFamilySemiBold }]}
                  testID={`loyalty-perk-booking-${perk.perkType}`}
                >
                  Book now
                </Text>
              ) : null}
            </View>
          ))
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
      {activityLoading ? (
        <SkeletonRow
          testID="loyalty-activity-loading"
          height={16}
          style={{ marginHorizontal: spacing.lg, marginVertical: spacing.xs }}
        />
      ) : activityError ? (
        <View style={styles.emptyTx} testID="loyalty-activity-error">
          <Text
            style={[styles.emptyText, { color: colors.espressoLight, fontFamily: typography.bodyFamily }]}
          >
            {activityError}
          </Text>
        </View>
      ) : activityEvents.length === 0 ? (
        <View style={styles.emptyTx}>
          <Text
            style={[styles.emptyText, { color: colors.espressoLight, fontFamily: typography.bodyFamily }]}
            testID="loyalty-no-activity"
          >
            No activity yet. Earn points by shopping!
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: spacing.lg }}>
          {activityEvents.slice(0, 5).map((event: PointsEvent) => (
            <View
              key={event.id}
              style={[styles.activityRow, { borderBottomColor: colors.sandDark }]}
              testID={`loyalty-activity-event-${event.id}`}
            >
              <Text style={styles.activityIcon}>{ACTIVITY_ICON[event.type] ?? '✨'}</Text>
              <Text
                style={[styles.activityDesc, { color: colors.espresso, fontFamily: typography.bodyFamily }]}
                numberOfLines={1}
              >
                {event.description}
              </Text>
              <Text
                style={[styles.activityPoints, { color: colors.mountainBlue, fontFamily: typography.bodyFamilySemiBold }]}
                testID={`loyalty-activity-points-${event.id}`}
              >
                {`+${event.points}`}
              </Text>
            </View>
          ))}
        </View>
      )}
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
  perksWrap: { marginBottom: 16 },
  emptyTx: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  errorText: { fontSize: 15, textAlign: 'center', marginHorizontal: 32, marginBottom: 20 },
  retryButton: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  perkRow: { paddingVertical: 8, gap: 4 },
  perkLabel: { fontSize: 14 },
  perkCode: { fontSize: 13 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  activityIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  activityDesc: { flex: 1, fontSize: 13 },
  activityPoints: { fontSize: 13 },
});
