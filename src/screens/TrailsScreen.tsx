/**
 * @module TrailsScreen
 *
 * Seasonal trail browser for the gamification system.
 *
 * Without a trailId: shows the list of all 3 trails (spring/summer/fall)
 * with name, icon, description, and challenge count.
 *
 * With a trailId: shows the 5 challenges for that specific trail and a
 * completion badge if all 5 are done.
 *
 * Deep links:
 *   carolinafutons://trails           → trail list
 *   carolinafutons://trails/:trailId  → specific trail
 *
 * cm-ay9
 */

import React from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { TRAIL_REGISTRY, getTrailById, isTrailCompleted } from '@/data/trails';
import type { Trail, TrailChallenge } from '@/data/trails';

export interface TrailsScreenProps {
  /** When provided, shows per-trail challenge view. Otherwise shows trail list. */
  trailId?: string;
  /** @internal Test-only override for trail data. */
  _testTrails?: Trail[];
}

// ── Trail list ────────────────────────────────────────────────────────────────

function TrailListItem({ trail }: { trail: Trail }) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  return (
    <View
      testID={`trail-item-${trail.id}`}
      style={[
        styles.card,
        {
          backgroundColor: colors.sandLight,
          borderRadius: borderRadius.md,
          marginBottom: spacing.md,
          padding: spacing.md,
        },
      ]}
    >
      <Text style={[styles.icon]}>{trail.icon}</Text>
      <Text
        style={[styles.trailName, { color: colors.espresso, fontSize: typography.h3.fontSize }]}
      >
        {trail.name}
      </Text>
      <Text style={[styles.description, { color: colors.espressoLight }]}>{trail.description}</Text>
      <Text style={[styles.challengeCount, { color: colors.sunsetCoral }]}>
        {trail.challenges.length} challenges
      </Text>
    </View>
  );
}

function TrailList({ trails }: { trails: Trail[] }) {
  return (
    <FlatList
      data={trails}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <TrailListItem trail={item} />}
    />
  );
}

// ── Per-trail challenge view ───────────────────────────────────────────────────

function ChallengeItem({ challenge }: { challenge: TrailChallenge }) {
  const { colors, spacing, borderRadius } = useTheme();
  return (
    <View
      testID={`trail-challenge-item-${challenge.id}`}
      style={[
        styles.challengeRow,
        {
          backgroundColor: challenge.completed ? '#e8f5e9' : colors.sandLight,
          borderRadius: borderRadius.sm,
          padding: spacing.sm,
          marginBottom: spacing.sm,
        },
      ]}
    >
      <Text style={[styles.checkmark, { color: colors.success }]}>
        {challenge.completed ? '✓' : '○'}
      </Text>
      <View style={styles.challengeText}>
        <Text style={[styles.challengeTitle, { color: colors.espresso }]}>{challenge.title}</Text>
        <Text style={[styles.challengeDesc, { color: colors.espressoLight }]}>
          {challenge.description}
        </Text>
      </View>
    </View>
  );
}

function TrailDetail({ trail }: { trail: Trail }) {
  const { colors, spacing, typography } = useTheme();
  const completed = isTrailCompleted(trail);

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md }}>
      <Text
        style={[
          styles.trailName,
          { color: colors.espresso, fontSize: typography.h3.fontSize, marginBottom: spacing.sm },
        ]}
      >
        {trail.name}
      </Text>

      {completed && (
        <View
          testID="trail-completion-badge"
          style={[
            styles.completionBadge,
            {
              backgroundColor: colors.success,
              borderRadius: 8,
              padding: spacing.sm,
              marginBottom: spacing.md,
            },
          ]}
        >
          <Text style={[styles.completionText, { color: '#fff' }]}>Trail Complete! 🏆</Text>
        </View>
      )}

      <View testID="trail-challenge-list">
        {trail.challenges.map((challenge) => (
          <ChallengeItem key={challenge.id} challenge={challenge} />
        ))}
      </View>
    </ScrollView>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function TrailsScreen({ trailId, _testTrails }: TrailsScreenProps) {
  const { colors, spacing } = useTheme();
  const trails = _testTrails ?? TRAIL_REGISTRY;

  return (
    <View testID="trails-screen" style={[styles.container, { backgroundColor: colors.sandBase }]}>
      {trailId === undefined ? (
        <TrailList trails={trails} />
      ) : (
        (() => {
          const trail = _testTrails
            ? _testTrails.find((t) => t.id === trailId)
            : getTrailById(trailId);
          if (!trail) {
            return (
              <View testID="trail-not-found" style={{ padding: spacing.md }}>
                <Text style={{ color: colors.espresso }}>Trail not found</Text>
              </View>
            );
          }
          return <TrailDetail trail={trail} />;
        })()
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    fontSize: 32,
    marginBottom: 4,
  },
  trailName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 4,
  },
  challengeCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkmark: {
    fontSize: 18,
    marginRight: 8,
    marginTop: 2,
  },
  challengeText: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  challengeDesc: {
    fontSize: 13,
  },
  completionBadge: {
    alignItems: 'center',
  },
  completionText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
