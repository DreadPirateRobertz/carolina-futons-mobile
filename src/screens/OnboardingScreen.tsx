import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';

interface Slide {
  title: string;
  description: string;
  emoji: string;
}

const SLIDES: Slide[] = [
  {
    title: 'Welcome to Carolina Futons',
    description: 'Handcrafted comfort from the Blue Ridge Mountains, delivered to your door.',
    emoji: '🛋️',
  },
  {
    title: 'See It In Your Space',
    description: 'Use AR to preview how our futons look in your room before you buy.',
    emoji: '📱',
  },
  {
    title: 'Shop With Confidence',
    description: 'Free shipping, easy returns, and flexible payment options on every order.',
    emoji: '✨',
  },
];

interface Props {
  onComplete: () => void;
  testID?: string;
}

export function OnboardingScreen({ onComplete, testID }: Props) {
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  const isLastSlide = currentIndex === SLIDES.length - 1;
  const slide = SLIDES[currentIndex];

  const handleNext = () => {
    if (isLastSlide) return;
    setCurrentIndex((i) => i + 1);
  };

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'onboarding-screen'}
    >
      {/* Skip button */}
      {!isLastSlide && (
        <TouchableOpacity
          style={[styles.skipButton, { top: spacing.xxl }]}
          onPress={onComplete}
          testID="onboarding-skip-button"
          accessibilityLabel="Skip onboarding"
          accessibilityRole="button"
        >
          <Text style={[styles.skipText, { color: colors.muted }]}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slide content */}
      <View style={styles.slideContainer}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text
          style={[
            styles.title,
            {
              color: colors.espresso,
              fontFamily: typography.headingFamily,
            },
          ]}
        >
          {slide.title}
        </Text>
        <Text
          style={[
            styles.description,
            {
              color: colors.espressoLight,
              fontFamily: typography.bodyFamily,
            },
          ]}
        >
          {slide.description}
        </Text>
      </View>

      {/* Pagination dots */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, index) => (
          <View
            key={index}
            testID={`onboarding-dot-${index}`}
            style={[
              styles.dot,
              {
                backgroundColor: index === currentIndex ? colors.sunsetCoral : colors.sandLight,
                width: index === currentIndex ? 24 : 8,
                borderRadius: borderRadius.pill,
              },
            ]}
          />
        ))}
      </View>

      {/* Action button */}
      <View style={[styles.buttonContainer, { paddingHorizontal: spacing.lg }]}>
        {isLastSlide ? (
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.sunsetCoral,
                borderRadius: borderRadius.button,
              },
              shadows.button,
            ]}
            onPress={onComplete}
            testID="onboarding-get-started-button"
            accessibilityLabel="Get started"
            accessibilityRole="button"
          >
            <Text style={[styles.actionButtonText, { color: colors.white }]}>Get Started</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.sunsetCoral,
                borderRadius: borderRadius.button,
              },
              shadows.button,
            ]}
            onPress={handleNext}
            testID="onboarding-next-button"
            accessibilityLabel="Next slide"
            accessibilityRole="button"
          >
            <Text style={[styles.actionButtonText, { color: colors.white }]}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
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
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    height: 8,
  },
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
