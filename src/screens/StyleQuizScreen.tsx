/**
 * @module StyleQuizScreen
 *
 * Standalone style-preference quiz accessible from Account settings.
 * Collects answers matching the Wix getQuizRecommendations() API contract:
 *   roomType, stylePreference, primaryUse, sizeNeeds, budgetRange
 *
 * Shows a personality label and curated product grid on completion.
 * Persists answers via AsyncStorage through the useStyleQuiz hook.
 * Error boundary provided by withScreenErrorBoundary in AppNavigator.
 */
import React, { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { GlassCard } from '@/components/GlassCard';
import { useProductBySlug } from '@/hooks/useProduct';
import {
  useStyleQuiz,
  getRecommendation,
  type RoomType,
  type StylePreference,
  type PrimaryUse,
  type SizeNeeds,
  type BudgetRange,
} from '@/hooks/useStyleQuiz';
import { useGamificationEvents } from '@/hooks/useGamificationEvents';
import { useAuth } from '@/hooks/useAuth';
import { recordSommelierResult } from '@/services/sommelierResults';

// ── Quiz Questions ────────────────────────────────────────────────

interface QuizOption<T extends string> {
  value: T;
  label: string;
  icon: string;
}

const ROOM_OPTIONS: QuizOption<RoomType>[] = [
  { value: 'living-room', label: 'Living Room', icon: '\u{1F6CB}' },
  { value: 'bedroom', label: 'Bedroom', icon: '\u{1F6CF}' },
  { value: 'guest-room', label: 'Guest Room', icon: '\u{1F6AA}' },
  { value: 'dorm', label: 'Dorm Room', icon: '\u{1F3E0}' },
  { value: 'office', label: 'Home Office', icon: '\u{1F4BC}' },
];

const STYLE_OPTIONS: QuizOption<StylePreference>[] = [
  { value: 'modern', label: 'Modern & Clean', icon: '\u2728' },
  { value: 'rustic', label: 'Rustic & Warm', icon: '\u{1FAB5}' },
  { value: 'classic', label: 'Classic & Cozy', icon: '\u{1F4D6}' },
];

const USE_OPTIONS: QuizOption<PrimaryUse>[] = [
  { value: 'sitting', label: 'Everyday Seating', icon: '\u{1F9D8}' },
  { value: 'sleeping', label: 'Guest Bed', icon: '\u{1F634}' },
  { value: 'both', label: 'Sitting & Sleeping', icon: '\u{1F504}' },
];

const SIZE_OPTIONS: QuizOption<SizeNeeds>[] = [
  { value: 'twin', label: 'Twin', icon: '\u{1F6CF}' },
  { value: 'full', label: 'Full', icon: '\u{1F6CB}' },
  { value: 'queen', label: 'Queen', icon: '\u{1F451}' },
];

const BUDGET_OPTIONS: QuizOption<BudgetRange>[] = [
  { value: 'under-500', label: 'Under $500', icon: '\u{1F4B5}' },
  { value: '500-1000', label: '$500 – $1,000', icon: '\u{1F4B0}' },
  { value: '1000-2000', label: '$1,000 – $2,000', icon: '\u{1F48E}' },
  { value: 'over-2000', label: 'Over $2,000', icon: '\u{1F3C6}' },
];

const QUESTIONS: {
  title: string;
  subtitle: string;
  options: QuizOption<string>[];
  key: 'roomType' | 'stylePreference' | 'primaryUse' | 'sizeNeeds' | 'budgetRange';
}[] = [
  {
    title: 'What room is\nthis for?',
    subtitle: 'Help us find your perfect match',
    options: ROOM_OPTIONS,
    key: 'roomType',
  },
  {
    title: "What's your\nstyle?",
    subtitle: 'We\u2019ll curate picks that fit',
    options: STYLE_OPTIONS,
    key: 'stylePreference',
  },
  {
    title: 'How will you\nuse it most?',
    subtitle: 'So we show the right features',
    options: USE_OPTIONS,
    key: 'primaryUse',
  },
  {
    title: 'What size\ndo you need?',
    subtitle: 'We\u2019ll match the right fit',
    options: SIZE_OPTIONS,
    key: 'sizeNeeds',
  },
  {
    title: "What's your\nbudget?",
    subtitle: 'So we highlight the best value',
    options: BUDGET_OPTIONS,
    key: 'budgetRange',
  },
];

const TOTAL_STEPS = QUESTIONS.length + 1; // 5 quiz + 1 completion

// ── Main Component ────────────────────────────────────────────────

interface Props {
  onComplete: () => void;
  onBack: () => void;
  /** Called with a product slug when a product card in the completion grid is tapped. */
  onProductPress?: (slug: string) => void;
  testID?: string;
}

// ── Quiz product card ─────────────────────────────────────────────────────────

/**
 * Single card in the quiz results grid. Fetches thumbnail + name from Wix
 * Stores via useProductBySlug; falls back to slug text if unavailable. cm-49p
 */
function QuizProductCard({ slug, onPress }: { slug: string; onPress: () => void }) {
  const { colors, borderRadius, typography } = useTheme();
  const { product } = useProductBySlug(slug);
  const thumbnail = product?.images[0]?.uri ?? null;
  const name = product?.name ?? null;

  return (
    <TouchableOpacity
      testID={`quiz-product-${slug}`}
      style={[
        styles.productCard,
        { borderRadius: borderRadius.card, backgroundColor: darkPalette.surface },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name ? `View ${name}` : `View ${slug}`}
    >
      {thumbnail ? (
        <Image
          source={{ uri: thumbnail }}
          style={styles.productThumbnail}
          contentFit="cover"
          testID={`quiz-product-img-${slug}`}
          accessibilityLabel={product?.images[0]?.alt ?? name ?? slug}
          cachePolicy="memory-disk"
        />
      ) : (
        <View
          style={[styles.productThumbnailPlaceholder, { backgroundColor: colors.sandBase + '33' }]}
        />
      )}
      <Text
        style={[
          styles.productSlug,
          { color: darkPalette.textPrimary, fontFamily: typography.bodyFamily },
        ]}
        numberOfLines={2}
      >
        {name ?? slug}
      </Text>
    </TouchableOpacity>
  );
}

export function StyleQuizScreen({ onComplete, onBack, onProductPress, testID }: Props) {
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();
  const [step, setStep] = useState(0);
  const {
    preferences,
    setRoomType,
    setStylePreference,
    setPrimaryUse,
    setSizeNeeds,
    setBudgetRange,
    savePreferences,
  } = useStyleQuiz();
  const { styleQuizComplete } = useGamificationEvents();
  const { user } = useAuth();

  const isCompletion = step === QUESTIONS.length;

  const handleSelect = useCallback(
    (value: string) => {
      if (step === 0) setRoomType(value as RoomType);
      else if (step === 1) setStylePreference(value as StylePreference);
      else if (step === 2) setPrimaryUse(value as PrimaryUse);
      else if (step === 3) setSizeNeeds(value as SizeNeeds);
      else if (step === 4) setBudgetRange(value as BudgetRange);
      setStep((s) => s + 1);
    },
    [step, setRoomType, setStylePreference, setPrimaryUse, setSizeNeeds, setBudgetRange],
  );

  const handleBack = useCallback(() => {
    if (step === 0) {
      onBack();
    } else {
      setStep((s) => s - 1);
    }
  }, [step, onBack]);

  const handleSave = useCallback(async () => {
    try {
      await savePreferences();
      // Sync to Wix SommelierResults CMS (hq-5hnml) — fire-and-forget, non-blocking
      if (user?.id) {
        recordSommelierResult(user.id, preferences).catch((e: unknown) =>
          console.warn('[StyleQuiz] recordSommelierResult failed', e),
        );
      }
      styleQuizComplete(preferences.stylePreference ?? '', preferences.sizeNeeds ?? '')
        .then(() =>
          AsyncStorage.removeItem('daily-quests').catch((e: unknown) =>
            console.warn('[StyleQuiz] quest cache clear failed', e),
          ),
        )
        .catch((e: unknown) => console.warn('[StyleQuiz] styleQuizComplete failed', e));
      onComplete();
    } catch {
      Alert.alert('Save Failed', 'We couldn\u2019t save your preferences. Please try again.', [
        { text: 'OK' },
      ]);
    }
  }, [savePreferences, onComplete, styleQuizComplete, preferences, user?.id]);

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
    const styleName =
      STYLE_OPTIONS.find((o) => o.value === preferences.stylePreference)?.label ?? 'your';
    const recommendation = getRecommendation(preferences.stylePreference, preferences.sizeNeeds);

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
            styles.personalityLabel,
            { color: colors.sunsetCoral, fontFamily: typography.bodyFamilySemiBold },
          ]}
          testID="style-quiz-personality-label"
        >
          {recommendation.label}
        </Text>
        <Text
          style={[
            styles.completionBody,
            { color: darkPalette.textMuted, fontFamily: typography.bodyFamily },
          ]}
        >
          {`We\u2019ll highlight ${styleName.toLowerCase()} picks and features that fit your lifestyle.`}
        </Text>

        {/* Curated product grid — thumbnails fetched from Wix Stores (cm-49p) */}
        <View style={styles.productGrid} testID="style-quiz-product-grid">
          {recommendation.productSlugs.map((slug) => (
            <QuizProductCard key={slug} slug={slug} onPress={() => onProductPress?.(slug)} />
          ))}
        </View>
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
    marginBottom: 8,
  },
  personalityLabel: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  completionBody: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 27,
    maxWidth: 300,
    marginBottom: 24,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  productCard: {
    width: '100%',
    overflow: 'hidden',
  },
  productCardWrapper: {
    width: '46%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  productThumbnail: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  productThumbnailPlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  productSlug: {
    fontSize: 13,
    textAlign: 'center',
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
