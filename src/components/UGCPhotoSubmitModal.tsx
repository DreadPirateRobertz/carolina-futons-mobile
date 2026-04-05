/**
 * @module UGCPhotoSubmitModal
 *
 * Modal for submitting a UGC (User-Generated Content) photo — cm-ae8.
 *
 * Allows users to:
 *   - Pick a photo from their library
 *   - Select their room type
 *   - Add an optional caption (max 80 chars)
 *   - Submit to the UGCPhotos Wix collection for moderation
 *
 * Uses useUGCPhotos hook for submission and status management.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/theme';
import { useUGCPhotos, type UGCRoomType } from '@/hooks/useUGCPhotos';

const MAX_CAPTION = 80;

const ROOM_TYPES: { label: string; value: UGCRoomType }[] = [
  { label: 'Living Room', value: 'living-room' },
  { label: 'Bedroom', value: 'bedroom' },
  { label: 'Office', value: 'office' },
  { label: 'Dorm', value: 'dorm' },
  { label: 'Porch', value: 'porch' },
  { label: 'Other', value: 'other' },
];

interface Props {
  visible: boolean;
  productId: string;
  onClose: () => void;
}

export function UGCPhotoSubmitModal({ visible, productId, onClose }: Props) {
  const { colors, spacing, borderRadius } = useTheme();
  const { isSubmitting, submitError, submitSuccess, submitPhoto, clearSubmitStatus } =
    useUGCPhotos(productId);

  const [caption, setCaption] = useState('');
  const [roomType, setRoomType] = useState<UGCRoomType>('living-room');

  // Auto-close on success
  useEffect(() => {
    if (submitSuccess) {
      const timer = setTimeout(() => {
        onClose();
        clearSubmitStatus();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [submitSuccess, onClose, clearSubmitStatus]);

  const handleClose = useCallback(() => {
    clearSubmitStatus();
    onClose();
  }, [clearSubmitStatus, onClose]);

  const handleSubmit = useCallback(async () => {
    await submitPhoto({ roomType, caption });
  }, [submitPhoto, roomType, caption]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      testID="ugc-submit-modal"
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.white }]}
        contentContainerStyle={{ padding: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.espresso }]}>Share Your Room</Text>
          <TouchableOpacity
            onPress={handleClose}
            testID="ugc-close-button"
            accessibilityLabel="Close photo submit modal"
            accessibilityRole="button"
          >
            <Text style={[styles.closeBtn, { color: colors.espressoLight }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Room type picker (segmented scroll) */}
        <Text style={[styles.label, { color: colors.espresso }]}>Room type</Text>
        <View
          testID="ugc-room-type-picker"
          style={styles.roomTypeRow}
          accessibilityLabel="Room type"
        >
          {ROOM_TYPES.map((rt) => {
            const active = roomType === rt.value;
            return (
              <TouchableOpacity
                key={rt.value}
                onPress={() => setRoomType(rt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={rt.label}
                style={[
                  styles.roomTypeChip,
                  {
                    backgroundColor: active ? colors.espresso : colors.sandLight,
                    borderRadius: borderRadius.pill ?? 20,
                  },
                ]}
              >
                <Text style={{ color: active ? colors.white : colors.espresso, fontSize: 12 }}>
                  {rt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Caption input */}
        <Text style={[styles.label, { color: colors.espresso }]}>
          Caption <Text style={{ color: colors.espressoLight }}>(optional)</Text>
        </Text>
        <TextInput
          testID="ugc-caption-input"
          value={caption}
          onChangeText={setCaption}
          placeholder="Describe your setup…"
          placeholderTextColor={colors.espressoLight}
          multiline
          style={[
            styles.captionInput,
            {
              borderColor: colors.sandLight,
              borderRadius: borderRadius.md,
              color: colors.espresso,
            },
          ]}
          accessibilityLabel="Caption"
        />
        <Text
          testID="ugc-caption-count"
          style={[
            styles.charCount,
            { color: caption.length > MAX_CAPTION ? colors.error : colors.espressoLight },
          ]}
        >
          {caption.length}/{MAX_CAPTION}
        </Text>

        {/* Error */}
        {submitError ? (
          <Text style={[styles.error, { color: colors.error }]}>{submitError}</Text>
        ) : null}

        {/* Pick photo / submit button */}
        <TouchableOpacity
          testID="ugc-pick-photo-button"
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityLabel="Pick a photo from your library"
          accessibilityRole="button"
          style={[
            styles.pickButton,
            {
              borderColor: colors.espresso,
              borderRadius: borderRadius.md,
              opacity: isSubmitting ? 0.5 : 1,
            },
          ]}
        >
          <Text style={[styles.pickButtonText, { color: colors.espresso }]}>Choose Photo</Text>
        </TouchableOpacity>

        {/* Submit button */}
        <TouchableOpacity
          testID="ugc-submit-button"
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityLabel="Submit your photo"
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting }}
          style={[
            styles.submitButton,
            {
              backgroundColor: isSubmitting ? colors.sandLight : colors.espresso,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text style={[styles.submitButtonText, { color: colors.white }]}>
            {submitSuccess ? 'Submitted!' : isSubmitting ? 'Uploading…' : 'Share Photo'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '700' },
  closeBtn: { fontSize: 22, paddingHorizontal: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  roomTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roomTypeChip: { paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, marginBottom: 4 },
  captionInput: {
    borderWidth: 1,
    minHeight: 80,
    padding: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 4 },
  error: { marginTop: 12, fontSize: 13 },
  pickButton: {
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  pickButtonText: { fontSize: 15, fontWeight: '600' },
  submitButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonText: { fontSize: 16, fontWeight: '700' },
});
