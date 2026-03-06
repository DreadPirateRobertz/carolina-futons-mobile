/**
 * @module StarRating
 *
 * Reusable 5-star rating display and input component. Supports read-only
 * display mode and interactive mode for rating submission. Stars are
 * rendered as Unicode characters (filled star / empty star) and can
 * optionally show a numeric value and review count.
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';

interface StarRatingProps {
  rating: number; // 0-5, supports half values
  size?: 'sm' | 'md' | 'lg'; // star size (default 'md')
  interactive?: boolean; // if true, tappable to set rating
  onRate?: (rating: number) => void; // callback when interactive
  showValue?: boolean; // show numeric value next to stars
  count?: number; // review count to display in parens
  testID?: string;
}

const SIZE_MAP = {
  sm: 12,
  md: 16,
  lg: 20,
} as const;

const STAR_COUNT = 5;

/**
 * Displays a row of 5 stars with optional numeric value and review count.
 * In interactive mode, each star is tappable to submit a rating.
 *
 * @param props.rating - Rating value from 0 to 5 (rounded to nearest integer for display)
 * @param props.size - Star size: 'sm' (12px), 'md' (16px), or 'lg' (20px)
 * @param props.interactive - When true, stars become tappable for rating input
 * @param props.onRate - Callback with the selected rating (1-5) when interactive
 * @param props.showValue - Show the numeric rating next to the stars
 * @param props.count - Review count displayed in parentheses
 * @param props.testID - Test identifier
 * @returns A row of star characters with optional value and count
 */
export function StarRating({
  rating,
  size = 'md',
  interactive = false,
  onRate,
  showValue = false,
  count,
  testID,
}: StarRatingProps) {
  const { colors } = useTheme();

  const fontSize = SIZE_MAP[size];
  const rounded = Math.round(rating);
  const clamped = Math.max(0, Math.min(STAR_COUNT, rounded));

  const handleStarPress = useCallback(
    (starIndex: number) => {
      onRate?.(starIndex + 1);
    },
    [onRate],
  );

  const stars = Array.from({ length: STAR_COUNT }, (_, i) => {
    const filled = i < clamped;
    const char = filled ? '\u2605' : '\u2606';
    const color = filled ? colors.sunsetCoral : colors.muted;

    if (interactive) {
      return (
        <TouchableOpacity
          key={i}
          onPress={() => handleStarPress(i)}
          accessibilityLabel={`Rate ${i + 1} star${i + 1 > 1 ? 's' : ''}`}
          accessibilityRole="button"
          hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
          testID={testID ? `${testID}-star-${i + 1}` : undefined}
        >
          <Text style={[styles.star, { fontSize, color, letterSpacing: 1 }]}>{char}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <Text key={i} style={[styles.star, { fontSize, color, letterSpacing: 1 }]}>
        {char}
      </Text>
    );
  });

  return (
    <View
      style={styles.container}
      accessibilityLabel={`${rating} out of ${STAR_COUNT} stars`}
      accessibilityRole="text"
      testID={testID}
    >
      <View style={styles.starsRow}>{stars}</View>
      {showValue && (
        <Text style={[styles.value, { fontSize: fontSize - 1, color: colors.espressoLight }]}>
          {rating.toFixed(1)}
        </Text>
      )}
      {count != null && (
        <Text style={[styles.count, { fontSize: fontSize - 2, color: colors.muted }]}>
          ({count})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    // fontSize, color, letterSpacing applied inline
  },
  value: {
    fontWeight: '600',
  },
  count: {
    // fontSize, color applied inline
  },
});
