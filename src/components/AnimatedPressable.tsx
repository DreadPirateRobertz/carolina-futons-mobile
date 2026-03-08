/**
 * @module AnimatedPressable
 *
 * Drop-in replacement for TouchableOpacity/Pressable that adds spring-based
 * scale-down feedback and optional haptic feedback on press. Used across the
 * app wherever tactile, polished press interactions are needed (CTA = Call To
 * Action buttons, cards, etc.).
 */

import React, { useCallback } from 'react';
import { Pressable, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const AnimatedPress = Animated.createAnimatedComponent(Pressable);

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
  scaleDown?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'tab';
  disabled?: boolean;
}

const SPRING_CONFIG = { damping: 15, stiffness: 150 };

/** Pressable with spring scale-down animation and configurable haptic feedback. */
export function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  style,
  testID,
  haptic = 'light',
  scaleDown = 0.96,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  disabled,
}: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!reduceMotion) {
      scale.value = withSpring(scaleDown, SPRING_CONFIG);
    }
  }, [scale, scaleDown, reduceMotion]);

  const handlePressOut = useCallback(() => {
    if (!reduceMotion) {
      scale.value = withSpring(1, SPRING_CONFIG);
    }
  }, [scale, reduceMotion]);

  const handlePress = useCallback(() => {
    if (haptic !== 'none') {
      const feedbackStyle =
        haptic === 'heavy'
          ? Haptics.ImpactFeedbackStyle.Heavy
          : haptic === 'medium'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light;
      Haptics.impactAsync(feedbackStyle);
    }
    onPress?.();
  }, [haptic, onPress]);

  return (
    <AnimatedPress
      testID={testID}
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      disabled={disabled}
    >
      {children}
    </AnimatedPress>
  );
}
