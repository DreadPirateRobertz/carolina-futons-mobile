/**
 * @module ReviewCard
 *
 * Displays a single customer review with star rating, author info, verified
 * purchase badge, review body, optional photo thumbnails, relative timestamp,
 * and a "Helpful" voting button. Memoized for efficient rendering in review lists.
 */

import React, { useCallback, useMemo, memo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import { type Review } from '@/data/reviews';
import { StarRating } from '@/components/StarRating';

interface ReviewCardProps {
  review: Review;
  onHelpful?: (reviewId: string) => void;
  testID?: string;
}

/** Return a human-readable relative date string (e.g. "3 days ago"). */
function relativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return years === 1 ? '1 year ago' : `${years} years ago`;
  if (months > 0) return months === 1 ? '1 month ago' : `${months} months ago`;
  if (weeks > 0) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  if (days > 0) return days === 1 ? '1 day ago' : `${days} days ago`;
  if (hours > 0) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  if (minutes > 0) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  return 'just now';
}

/** Memoized review card with star rating, author, body, photos, and helpful vote button. */
export const ReviewCard = memo(function ReviewCard({ review, onHelpful, testID }: ReviewCardProps) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();

  const handleHelpful = useCallback(() => {
    onHelpful?.(review.id);
  }, [onHelpful, review.id]);

  const timeAgo = useMemo(() => relativeDate(review.createdAt), [review.createdAt]);

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          backgroundColor: colors.white,
          borderRadius: borderRadius.card,
          padding: spacing.md,
          marginBottom: spacing.sm,
        },
      ]}
      testID={testID ?? `review-card-${review.id}`}
      accessibilityLabel={`Review by ${review.authorName}, ${review.rating} stars`}
    >
      {/* Header row: rating + author + verified badge */}
      <View style={styles.headerRow}>
        <StarRating rating={review.rating} size="sm" />
        <Text
          style={[
            styles.authorName,
            { color: colors.espresso, fontFamily: typography.bodyFamilySemiBold },
          ]}
          numberOfLines={1}
        >
          {review.authorName}
        </Text>
        {review.verified && (
          <Text style={[styles.verifiedBadge, { color: colors.success }]}>
            {'\u2713'} Verified Purchase
          </Text>
        )}
      </View>

      {/* Review title */}
      <Text
        style={[
          styles.title,
          {
            color: colors.espresso,
            fontFamily: typography.bodyFamilyBold,
            ...typography.bodySmall,
            fontWeight: '700',
          },
        ]}
        numberOfLines={2}
      >
        {review.title}
      </Text>

      {/* Review body */}
      <Text style={[styles.body, { color: colors.espressoLight, ...typography.body }]}>
        {review.body}
      </Text>

      {/* Photo thumbnails */}
      {review.photos && review.photos.length > 0 && (
        <View style={styles.photosRow}>
          {review.photos.map((photo, index) => (
            <View
              key={`${review.id}-photo-${index}`}
              style={[
                styles.photoThumbnail,
                { backgroundColor: colors.sandLight, borderRadius: borderRadius.image },
              ]}
            >
              <Image
                source={{ uri: photo }}
                style={styles.photoImage}
                contentFit="cover"
                transition={200}
                accessibilityLabel={`Review photo ${index + 1}`}
                cachePolicy="memory-disk"
              />
            </View>
          ))}
        </View>
      )}

      {/* Footer row: date + helpful button */}
      <View style={styles.footerRow}>
        <Text style={[styles.date, { color: colors.muted, ...typography.caption }]}>{timeAgo}</Text>
        <TouchableOpacity
          onPress={handleHelpful}
          style={[styles.helpfulButton, { borderColor: colors.muted }]}
          testID={testID ? `${testID}-helpful` : `review-helpful-${review.id}`}
          accessibilityLabel={`Mark review as helpful, ${review.helpful} people found this helpful`}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Text
            style={[styles.helpfulText, { color: colors.espressoLight, ...typography.caption }]}
          >
            Helpful ({review.helpful})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  verifiedBadge: {
    fontSize: 11,
    fontWeight: '500',
  },
  title: {
    marginBottom: 4,
  },
  body: {
    marginBottom: 8,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  photoThumbnail: {
    width: 56,
    height: 56,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  date: {},
  helpfulButton: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  helpfulText: {},
});
