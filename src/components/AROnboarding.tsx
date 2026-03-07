/**
 * @module AROnboarding
 *
 * First-time AR tutorial overlay. Shows 3 steps explaining how to use
 * the AR features: surface scanning, furniture placement, and advanced
 * tools (measurement, comparison). Displayed as a semi-transparent
 * overlay on top of the camera view.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

const STEPS = [
  {
    icon: '\u{1F4F1}',
    title: 'Scan Your Room',
    body: 'Point your camera at the floor and slowly move your phone. The app will detect surfaces where furniture can be placed.',
  },
  {
    icon: '\u{1F6CB}',
    title: 'Place Furniture',
    body: 'Tap on a detected surface to place a futon. Drag to reposition, pinch to resize, and use two fingers to rotate.',
  },
  {
    icon: '\u{1F4CF}',
    title: 'Measure & Compare',
    body: 'Use the ruler tool to measure your space, or compare two models side-by-side to find the perfect fit.',
  },
];

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

export function AROnboarding({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <View style={styles.overlay} testID="ar-onboarding">
      <TouchableOpacity
        style={styles.skipButton}
        onPress={onSkip}
        testID="ar-onboarding-skip"
        accessibilityLabel="Skip tutorial"
        accessibilityRole="button"
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content} testID={`ar-onboarding-step-${step}`}>
        <Text style={styles.icon}>{current.icon}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>

        {/* Progress dots */}
        <View style={styles.progress} testID="ar-onboarding-progress">
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          testID="ar-onboarding-next"
          accessibilityLabel={isLast ? 'Get started' : 'Next'}
          accessibilityRole="button"
        >
          <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    padding: 8,
    zIndex: 51,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
    maxWidth: 360,
  },
  icon: {
    fontSize: 56,
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  progress: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    backgroundColor: '#E8845C',
    width: 24,
  },
  nextButton: {
    backgroundColor: '#E8845C',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
