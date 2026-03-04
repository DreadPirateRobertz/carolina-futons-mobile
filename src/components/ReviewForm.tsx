import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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

  const MAX_PHOTOS = 5;

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [showRatingError, setShowRatingError] = useState(false);

  const handleStarPress = useCallback((star: number) => {
    setRating(star);
    setShowRatingError(false);
  }, []);

  const handleAddPhoto = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }, [photos.length]);

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(() => {
    if (rating === 0) {
      setShowRatingError(true);
      return;
    }
    if (!title.trim() || !body.trim()) {
      return;
    }
    onSubmit({ rating, title, body, photos });
  }, [rating, title, body, photos, onSubmit]);

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

      {/* Photo previews */}
      {photos.length > 0 && (
        <View style={styles.photoRow}>
          {photos.map((uri, index) => (
            <View key={uri} style={styles.photoPreviewContainer} testID={`photo-preview-${index}`}>
              <Image source={{ uri }} style={[styles.photoPreview, { borderRadius: br.sm }]} />
              <TouchableOpacity
                testID={`remove-photo-${index}`}
                onPress={() => handleRemovePhoto(index)}
                style={styles.removePhotoButton}
                accessibilityLabel={`Remove photo ${index + 1}`}
                accessibilityRole="button"
              >
                <Text style={styles.removePhotoText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add photo button */}
      <TouchableOpacity
        testID="add-photo-button"
        style={[styles.photoButton, { borderColor: colors.muted, borderRadius: br.md }]}
        onPress={handleAddPhoto}
        accessibilityRole="button"
        accessibilityLabel={`Add photo${photos.length >= MAX_PHOTOS ? ' (limit reached)' : ''}`}
      >
        <Text style={[styles.photoButtonText, { color: colors.espresso }]}>
          + Add Photo ({photos.length}/{MAX_PHOTOS})
        </Text>
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
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  photoPreviewContainer: {
    position: 'relative',
  },
  photoPreview: {
    width: 72,
    height: 72,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
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
