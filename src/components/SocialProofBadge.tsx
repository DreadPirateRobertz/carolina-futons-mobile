/**
 * SocialProofBadge — hq-5yo88
 *
 * Renders PDP social proof signals:
 *  - "X sold this week" badge (if X > 0)
 *  - Top review excerpt (rating + author + snippet)
 *  - Loading skeleton
 *
 * Renders nothing when both signals are empty and not loading.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

// --- Types ---

interface ReviewExcerpt {
  authorName: string;
  rating: number;
  body: string;
}

interface Props {
  soldThisWeek?: number;
  topReview: ReviewExcerpt | null;
  isLoading: boolean;
  testID?: string;
}

// --- Star rendering ---

function Stars({ rating, testID }: { rating: number; testID?: string }) {
  const filled = Math.round(rating);
  return (
    <Text testID={testID} style={styles.stars} accessibilityLabel={`${rating} out of 5 stars`}>
      {'★'.repeat(filled)}
      {'☆'.repeat(5 - filled)}
    </Text>
  );
}

// --- Loading skeleton ---

function LoadingSkeleton() {
  const { colors, borderRadius } = useTheme();
  return (
    <View testID="social-proof-loading" style={styles.container}>
      <View
        style={[
          styles.skeletonBadge,
          { backgroundColor: colors.sandDark, borderRadius: borderRadius.sm },
        ]}
      />
      <View
        style={[
          styles.skeletonExcerpt,
          { backgroundColor: colors.sandDark, borderRadius: borderRadius.sm },
        ]}
      />
    </View>
  );
}

// --- Component ---

export function SocialProofBadge({ soldThisWeek, topReview, isLoading, testID }: Props) {
  const { colors, spacing, borderRadius } = useTheme();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const hasSold = soldThisWeek != null && soldThisWeek > 0;
  const hasReview = topReview != null;

  // Render nothing if both signals are empty
  if (!hasSold && !hasReview) {
    return null;
  }

  return (
    <View testID={testID ?? 'social-proof-container'} style={styles.container}>
      {/* Sold this week badge */}
      {hasSold && (
        <View
          testID="sold-this-week-badge"
          accessibilityLabel={`${soldThisWeek} sold this week`}
          style={[
            styles.soldBadge,
            {
              backgroundColor: colors.sunsetCoral + '15',
              borderRadius: borderRadius.sm,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
            },
          ]}
        >
          <Text style={[styles.soldIcon, { color: colors.sunsetCoral }]}>🔥</Text>
          <Text style={[styles.soldText, { color: colors.sunsetCoral }]}>
            {soldThisWeek} sold this week
          </Text>
        </View>
      )}

      {/* Review excerpt */}
      {hasReview && (
        <View
          testID="review-excerpt"
          style={[
            styles.excerpt,
            {
              backgroundColor: colors.offWhite,
              borderRadius: borderRadius.md,
              padding: spacing.sm,
              borderColor: colors.sandDark,
            },
          ]}
        >
          <View style={styles.excerptHeader}>
            <Stars rating={topReview.rating} testID="review-excerpt-rating" />
            <Text style={[styles.excerptAuthor, { color: colors.espressoLight }]}>
              {topReview.authorName}
            </Text>
          </View>
          <Text
            testID="review-excerpt-body"
            style={[styles.excerptBody, { color: colors.espresso }]}
            numberOfLines={2}
          >
            "{topReview.body}"
          </Text>
        </View>
      )}
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  soldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  soldIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  soldText: {
    fontSize: 13,
    fontWeight: '600',
  },
  stars: {
    fontSize: 14,
    color: '#F5A623',
    letterSpacing: 1,
  },
  excerpt: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  excerptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  excerptAuthor: {
    fontSize: 12,
    fontWeight: '500',
  },
  excerptBody: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  // Skeleton
  skeletonBadge: {
    width: 120,
    height: 24,
    opacity: 0.3,
  },
  skeletonExcerpt: {
    width: '100%',
    height: 52,
    opacity: 0.3,
  },
});
