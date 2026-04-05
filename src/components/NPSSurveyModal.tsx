/**
 * @module NPSSurveyModal
 *
 * Post-purchase NPS survey modal — deacon-kon2.
 *
 * Shows a 0-10 score selector, optional comment field, dismiss + submit.
 * Writes to Wix SurveyResponses collection via submitNpsSurvey.
 * Guards against resubmission using AsyncStorage keyed by orderId.
 *
 * Accepts an optional `storage` prop for testability; defaults to the
 * system AsyncStorage when not provided.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/theme';
import { submitNpsSurvey, type WixClientLike } from '@/services/npsSurvey';
import { captureException } from '@/services/crashReporting';
import { sanitizeText } from '@/utils/sanitizeText';

// ── Constants ─────────────────────────────────────────────────────────────────

export const MAX_COMMENT_LENGTH = 500;
const STORAGE_KEY_PREFIX = 'nps_submitted_';

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success' }
  | { status: 'error'; message: string }
  | { status: 'already_submitted' };

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface NPSSurveyModalProps {
  visible: boolean;
  orderId: string;
  wixClient?: WixClientLike | null;
  onDismiss: () => void;
  onSubmitted?: () => void;
  testID?: string;
  /** Injected storage adapter — defaults to AsyncStorage. Pass a mock in tests. */
  storage?: StorageAdapter;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveStorage(injected?: StorageAdapter): Promise<StorageAdapter | null> {
  if (injected) return injected;
  try {
    const mod = await import('@react-native-async-storage/async-storage');
    return mod.default ?? null;
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)), 'warning', {
      action: 'resolveStorage/import',
    });
    return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NPSSurveyModal({
  visible,
  orderId,
  wixClient = null,
  onDismiss,
  onSubmitted,
  testID = 'nps-survey-modal',
  storage,
}: NPSSurveyModalProps) {
  const { colors, spacing, borderRadius } = useTheme();

  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [modalState, setModalState] = useState<ModalState>({ status: 'idle' });
  const cancelledRef = useRef(false);

  // ── Already-submitted guard ──────────────────────────────────────────────────
  useEffect(() => {
    cancelledRef.current = false;
    if (!visible) return;

    (async () => {
      try {
        const s = await resolveStorage(storage);
        if (!s) return;
        const stored = await s.getItem(`${STORAGE_KEY_PREFIX}${orderId}`);
        if (stored && !cancelledRef.current) {
          setModalState({ status: 'already_submitted' });
        }
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), 'warning', {
          action: 'NPSSurveyModal/resolveStorage',
          orderId,
        });
      }
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, [visible, orderId, storage]);

  const handleScorePress = useCallback((score: number) => {
    setSelectedScore(score);
  }, []);

  const handleCommentChange = useCallback((text: string) => {
    setComment(text.slice(0, MAX_COMMENT_LENGTH));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedScore === null) return;
    if (modalState.status === 'submitting') return;

    setModalState({ status: 'submitting' });

    const trimmedComment = sanitizeText(comment);
    const now = new Date();
    const data = {
      orderId,
      score: selectedScore,
      createdAt: now.toISOString(),
      suppressedUntil: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      ...(trimmedComment.length > 0 ? { comment: trimmedComment } : {}),
    };

    try {
      const result = await submitNpsSurvey(wixClient, data);

      if (!result.success) {
        setModalState({ status: 'error', message: result.error ?? 'Submission failed' });
        return;
      }

      // Persist guard — best-effort
      try {
        const s = await resolveStorage(storage);
        if (s) {
          await s.setItem(`${STORAGE_KEY_PREFIX}${orderId}`, '1');
        }
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), 'warning', {
          action: 'NPSSurveyModal/persistGuard',
          orderId,
        });
      }

      setModalState({ status: 'success' });
      onSubmitted?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      captureException(error, 'error', { action: 'NPSSurveyModal/submit', orderId });
      setModalState({ status: 'error', message: error.message });
    }
  }, [selectedScore, comment, orderId, wixClient, modalState.status, onSubmitted, storage]);

  const isSubmitting = modalState.status === 'submitting';
  const submitDisabled = selectedScore === null || isSubmitting;

  const styles = makeStyles(colors, spacing, borderRadius);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      {/* Overlay */}
      <TouchableOpacity
        testID="nps-modal-overlay"
        style={styles.overlay}
        activeOpacity={1}
        onPress={onDismiss}
        accessibilityLabel="Close survey"
      >
        {/* Card — stop propagation so tapping the card does not dismiss */}
        <TouchableOpacity
          testID={testID}
          style={styles.card}
          activeOpacity={1}
          onPress={() => {}}
          accessibilityRole="none"
        >
          {modalState.status === 'already_submitted' ? (
            <AlreadySubmittedState testID="nps-already-submitted" styles={styles} />
          ) : modalState.status === 'success' ? (
            <SuccessState testID="nps-success-state" styles={styles} />
          ) : (
            <SurveyForm
              selectedScore={selectedScore}
              comment={comment}
              isSubmitting={isSubmitting}
              submitDisabled={submitDisabled}
              error={modalState.status === 'error' ? modalState.message : null}
              onScorePress={handleScorePress}
              onCommentChange={handleCommentChange}
              onSubmit={handleSubmit}
              onDismiss={onDismiss}
              styles={styles}
              colors={colors}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface SurveyFormProps {
  selectedScore: number | null;
  comment: string;
  isSubmitting: boolean;
  submitDisabled: boolean;
  error: string | null;
  onScorePress: (score: number) => void;
  onCommentChange: (text: string) => void;
  onSubmit: () => void;
  onDismiss: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: Record<string, string>;
}

function SurveyForm({
  selectedScore,
  comment,
  isSubmitting,
  submitDisabled,
  error,
  onScorePress,
  onCommentChange,
  onSubmit,
  onDismiss,
  styles,
  colors,
}: SurveyFormProps) {
  return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>How likely are you to recommend{'\n'}Carolina Futons?</Text>
        <TouchableOpacity
          testID="nps-dismiss-btn"
          style={styles.dismissButton}
          onPress={onDismiss}
          accessibilityLabel="Dismiss survey"
          accessibilityRole="button"
        >
          <Text style={styles.dismissButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Scale labels */}
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleLabelText}>Not likely</Text>
        <Text style={styles.scaleLabelText}>Very likely</Text>
      </View>

      {/* Score buttons 0–10 */}
      <View style={styles.scoresRow}>
        {Array.from({ length: 11 }, (_, i) => {
          const isSelected = selectedScore === i;
          return (
            <TouchableOpacity
              key={i}
              testID={`nps-score-${i}`}
              style={[styles.scoreButton, isSelected && styles.scoreButtonSelected]}
              onPress={() => onScorePress(i)}
              accessibilityLabel={`Score ${i}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.scoreButtonText, isSelected && styles.scoreButtonTextSelected]}>
                {i}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Comment */}
      <TextInput
        testID="nps-comment-input"
        style={styles.commentInput}
        placeholder="Any additional feedback? (optional)"
        placeholderTextColor={colors.espressoLight}
        value={comment}
        onChangeText={onCommentChange}
        multiline
        maxLength={MAX_COMMENT_LENGTH}
        accessibilityLabel="Optional feedback comment"
      />
      <Text style={styles.charCount}>
        {comment.length} / {MAX_COMMENT_LENGTH}
      </Text>

      {/* Error */}
      {error && (
        <View testID="nps-error-state" style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity
        testID="nps-submit-btn"
        style={[styles.submitButton, submitDisabled && styles.submitButtonDisabled]}
        onPress={onSubmit}
        disabled={submitDisabled}
        accessibilityLabel="Submit survey"
        accessibilityRole="button"
        accessibilityState={{ disabled: submitDisabled }}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={styles.submitButtonText}>Submit</Text>
        )}
      </TouchableOpacity>
    </>
  );
}

function SuccessState({
  testID,
  styles,
}: {
  testID: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View testID={testID} style={styles.centeredState}>
      <Text style={styles.successTitle}>Thank you!</Text>
      <Text style={styles.successBody}>Your feedback helps us improve.</Text>
    </View>
  );
}

function AlreadySubmittedState({
  testID,
  styles,
}: {
  testID: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View testID={testID} style={styles.centeredState}>
      <Text style={styles.successTitle}>Already submitted</Text>
      <Text style={styles.successBody}>
        You&apos;ve already shared your feedback for this order.
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(
  colors: Record<string, string>,
  spacing: Record<string, number>,
  borderRadius: Record<string, number>,
) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    card: {
      width: '100%',
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    title: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: colors.espresso,
      lineHeight: 22,
    },
    dismissButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: spacing.sm,
    },
    dismissButtonText: {
      fontSize: 18,
      color: colors.espressoLight,
    },
    scaleLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    scaleLabelText: {
      fontSize: 11,
      color: colors.espressoLight,
    },
    scoresRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    scoreButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.sandBase,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scoreButtonSelected: {
      backgroundColor: colors.sunsetCoral,
      borderColor: colors.sunsetCoral,
    },
    scoreButtonText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.espresso,
    },
    scoreButtonTextSelected: {
      color: colors.white,
      fontWeight: '700',
    },
    commentInput: {
      borderWidth: 1,
      borderColor: colors.sandBase,
      borderRadius: borderRadius.md,
      padding: spacing.sm,
      fontSize: 14,
      color: colors.espresso,
      minHeight: 72,
      textAlignVertical: 'top',
    },
    charCount: {
      fontSize: 11,
      color: colors.espressoLight,
      textAlign: 'right',
      marginTop: 2,
      marginBottom: spacing.sm,
    },
    errorContainer: {
      backgroundColor: colors.sandLight,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    errorText: {
      fontSize: 13,
      color: colors.errorText,
    },
    submitButton: {
      backgroundColor: colors.sunsetCoral,
      borderRadius: borderRadius.md,
      paddingVertical: 12,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.45,
    },
    submitButtonText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: '700',
    },
    centeredState: {
      paddingVertical: spacing.xl,
      alignItems: 'center',
      gap: spacing.sm,
    },
    successTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.espresso,
    },
    successBody: {
      fontSize: 14,
      color: colors.espressoLight,
      textAlign: 'center',
    },
  });
}
