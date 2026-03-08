/**
 * @module BrandedSpinner
 *
 * Carolina Futons branded loading spinner. Replaces generic ActivityIndicator
 * with a warm-toned pulsing dot animation matching the Blue Ridge mountain
 * aesthetic. Uses three dots that pulse in sequence.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors as tokenColors } from '@/theme/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  size?: 'small' | 'large';
  color?: string;
  testID?: string;
}

function PulsingDot({ delay, size, color }: { delay: number; size: number; color: string }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 0.8 : 0.6);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 0.8;
      return;
    }
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
          withTiming(0.6, { duration: 400, easing: Easing.in(Easing.ease) }),
        ),
        -1,
      ),
    );
  }, [scale, delay, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

export function BrandedSpinner({
  size = 'small',
  color = tokenColors.mountainBlue,
  testID,
}: Props) {
  const dotSize = size === 'large' ? 10 : 6;
  const gap = size === 'large' ? 8 : 5;

  return (
    <View
      style={[styles.container, { gap }]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      <PulsingDot delay={0} size={dotSize} color={color} />
      <PulsingDot delay={150} size={dotSize} color={color} />
      <PulsingDot delay={300} size={dotSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
});
