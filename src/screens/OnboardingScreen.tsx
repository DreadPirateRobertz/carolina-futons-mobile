/**
 * @module OnboardingScreen
 *
 * First-launch experience combining brand storytelling (3 slides about
 * Carolina Futons' Blue Ridge heritage) with a style-preference quiz
 * (room type, aesthetic, primary use). Quiz answers feed the
 * recommendation engine so the home screen can surface personalized picks.
 *
 * Progression: 3 brand slides -> 3 quiz steps -> completion summary.
 * Users can skip at any point; preferences are persisted on finish.
 */
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { MountainSkyline } from '@/components/MountainSkyline';
import { GlassCard } from '@/components/GlassCard';
import {
  useStyleQuiz,
  type RoomType,
  type StylePreference,
  type PrimaryUse,
} from '@/hooks/useStyleQuiz';

// ── Brand Story Slides ──────────────────────────────────────────────

interface BrandSlide {
  headline: string;
  body: string;
  accent: string;
}

const BRAND_SLIDES: BrandSlide[] = [
  {
    headline: 'Carolina Futons',
    body: 'Handcrafted comfort from the Blue Ridge Mountains.\nReal wood. Real craftsmanship. Delivered to your door.',
    accent: 'Est. Hendersonville, NC',
  },
  {
    headline: 'Born in the\nBlue Ridge',
    body: 'Every frame is built from Appalachian hardwood by local artisans who take pride in their craft.',
    accent: 'Solid wood \u00b7 Built to last',
  },
  {
    headline: 'See It in\nYour Space',
    body: 'Use augmented reality to preview how our futons look in your room before you buy.',
    accent: 'Try AR \u00b7 Free shipping \u00b7 Easy returns',
  },
];

// ── Style Quiz Questions ────────────────────────────────────────────

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

// ── Total Steps ─────────────────────────────────────────────────────

const TOTAL_STEPS = BRAND_SLIDES.length + 3 + 1; // 3 brand + 3 quiz + 1 completion

// ── Main Component ──────────────────────────────────────────────────

interface Props {
  onComplete: () => void;
  testID?: string;
}

/** Multi-step onboarding: brand story slides followed by a style-preference quiz. */
export function OnboardingScreen({ onComplete, testID }: Props) {
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();
  const [step, setStep] = useState(0);
  const { preferences, setRoom, setStyle, setPrimaryUse, savePreferences } = useStyleQuiz();

  const isBrandPhase = step < BRAND_SLIDES.length;
  const quizStep = step - BRAND_SLIDES.length; // 0, 1, 2 for quiz; 3 for completion
  const isCompletionStep = step === TOTAL_STEPS - 1;
  const isLastBrandSlide = step === BRAND_SLIDES.length - 1;

  const handleNext = useCallback(() => {
    setStep((s) => s + 1);
  }, []);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const handleQuizSelect = useCallback(
    (value: string) => {
      if (quizStep === 0) setRoom(value as RoomType);
      else if (quizStep === 1) setStyle(value as StylePreference);
      else if (quizStep === 2) setPrimaryUse(value as PrimaryUse);
      // Auto-advance after selection
      setStep((s) => s + 1);
    },
    [quizStep, setRoom, setStyle, setPrimaryUse],
  );

  const handleFinish = useCallback(async () => {
    await savePreferences();
    onComplete();
  }, [savePreferences, onComplete]);

  // ── Progress Bar ────────────────────────────────────────────────

  const renderProgress = () => (
    <View style={[styles.progressContainer, { paddingHorizontal: spacing.lg }]}>
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: darkPalette.surfaceElevated, borderRadius: borderRadius.pill },
        ]}
      >
        <View
          testID="onboarding-progress-bar"
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
        style={[styles.progressLabel, { color: darkPalette.textMuted, fontFamily: typography.bodyFamily }]}
      >
        {step + 1} / {TOTAL_STEPS}
      </Text>
    </View>
  );

  // ── Brand Story Slide ───────────────────────────────────────────

  const renderBrandSlide = () => {
    const slide = BRAND_SLIDES[step];
    return (
      <View style={styles.slideContainer} testID={`onboarding-brand-slide-${step}`}>
        <Text
          style={[
            styles.accentLabel,
            {
              color: colors.sunsetCoral,
              fontFamily: typography.bodyFamilySemiBold,
            },
          ]}
        >
          {slide.accent}
        </Text>
        <Text
          style={[
            step === 0 ? styles.heroHeadline : styles.headline,
            {
              color: darkPalette.textPrimary,
              fontFamily: typography.headingFamily,
            },
          ]}
        >
          {slide.headline}
        </Text>
        <Text
          style={[
            styles.bodyText,
            {
              color: darkPalette.textMuted,
              fontFamily: typography.bodyFamily,
            },
          ]}
        >
          {slide.body}
        </Text>
      </View>
    );
  };

  // ── Quiz Step ───────────────────────────────────────────────────

  const renderQuizStep = () => {
    const questions: {
      title: string;
      subtitle: string;
      options: QuizOption<string>[];
      selected: string | null;
    }[] = [
      {
        title: 'What room is\nthis for?',
        subtitle: 'Help us find your perfect match',
        options: ROOM_OPTIONS,
        selected: preferences.room,
      },
      {
        title: "What's your\nstyle?",
        subtitle: 'We\u2019ll curate picks that fit',
        options: STYLE_OPTIONS,
        selected: preferences.style,
      },
      {
        title: 'What do you\nneed most?',
        subtitle: 'So we show the right features',
        options: USE_OPTIONS,
        selected: preferences.primaryUse,
      },
    ];

    const q = questions[quizStep];
    if (!q) return null;

    return (
      <View style={styles.quizContainer} testID={`onboarding-quiz-step-${quizStep}`}>
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
            const isSelected = q.selected === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                testID={`quiz-option-${option.value}`}
                style={styles.optionTouchable}
                onPress={() => handleQuizSelect(option.value)}
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
      <View style={styles.slideContainer} testID="onboarding-completion">
        <Text
          style={[
            styles.accentLabel,
            { color: colors.sunsetCoral, fontFamily: typography.bodyFamilySemiBold },
          ]}
        >
          You're all set
        </Text>
        <Text
          style={[
            styles.heroHeadline,
            { color: darkPalette.textPrimary, fontFamily: typography.headingFamily },
          ]}
        >
          Your space,{'\n'}your way
        </Text>
        <Text
          style={[
            styles.bodyText,
            { color: darkPalette.textMuted, fontFamily: typography.bodyFamily },
          ]}
        >
          {`We\u2019ll highlight ${styleName.toLowerCase()} picks and features that fit your lifestyle. You can always update your preferences later.`}
        </Text>
      </View>
    );
  };

  // ── Layout ──────────────────────────────────────────────────────

  return (
    <View
      style={[styles.root, { backgroundColor: darkPalette.background }]}
      testID={testID ?? 'onboarding-screen'}
    >
      {/* Mountain skyline backdrop for brand slides */}
      {isBrandPhase && (
        <View style={styles.skylineBackdrop}>
          <MountainSkyline variant="sunrise" height={100} testID="onboarding-skyline" />
        </View>
      )}

      {/* Skip button — visible except on completion */}
      {!isCompletionStep && (
        <TouchableOpacity
          style={[styles.skipButton, { top: spacing.xxl }]}
          onPress={onComplete}
          testID="onboarding-skip-button"
          accessibilityLabel="Skip onboarding"
          accessibilityRole="button"
        >
          <Text style={[styles.skipText, { color: darkPalette.textMuted }]}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Back button — visible after first slide */}
      {step > 0 && !isCompletionStep && (
        <TouchableOpacity
          style={[styles.backButton, { top: spacing.xxl }]}
          onPress={handleBack}
          testID="onboarding-back-button"
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={[styles.backText, { color: darkPalette.textMuted }]}>{'\u2190'}</Text>
        </TouchableOpacity>
      )}

      {/* Progress */}
      <View style={[styles.progressWrapper, { top: spacing.xxl + 40 }]}>{renderProgress()}</View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {isBrandPhase && renderBrandSlide()}
        {!isBrandPhase && !isCompletionStep && renderQuizStep()}
        {isCompletionStep && renderCompletion()}
      </ScrollView>

      {/* Bottom action — show Next for brand slides, Start Shopping for completion */}
      {(isBrandPhase || isCompletionStep) && (
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
            onPress={isCompletionStep ? handleFinish : handleNext}
            testID={isCompletionStep ? 'onboarding-get-started-button' : 'onboarding-next-button'}
            accessibilityLabel={isCompletionStep ? 'Start shopping' : 'Next'}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.white, fontFamily: typography.bodyFamilySemiBold },
              ]}
            >
              {isCompletionStep ? 'Start Shopping' : 'Next'}
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
  skylineBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  skipButton: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
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
  // ── Brand slides ──
  slideContainer: {
    alignItems: 'center',
  },
  accentLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  heroHeadline: {
    fontSize: 42,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: -0.84,
    marginBottom: 20,
  },
  headline: {
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 39,
    letterSpacing: -0.34,
    marginBottom: 20,
  },
  bodyText: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 27,
    maxWidth: 300,
  },
  // ── Quiz ──
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
  // ── Bottom action ──
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
