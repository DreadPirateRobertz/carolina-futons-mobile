import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';

interface ReviewFormProps {
  onSubmit: (data: { rating: number; title: string; body: string; photos: string[] }) => void;
  isSubmitting?: boolean;
  testID?: string;
}

const STAR_COUNT = 5;

export function ReviewForm({
  onSubmit,
  isSubmitting = false,
  testID = 'review-form',
}: ReviewFormProps) {
  const { colors, borderRadius: br } = useTheme();

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [showRatingError, setShowRatingError] = useState(false);

  const handleStarPress = useCallback((star: number) => {
    setRating(star);
    setShowRatingError(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (rating === 0) {
      setShowRatingError(true);
      return;
    }
    if (!title.trim() || !body.trim()) {
      return;
    }
    onSubmit({ rating, title, body, photos: [] });
  }, [rating, title, body, onSubmit]);

  const stars = Array.from({ length: STAR_COUNT }, (_, i) => {
    const starValue = i + 1;
    const filled = starValue <= rating;
    const char = filled ? '\u2605' : '\u2606';
    const color = filled ? colors.sunsetCoral : colors.muted;

    return (
      <TouchableOpacity
        key={starValue}
        onPress={() => handleStarPress(starValue)}
        accessibilityLabel={`${starValue} stars`}
        accessibilityRole="button"
        testID={`star-button-${starValue}`}
        hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      >
        <Text style={[styles.starText, { color }]}>{char}</Text>
      </TouchableOpacity>
    );
  });

  return (
    <View testID={testID} style={styles.container}>
      {/* Star Selector */}
      <View testID="star-selector" accessibilityRole="radiogroup" style={styles.starSelector}>
        {stars}
      </View>

      {/* Hidden rating value for test assertions */}
      <Text testID="selected-rating" style={styles.hidden}>
        {rating}
      </Text>

      {/* Rating error */}
      {showRatingError && (
        <Text testID="rating-error" style={[styles.errorText, { color: colors.error }]}>
          Please select a rating
        </Text>
      )}

      {/* Title input */}
      <TextInput
        testID="review-title-input"
        placeholder="Review title"
        value={title}
        onChangeText={setTitle}
        style={[
          styles.input,
          {
            backgroundColor: colors.sandLight,
            color: colors.espresso,
            borderRadius: br.md,
          },
        ]}
        placeholderTextColor={colors.muted}
      />

      {/* Body input */}
      <TextInput
        testID="review-body-input"
        placeholder="Write your review..."
        value={body}
        onChangeText={setBody}
        multiline
        style={[
          styles.input,
          styles.bodyInput,
          {
            backgroundColor: colors.sandLight,
            color: colors.espresso,
            borderRadius: br.md,
          },
        ]}
        placeholderTextColor={colors.muted}
      />

      {/* Add photo button */}
      <TouchableOpacity
        testID="add-photo-button"
        style={[styles.photoButton, { borderColor: colors.muted, borderRadius: br.md }]}
        accessibilityRole="button"
        accessibilityLabel="Add photo"
      >
        <Text style={[styles.photoButtonText, { color: colors.espresso }]}>+ Add Photo</Text>
      </TouchableOpacity>

      {/* Submit button */}
      <TouchableOpacity
        testID="submit-review-button"
        onPress={handleSubmit}
        disabled={isSubmitting}
        accessibilityLabel="Submit review"
        accessibilityRole="button"
        accessibilityState={{ disabled: isSubmitting }}
        style={[
          styles.submitButton,
          {
            backgroundColor: isSubmitting ? colors.muted : colors.sunsetCoral,
            borderRadius: br.md,
          },
        ]}
      >
        <Text style={[styles.submitButtonText, { color: colors.white }]}>
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  starSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  starText: {
    fontSize: 28,
  },
  hidden: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  bodyInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  photoButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
