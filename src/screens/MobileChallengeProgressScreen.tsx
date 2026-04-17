/**
 * @module MobileChallengeProgressScreen
 *
 * Displays the authenticated member's MobileChallengeCompletions progress —
 * completion counts per challenge type (AR Discovery, Quiz Completion,
 * Social Share) plus a derived total-points tally.
 *
 * Counts are fetched via {@link useMobileChallengeProgress}, which also
 * listens for cross-rig completion push events and auto-refreshes the view
 * while the screen is mounted.
 *
 * cm-1we
 */

import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/theme';
import {
  useMobileChallengeProgress,
  type ChallengeCounts,
} from '@/hooks/useMobileChallengeProgress';
import { MOBILE_CHALLENGE_TYPES, type MobileChallengeType } from '@/services/crossRigSync';

interface TypeDisplay {
  key: MobileChallengeType;
  label: string;
  icon: string;
}

const TYPE_DISPLAY: readonly TypeDisplay[] = [
  { key: 'ar_discovery', label: 'AR Discovery', icon: '📷' },
  { key: 'quiz_completion', label: 'Quiz Completion', icon: '🎯' },
  { key: 'social_share', label: 'Social Share', icon: '🔗' },
];

function computeTotalPoints(counts: ChallengeCounts): number {
  return (
    counts.ar_discovery * MOBILE_CHALLENGE_TYPES.ar_discovery.points +
    counts.quiz_completion * MOBILE_CHALLENGE_TYPES.quiz_completion.points +
    counts.social_share * MOBILE_CHALLENGE_TYPES.social_share.points
  );
}

export function MobileChallengeProgressScreen() {
  const { colors, typography, spacing } = useTheme();
  const { counts, loading, error, refresh } = useMobileChallengeProgress();

  if (loading) {
    return (
      <View style={styles.centered} testID="mcp-loading">
        <ActivityIndicator size="large" color={colors.mountainBlue} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered} testID="mcp-error">
        <Text
          style={[styles.errorText, { color: colors.espresso, fontFamily: typography.bodyFamily }]}
        >
          {error}
        </Text>
        <TouchableOpacity
          testID="mcp-retry"
          onPress={refresh}
          style={[styles.retryButton, { backgroundColor: colors.mountainBlue }]}
          accessibilityRole="button"
          accessibilityLabel="Retry loading challenge progress"
        >
          <Text style={[styles.retryText, { fontFamily: typography.bodyFamilyBold }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalPoints = computeTotalPoints(counts);

  return (
    <ScrollView
      testID="mcp-scroll"
      contentContainerStyle={[styles.container, { padding: spacing.lg }]}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
    >
      <Text
        style={[
          styles.title,
          {
            color: colors.espresso,
            fontFamily: typography.headingFamily ?? typography.bodyFamilyBold,
          },
        ]}
      >
        Challenge Progress
      </Text>
      <View
        style={[
          styles.summary,
          { backgroundColor: colors.sandDark, marginTop: spacing.md, padding: spacing.md },
        ]}
      >
        <Text
          style={[
            styles.summaryLabel,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
        >
          Total points earned
        </Text>
        <Text
          testID="mcp-total-points"
          style={[
            styles.summaryValue,
            { color: colors.mountainBlue, fontFamily: typography.bodyFamilyBold },
          ]}
        >
          {totalPoints}
        </Text>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        {TYPE_DISPLAY.map(({ key, label, icon }) => (
          <View
            key={key}
            testID={`mcp-card-${key}`}
            style={[
              styles.card,
              {
                backgroundColor: colors.sandDark,
                marginBottom: spacing.md,
                padding: spacing.md,
              },
            ]}
          >
            <Text style={styles.cardIcon}>{icon}</Text>
            <View style={styles.cardBody}>
              <Text
                style={[
                  styles.cardLabel,
                  { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
                ]}
              >
                {label}
              </Text>
              <Text
                style={[
                  styles.cardSubLabel,
                  { color: colors.espressoLight, fontFamily: typography.bodyFamily },
                ]}
              >
                {MOBILE_CHALLENGE_TYPES[key].points} pts each
              </Text>
            </View>
            <Text
              testID={`mcp-count-${key}`}
              style={[
                styles.cardCount,
                { color: colors.mountainBlue, fontFamily: typography.bodyFamilyBold },
              ]}
            >
              {counts[key]}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
  retryButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 16 },
  title: { fontSize: 24 },
  summary: { borderRadius: 12, alignItems: 'center' },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 32, marginTop: 4 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 12 },
  cardIcon: { fontSize: 28, marginRight: 12 },
  cardBody: { flex: 1 },
  cardLabel: { fontSize: 16 },
  cardSubLabel: { fontSize: 12, marginTop: 2 },
  cardCount: { fontSize: 28, marginLeft: 12, minWidth: 40, textAlign: 'right' },
});
