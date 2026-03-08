/**
 * @module SkeletonLoader
 *
 * Generic skeleton loading primitive for the dark theme. Renders an animated
 * rectangle or circle that pulses opacity. Used as a building block for
 * screen-specific skeleton compositions (SkeletonProductDetail, etc.).
 * Unlike Shimmer (light theme), this uses the dark palette surface color.
 */

import React, { useEffect } from 'react';
import { DimensionValue, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { darkPalette } from '@/theme/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  width?: DimensionValue;
  height?: number;
  variant?: 'rect' | 'circle' | 'text';
  borderRadius?: number;
  style?: ViewStyle;
  testID?: string;
}

/** Animated dark-themed skeleton placeholder with configurable shape and size. */
export function SkeletonLoader({
  width = '100%',
  height = 20,
  variant = 'rect',
  borderRadius: customRadius,
  style,
  testID,
}: Props) {
  const reduceMotion = useReducedMotion();
  const shimmer = useSharedValue(reduceMotion ? 0.5 : 0);

  useEffect(() => {
    if (reduceMotion) {
      shimmer.value = 0.5;
      return;
    }
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [shimmer, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.4, 0.9]),
  }));

  const radius =
    customRadius ?? (variant === 'circle' ? (typeof width === 'number' ? width / 2 : 24) : 6);

  return (
    <Animated.View
      testID={testID}
      style={[
        {
          width,
          height: variant === 'circle' ? width : height,
          borderRadius: radius,
          backgroundColor: darkPalette.surface,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
