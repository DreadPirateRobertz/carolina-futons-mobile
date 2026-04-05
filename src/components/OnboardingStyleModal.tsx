/**
 * @module OnboardingStyleModal
 *
 * Multi-step onboarding modal that captures furniture style preference
 * (Modern/Coastal/Rustic/Traditional) and room type — cm-qdm.
 *
 * Flow: Step 0 (furniture style) → Step 1 (room type) → Step 2 (save + complete).
 * Persists to AsyncStorage and Wix MemberStylePreferences CMS via useOnboardingStyleQuiz.
 */

import React, { useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/theme';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { useAuth } from '@/hooks/useAuth';
import {
  useOnboardingStyleQuiz,
  type FurnitureStyle,
  type OnboardingRoomType,
} from '@/hooks/useOnboardingStyleQuiz';

// ── Option definitions ────────────────────────────────────────────────────────

interface QuizOption<T extends string> {
  value: T;
  label: string;
  icon: string;
}

const STYLE_OPTIONS: QuizOption<FurnitureStyle>[] = [
  { value: 'modern', label: 'Modern & Clean', icon: '✨' },
  { value: 'coastal', label: 'Coastal & Bright', icon: '🌊' },
  { value: 'rustic', label: 'Rustic & Warm', icon: '🪵' },
  { value: 'traditional', label: 'Traditional & Classic', icon: '📖' },
];

const ROOM_OPTIONS: QuizOption<OnboardingRoomType>[] = [
  { value: 'living-room', label: 'Living Room', icon: '🛋' },
  { value: 'bedroom', label: 'Bedroom', icon: '🛏' },
  { value: 'guest-room', label: 'Guest Room', icon: '🚪' },
  { value: 'dorm', label: 'Dorm Room', icon: '🏠' },
  { value: 'office', label: 'Home Office', icon: '💼' },
];

const TOTAL_STEPS = 3; // 0: style, 1: room, 2: completion

// ── Props ─────────────────────────────────────────────────────────────────────

export interface OnboardingStyleModalProps {
  visible: boolean;
  onDismiss: () => void;
  onComplete: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OnboardingStyleModal({ visible, onDismiss, onComplete }: OnboardingStyleModalProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const wixClient = useOptionalWixClient();
  const { user } = useAuth();

  const {
    furnitureStyle,
    roomType,
    step,
    isSaving,
    saveError,
    setFurnitureStyle,
    setRoomType,
    goBack,
    save,
  } = useOnboardingStyleQuiz({ wixClient, memberId: user?.id });

  const handleBack = useCallback(() => {
    if (step === 0) {
      onDismiss();
    } else {
      goBack();
    }
  }, [step, onDismiss, goBack]);

  const handleSave = useCallback(async () => {
    const success = await save();
    if (success) {
      onComplete();
    }
  }, [save, onComplete]);

  if (!visible) return null;

  // ── Progress ──────────────────────────────────────────────────────────────

  const progressStep = Math.min(step + 1, TOTAL_STEPS);

  const renderProgress = () => (
    <View style={styles.progressContainer} testID="quiz-progress">
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.sunsetCoral,
              width: `${(progressStep / TOTAL_STEPS) * 100}%`,
            },
          ]}
        />
      </View>
      <Text style={[styles.progressLabel, { color: colors.sunsetCoral }]} testID="quiz-progress-label">
        {progressStep} / {TOTAL_STEPS}
      </Text>
    </View>
  );

  // ── Step 0: Furniture Style ───────────────────────────────────────────────

  const renderStyleStep = () => (
    <View testID="style-step-0" style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { fontFamily: typography.headingFamily }]}>
        What's your{'\n'}style?
      </Text>
      <Text style={[styles.stepSubtitle, { fontFamily: typography.bodyFamily }]}>
        We'll surface picks that match your taste
      </Text>
      <View style={styles.optionsGrid}>
        {STYLE_OPTIONS.map((option) => {
          const isSelected = furnitureStyle === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              testID={`style-option-${option.value}`}
              style={[
                styles.optionButton,
                { borderRadius: borderRadius.card },
                isSelected && { borderColor: colors.sunsetCoral, backgroundColor: colors.sunsetCoral + '18' },
              ]}
              onPress={() => setFurnitureStyle(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={option.label}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text
                style={[
                  styles.optionLabel,
                  { fontFamily: isSelected ? typography.bodyFamilySemiBold : typography.bodyFamily },
                  isSelected && { color: colors.sunsetCoral },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // ── Step 1: Room Type ─────────────────────────────────────────────────────

  const renderRoomStep = () => (
    <View testID="style-step-1" style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { fontFamily: typography.headingFamily }]}>
        Which room{'\n'}is this for?
      </Text>
      <Text style={[styles.stepSubtitle, { fontFamily: typography.bodyFamily }]}>
        Help us find your perfect match
      </Text>
      <View style={styles.optionsGrid}>
        {ROOM_OPTIONS.map((option) => {
          const isSelected = roomType === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              testID={`room-option-${option.value}`}
              style={[
                styles.optionButton,
                { borderRadius: borderRadius.card },
                isSelected && { borderColor: colors.sunsetCoral, backgroundColor: colors.sunsetCoral + '18' },
              ]}
              onPress={() => setRoomType(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={option.label}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text
                style={[
                  styles.optionLabel,
                  { fontFamily: isSelected ? typography.bodyFamilySemiBold : typography.bodyFamily },
                  isSelected && { color: colors.sunsetCoral },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // ── Step 2: Completion ────────────────────────────────────────────────────

  const renderCompletion = () => {
    const styleLabel = STYLE_OPTIONS.find((o) => o.value === furnitureStyle)?.label ?? 'your';
    const roomLabel = ROOM_OPTIONS.find((o) => o.value === roomType)?.label ?? 'your room';

    return (
      <View testID="style-step-completion" style={styles.completionContainer}>
        <Text style={[styles.completionAccent, { color: colors.sunsetCoral, fontFamily: typography.bodyFamilySemiBold }]}>
          Almost done
        </Text>
        <Text style={[styles.completionTitle, { fontFamily: typography.headingFamily }]}>
          Perfect match!
        </Text>
        <Text style={[styles.completionBody, { fontFamily: typography.bodyFamily }]}>
          {styleLabel} style · {roomLabel}
        </Text>
        <Text style={[styles.completionSub, { fontFamily: typography.bodyFamily }]}>
          We'll personalize your shopping experience based on these preferences.
        </Text>

        {saveError ? (
          <Text testID="style-quiz-save-error" style={styles.errorText}>
            {saveError}
          </Text>
        ) : null}

        {isSaving && (
          <ActivityIndicator
            testID="style-quiz-saving-indicator"
            size="small"
            color={colors.sunsetCoral}
            style={styles.savingIndicator}
          />
        )}

        <TouchableOpacity
          testID="style-quiz-save-button"
          style={[
            styles.saveButton,
            { backgroundColor: isSaving ? '#D4C4A8' : colors.sunsetCoral, borderRadius: borderRadius.button },
          ]}
          onPress={handleSave}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSaving }}
          accessibilityLabel="Save preferences"
        >
          <Text style={[styles.saveButtonText, { fontFamily: typography.bodyFamilySemiBold }]}>
            Save Preferences
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Layout ────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleBack}
    >
      <View style={styles.overlay}>
        <View testID="onboarding-style-modal" style={[styles.sheet, { borderRadius: borderRadius.card }]}>
          {/* Back button */}
          <TouchableOpacity
            testID="style-quiz-back-button"
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={[styles.backText, { color: colors.sunsetCoral }]}>←</Text>
          </TouchableOpacity>

          {/* Progress */}
          {renderProgress()}

          {/* Content */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {step === 0 && renderStyleStep()}
            {step === 1 && renderRoomStep()}
            {step >= 2 && renderCompletion()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F5EFE4',
    paddingTop: 16,
    paddingBottom: 48,
    maxHeight: '90%',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  backText: {
    fontSize: 22,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 56,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0D6C5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#3A2518',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6B4C30',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    width: '100%',
  },
  optionButton: {
    width: '46%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D4C4A8',
    backgroundColor: '#fff',
  },
  optionIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  optionLabel: {
    fontSize: 13,
    color: '#3A2518',
    textAlign: 'center',
  },
  completionContainer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  completionAccent: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  completionTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#3A2518',
    textAlign: 'center',
    marginBottom: 8,
  },
  completionBody: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3A2518',
    textAlign: 'center',
    marginBottom: 8,
  },
  completionSub: {
    fontSize: 14,
    color: '#6B4C30',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 13,
    color: '#C96B44',
    textAlign: 'center',
    marginBottom: 12,
  },
  savingIndicator: {
    marginBottom: 12,
  },
  saveButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    width: '100%',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
