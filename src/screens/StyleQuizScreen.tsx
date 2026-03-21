/**
 * @module StyleQuizScreen
 *
 * Standalone style-preference quiz accessible from Account settings.
 * Lets users set or update room type, aesthetic preference, and primary
 * use-case. Persists answers via AsyncStorage through the useStyleQuiz hook.
 */
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { GlassCard } from '@/components/GlassCard';
import {
  useStyleQuiz,
  type RoomType,
  type StylePreference,
  type PrimaryUse,
} from '@/hooks/useStyleQuiz';

// ── Quiz Questions ────────────────────────────────────────────────

interface QuizOption<T extends string> {
  value: T;
  label: string;
  icon: string;
}

const ROOM_OPTIONS: QuizOption<RoomType>[] = [
  { value: 'living-room', label: 'Living Room', icon: '\u{1F6CB}' },
  { value: 'bedroom', label: 'Bedroom', icon: '\u{1F6CF}' },
  { value: 'studio', label: 'Studio', icon: '\u{1F3E0}' },
  { value: 'guest-room', label: 'Guest Room', icon: '\u{1F6AA}' },
];

const STYLE_OPTIONS: QuizOption<StylePreference>[] = [
  { value: 'modern', label: 'Modern & Clean', icon: '\u2728' },
  { value: 'rustic', label: 'Rustic & Warm', icon: '\u{1FAB5}' },
  { value: 'classic', label: 'Classic & Cozy', icon: '\u{1F4D6}' },
  { value: 'minimalist', label: 'Minimalist', icon: '\u25FB' },
];

const USE_OPTIONS: QuizOption<PrimaryUse>[] = [
  { value: 'seating', label: 'Everyday Seating', icon: '\u{1F9D8}' },
  { value: 'guest-bed', label: 'Guest Bed', icon: '\u{1F634}' },
  { value: 'dual-purpose', label: 'Dual-Purpose', icon: '\u{1F504}' },
  { value: 'kid-friendly', label: 'Kid-Friendly', icon: '\u{1F476}' },
];

const QUESTIONS: {
  title: string;
  subtitle: string;
  options: QuizOption<string>[];
  key: 'room' | 'style' | 'primaryUse';
}[] = [
  {
    title: 'What room is\nthis for?',
    subtitle: 'Help us find your perfect match',
    options: ROOM_OPTIONS,
    key: 'room',
  },
  {
    title: "What's your\nstyle?",
    subtitle: 'We\u2019ll curate picks that fit',
    options: STYLE_OPTIONS,
    key: 'style',
  },
  {
    title: 'What do you\nneed most?',
    subtitle: 'So we show the right features',
    options: USE_OPTIONS,
    key: 'primaryUse',
  },
];

const TOTAL_STEPS = QUESTIONS.length + 1; // 3 quiz + 1 completion

// ── Main Component ────────────────────────────────────────────────

interface Props {
  onComplete: () => void;
  onBack: () => void;
  testID?: string;
}

export function StyleQuizScreen({ onComplete, onBack, testID }: Props) {
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();
  const [step, setStep] = useState(0);
  const { preferences, setRoom, setStyle, setPrimaryUse, savePreferences } = useStyleQuiz();

  const isCompletion = step === QUESTIONS.length;

  const handleSelect = useCallback(
    (value: string) => {
      if (step === 0) setRoom(value as RoomType);
      else if (step === 1) setStyle(value as StylePreference);
      else if (step === 2) setPrimaryUse(value as PrimaryUse);
      setStep((s) => s + 1);
    },
    [step, setRoom, setStyle, setPrimaryUse],
  );

  const handleBack = useCallback(() => {
    if (step === 0) {
      onBack();
    } else {
      setStep((s) => s - 1);
    }
  }, [step, onBack]);

  const handleSave = useCallback(async () => {
    await savePreferences();
    onComplete();
  }, [savePreferences, onComplete]);

  // ── Progress ────────────────────────────────────────────────────

  const renderProgress = () => (
    <View
      style={[styles.progressContainer, { paddingHorizontal: spacing.lg }]}
      testID="style-quiz-progress"
    >
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: darkPalette.surfaceElevated, borderRadius: borderRadius.pill },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.sunsetCoral,
              borderRadius: borderRadius.pill,
              width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
            },
          ]}
        />
      </View>
      <Text
        style={[
          styles.progressLabel,
          { color: darkPalette.textMuted, fontFamily: typography.bodyFamily },
        ]}
      >
        {step + 1} / {TOTAL_STEPS}
      </Text>
    </View>
  );

  // ── Quiz Step ───────────────────────────────────────────────────

  const renderQuizStep = () => {
    const q = QUESTIONS[step];
    if (!q) return null;

    return (
      <View style={styles.quizContainer} testID={`style-quiz-step-${step}`}>
        <Text
          style={[
            styles.quizTitle,
            { color: darkPalette.textPrimary, fontFamily: typography.headingFamily },
          ]}
        >
          {q.title}
        </Text>
        <Text
          style={[
            styles.quizSubtitle,
            { color: darkPalette.textMuted, fontFamily: typography.bodyFamily },
          ]}
        >
          {q.subtitle}
        </Text>
        <View style={styles.optionsGrid}>
          {q.options.map((option) => {
            const isSelected = preferences[q.key] === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                testID={`quiz-option-${option.value}`}
                style={styles.optionTouchable}
                onPress={() => handleSelect(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={option.label}
              >
                <GlassCard
                  intensity={isSelected ? 'heavy' : 'light'}
                  style={[
                    styles.optionCard,
                    {
                      borderRadius: borderRadius.card,
                      borderColor: isSelected ? colors.sunsetCoral : darkPalette.glassBorder,
                    },
                  ]}
                >
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: isSelected ? colors.sunsetCoral : darkPalette.textPrimary,
                        fontFamily: isSelected
                          ? typography.bodyFamilySemiBold
                          : typography.bodyFamily,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </GlassCard>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ── Completion ──────────────────────────────────────────────────

  const renderCompletion = () => {
    const styleName = STYLE_OPTIONS.find((o) => o.value === preferences.style)?.label ?? 'your';
    return (
      <View style={styles.completionContainer} testID="style-quiz-completion">
        <Text
          style={[
            styles.accentLabel,
            { color: colors.sunsetCoral, fontFamily: typography.bodyFamilySemiBold },
          ]}
        >
          Preferences updated
        </Text>
        <Text
          style={[
            styles.completionTitle,
            { color: darkPalette.textPrimary, fontFamily: typography.headingFamily },
          ]}
        >
          Looking good!
        </Text>
        <Text
          style={[
            styles.completionBody,
            { color: darkPalette.textMuted, fontFamily: typography.bodyFamily },
          ]}
        >
          {`We\u2019ll highlight ${styleName.toLowerCase()} picks and features that fit your lifestyle.`}
        </Text>
      </View>
    );
  };

  // ── Layout ──────────────────────────────────────────────────────

  return (
    <View
      style={[styles.root, { backgroundColor: darkPalette.background }]}
      testID={testID ?? 'style-quiz-screen'}
    >
      {/* Back button */}
      <TouchableOpacity
        style={[styles.backButton, { top: spacing.xxl }]}
        onPress={handleBack}
        testID="style-quiz-back-button"
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Text style={[styles.backText, { color: darkPalette.textMuted }]}>{'\u2190'}</Text>
      </TouchableOpacity>

      {/* Progress */}
      <View style={[styles.progressWrapper, { top: spacing.xxl + 40 }]}>{renderProgress()}</View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {!isCompletion && renderQuizStep()}
        {isCompletion && renderCompletion()}
      </ScrollView>

      {/* Save button on completion */}
      {isCompletion && (
        <View style={[styles.buttonContainer, { paddingHorizontal: spacing.lg }]}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.sunsetCoral,
                borderRadius: borderRadius.button,
              },
              shadows.button,
            ]}
            onPress={handleSave}
            testID="style-quiz-save-button"
            accessibilityLabel="Save preferences"
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.white, fontFamily: typography.bodyFamilySemiBold },
              ]}
            >
              Save Preferences
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: 24,
    zIndex: 10,
    padding: 8,
  },
  backText: {
    fontSize: 22,
    fontWeight: '400',
  },
  progressWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 5,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 36,
    textAlign: 'right',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 120,
    paddingBottom: 32,
  },
  // Quiz
  quizContainer: {
    alignItems: 'center',
  },
  quizTitle: {
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 39,
    letterSpacing: -0.34,
    marginBottom: 8,
  },
  quizSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  optionTouchable: {
    width: '46%',
  },
  optionCard: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    width: '100%',
  },
  optionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Completion
  completionContainer: {
    alignItems: 'center',
  },
  accentLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  completionTitle: {
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 39,
    letterSpacing: -0.34,
    marginBottom: 20,
  },
  completionBody: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 27,
    maxWidth: 300,
  },
  // Bottom action
  buttonContainer: {
    paddingBottom: 48,
  },
  actionButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
});
