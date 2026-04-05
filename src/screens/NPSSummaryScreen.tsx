/**
 * @module NPSSummaryScreen
 *
 * Staff-only NPS summary dashboard (hq-9dq).
 *
 * Displays:
 *  - Average NPS score across all responses
 *  - Total response count
 *  - Last 5 comments (responses with a non-empty comment field)
 *
 * Non-staff and unauthenticated users see an access-denied message.
 */

import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/theme';
import { useNPSSummary, type NpsResponseItem } from '@/hooks/useNPSSummary';

interface Props {
  testID?: string;
}

export function NPSSummaryScreen({ testID }: Props) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { summary, loading, error, isStaff, refresh } = useNPSSummary();

  if (!isStaff) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'nps-summary-screen'}
      >
        <Text
          testID="nps-access-denied"
          style={[
            styles.accessDenied,
            { color: colors.espressoLight, fontFamily: typography.bodyFamilyBold },
          ]}
        >
          Staff access only
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'nps-summary-screen'}
      >
        <ActivityIndicator
          testID="nps-loading"
          size="large"
          color={colors.mountainBlue}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'nps-summary-screen'}
      >
        <Text
          testID="nps-error"
          style={[
            styles.errorText,
            { color: colors.sunsetCoral, fontFamily: typography.bodyFamily },
          ]}
        >
          {error}
        </Text>
        <TouchableOpacity
          testID="nps-retry-button"
          onPress={refresh}
          style={[
            styles.retryButton,
            { backgroundColor: colors.mountainBlue, borderRadius: borderRadius.button },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={[styles.retryText, { fontFamily: typography.bodyFamilyBold }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasResponses = (summary?.responseCount ?? 0) > 0;
  const hasComments = (summary?.recentComments?.length ?? 0) > 0;

  return (
    <ScrollView
      style={{ backgroundColor: colors.sandBase }}
      contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
      testID={testID ?? 'nps-summary-screen'}
    >
      <Text
        style={[
          styles.heading,
          { color: colors.espresso, fontFamily: typography.headingFamily },
        ]}
        accessibilityRole="header"
      >
        NPS Summary
      </Text>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.offWhite,
              borderRadius: borderRadius.lg,
              marginRight: spacing.sm,
            },
          ]}
        >
          <Text
            style={[styles.statLabel, { color: colors.espressoLight, fontFamily: typography.bodyFamily }]}
          >
            Avg Score
          </Text>
          <Text
            testID="nps-avg-score"
            style={[
              styles.statValue,
              { color: colors.espresso, fontFamily: typography.headingFamily },
            ]}
          >
            {summary?.avgScore != null ? String(summary.avgScore) : '—'}
          </Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.offWhite, borderRadius: borderRadius.lg },
          ]}
        >
          <Text
            style={[styles.statLabel, { color: colors.espressoLight, fontFamily: typography.bodyFamily }]}
          >
            Responses
          </Text>
          <Text
            testID="nps-response-count"
            style={[
              styles.statValue,
              { color: colors.espresso, fontFamily: typography.headingFamily },
            ]}
          >
            {String(summary?.responseCount ?? 0)}
          </Text>
        </View>
      </View>

      {/* Empty state */}
      {!hasResponses && (
        <View testID="nps-empty-state" style={styles.emptyState}>
          <Text
            style={[
              styles.emptyText,
              { color: colors.espressoLight, fontFamily: typography.bodyFamily },
            ]}
          >
            No survey responses yet.
          </Text>
        </View>
      )}

      {/* Recent comments */}
      {hasComments && (
        <View testID="nps-comments-section" style={{ marginTop: spacing.lg }}>
          <Text
            style={[
              styles.sectionHeading,
              { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
            ]}
          >
            Recent Comments
          </Text>

          {summary!.recentComments.map((item: NpsResponseItem) => (
            <View
              key={item.id}
              testID={`nps-comment-${item.id}`}
              style={[
                styles.commentCard,
                {
                  backgroundColor: colors.offWhite,
                  borderRadius: borderRadius.md,
                  marginTop: spacing.sm,
                },
              ]}
            >
              <View style={styles.commentHeader}>
                <Text
                  style={[
                    styles.commentScore,
                    { color: colors.mountainBlue, fontFamily: typography.bodyFamilyBold },
                  ]}
                >
                  {item.score}/10
                </Text>
                <Text
                  style={[
                    styles.commentDate,
                    { color: colors.espressoLight, fontFamily: typography.bodyFamily },
                  ]}
                >
                  {new Date(item.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <Text
                style={[
                  styles.commentText,
                  { color: colors.espresso, fontFamily: typography.bodyFamily },
                ]}
              >
                {item.comment}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
  sectionHeading: {
    fontSize: 16,
    marginBottom: 4,
  },
  commentCard: {
    padding: 14,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentScore: {
    fontSize: 14,
  },
  commentDate: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  accessDenied: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
