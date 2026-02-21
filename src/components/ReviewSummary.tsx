import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { StarRating } from '@/components/StarRating';
import type { ReviewSummary as ReviewSummaryType } from '@/data/reviews';

interface Props {
  summary: ReviewSummaryType;
  testID?: string;
}

export function ReviewSummary({ summary, testID }: Props) {
  const { colors, borderRadius, shadows } = useTheme();

  const maxCount = Math.max(...summary.distribution, 1);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.sandLight, borderRadius: borderRadius.card },
        shadows.card,
      ]}
      testID={testID ?? 'review-summary'}
    >
      {/* Left: big average + stars */}
      <View style={styles.left}>
        <Text
          style={[styles.averageText, { color: colors.espresso }]}
          testID="review-average"
          accessibilityLabel={`${summary.averageRating} out of 5 stars`}
        >
          {summary.averageRating.toFixed(1)}
        </Text>
        <StarRating rating={summary.averageRating} size="md" testID="review-summary-stars" />
        <Text style={[styles.totalText, { color: colors.muted }]} testID="review-total-count">
          {summary.totalReviews} {summary.totalReviews === 1 ? 'review' : 'reviews'}
        </Text>
      </View>

      {/* Right: distribution bars */}
      <View style={styles.right}>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = summary.distribution[star - 1];
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <View key={star} style={styles.barRow} testID={`distribution-row-${star}`}>
              <Text style={[styles.barLabel, { color: colors.espressoLight }]}>{star}</Text>
              <View style={[styles.barTrack, { backgroundColor: colors.sandDark }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${barWidth}%`,
                      backgroundColor: colors.sunsetCoral,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barCount, { color: colors.muted }]}>{count}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  left: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  averageText: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 40,
  },
  totalText: {
    fontSize: 12,
    marginTop: 4,
  },
  right: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 12,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barCount: {
    fontSize: 11,
    width: 20,
    textAlign: 'right',
  },
});
