/**
 * @module ChallengesScreen
 *
 * Browse the full gamification challenge catalog, grouped by status:
 * In Progress → Available → Completed → Expired.
 *
 * Each row shows: title, progress bar, point reward, expiry.
 * Completed rows show checkmark badge. Expired rows are grayed out.
 *
 * cf-rv9 / Phase 7
 */

import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { useChallengeCatalog, type CatalogChallenge } from '@/hooks/useChallengeCatalog';
import { useLoyalty } from '@/hooks/useLoyalty';
import { emitChallengeStarted } from '@/services/crossRigEventBus';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';

// ── Expiry label ──────────────────────────────────────────────────────────────

function expiryLabel(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 1) return 'Expires today';
  if (days <= 7) return `${days}d left`;
  return `${Math.floor(days / 7)}w left`;
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, testID }: { label: string; testID: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Text
      testID={testID}
      style={[
        styles.sectionHeader,
        {
          color: colors.espressoLight,
          fontFamily: typography.bodyFamilyBold,
          paddingHorizontal: spacing.lg,
        },
      ]}
    >
      {label.toUpperCase()}
    </Text>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ ratio, color, testID }: { ratio: number; color: string; testID: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.trackOuter, { backgroundColor: colors.sandDark }]} testID={testID}>
      <View
        style={[styles.trackFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: color }]}
      />
    </View>
  );
}

// ── Challenge row ─────────────────────────────────────────────────────────────

function ChallengeRow({ challenge, dim }: { challenge: CatalogChallenge; dim?: boolean }) {
  const { colors, typography, spacing } = useTheme();
  const {
    id,
    title,
    progress,
    goal,
    unit,
    pointReward,
    expiresAt,
    completed,
    isExpired,
    progressRatio,
  } = challenge;

  const textColor = dim ? colors.espressoLight : colors.espresso;
  const barColor = completed
    ? colors.mountainBlue
    : isExpired
      ? colors.espressoLight
      : colors.sunsetCoral;

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: colors.sandDark,
          opacity: dim ? 0.5 : 1,
          paddingHorizontal: spacing.lg,
        },
      ]}
      testID={`challenge-row-${id}`}
    >
      {/* Title + description */}
      <View style={styles.rowTop}>
        <Text
          style={[styles.title, { color: textColor, fontFamily: typography.bodyFamilyBold }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          testID={`challenge-reward-${id}`}
          style={[
            styles.reward,
            { color: colors.mountainBlue, fontFamily: typography.bodyFamilyBold },
          ]}
        >
          {`+${pointReward} pts`}
        </Text>
      </View>

      {/* Progress bar */}
      <ProgressBar ratio={progressRatio} color={barColor} testID={`challenge-progress-${id}`} />

      {/* Progress label + expiry */}
      <View style={styles.rowBottom}>
        <Text
          style={[
            styles.progressLabel,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
        >
          {completed ? `${goal}/${goal} ${unit}` : `${progress}/${goal} ${unit}`}
        </Text>

        {completed && (
          <View
            testID={`challenge-completed-badge-${id}`}
            style={[styles.badge, { backgroundColor: colors.mountainBlue }]}
          >
            <Text style={styles.badgeText}>✓ Earned</Text>
          </View>
        )}

        {isExpired && !completed && (
          <View
            testID={`challenge-expired-badge-${id}`}
            style={[styles.badge, { backgroundColor: colors.espressoLight }]}
          >
            <Text style={styles.badgeText}>Expired</Text>
          </View>
        )}

        {!completed && !isExpired && (
          <Text
            style={[
              styles.expiry,
              { color: colors.espressoLight, fontFamily: typography.bodyFamily },
            ]}
          >
            {expiryLabel(expiresAt)}
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

interface Props {
  testID?: string;
}

export function ChallengesScreen({ testID }: Props) {
  const { colors, spacing } = useTheme();
  const { grouped, loading, error } = useChallengeCatalog();
  const { inProgress, available, completed, expired } = grouped;
  const { points } = useLoyalty();
  const challengesEmitted = useRef(false);

  useEffect(() => {
    if (loading || challengesEmitted.current || inProgress.length === 0) return;
    challengesEmitted.current = true;
    const client = getWixClientSingleton();
    for (const challenge of inProgress) {
      emitChallengeStarted(client, { challengeId: challenge.id, currentPoints: points });
    }
  }, [loading, inProgress, points]);
  const hasAny =
    inProgress.length > 0 || available.length > 0 || completed.length > 0 || expired.length > 0;

  if (loading) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'challenges-screen'}
      >
        <ActivityIndicator size="large" color={colors.sunsetCoral} testID="challenges-loading" />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'challenges-screen'}
      >
        <Text style={[styles.errorText, { color: colors.espressoLight }]} testID="challenges-error">
          {error}
        </Text>
      </View>
    );
  }

  if (!hasAny) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'challenges-screen'}
      >
        <Text style={[styles.emptyText, { color: colors.espressoLight }]} testID="challenges-empty">
          No challenges available right now.{'\n'}Check back soon!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      testID={testID ?? 'challenges-screen'}
      showsVerticalScrollIndicator={false}
    >
      {inProgress.length > 0 && (
        <>
          <SectionHeader label="In Progress" testID="section-in-progress" />
          {inProgress.map((c) => (
            <ChallengeRow key={c.id} challenge={c} />
          ))}
        </>
      )}

      {available.length > 0 && (
        <>
          <SectionHeader label="Available" testID="section-available" />
          {available.map((c) => (
            <ChallengeRow key={c.id} challenge={c} />
          ))}
        </>
      )}

      {completed.length > 0 && (
        <>
          <SectionHeader label="Completed" testID="section-completed" />
          {completed.map((c) => (
            <ChallengeRow key={c.id} challenge={c} dim />
          ))}
        </>
      )}

      {expired.length > 0 && (
        <>
          <SectionHeader label="Expired" testID="section-expired" />
          {expired.map((c) => (
            <ChallengeRow key={c.id} challenge={c} dim />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 32 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 6,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: { fontSize: 15, flex: 1, marginRight: 8 },
  reward: { fontSize: 13 },
  trackOuter: { height: 6, borderRadius: 3, overflow: 'hidden' },
  trackFill: { height: 6, borderRadius: 3 },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressLabel: { fontSize: 12 },
  expiry: { fontSize: 12 },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  errorText: { fontSize: 15, textAlign: 'center' },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 24 },
});
