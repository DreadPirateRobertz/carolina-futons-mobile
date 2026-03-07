/**
 * @module useScreenEntrance
 *
 * Provides a fade-in + slide-up entrance animation for screen content.
 * Returns an animated style to apply to the screen's root Animated.View,
 * giving each screen a polished reveal on mount.
 */
import { useEffect, useState } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface Options {
  delay?: number;
  duration?: number;
  translateY?: number;
}

const DEFAULTS = {
  delay: 0,
  duration: 400,
  translateY: 20,
};

export function useScreenEntrance(options?: Options) {
  const delay = options?.delay ?? DEFAULTS.delay;
  const duration = options?.duration ?? DEFAULTS.duration;
  const translateYDistance = options?.translateY ?? DEFAULTS.translateY;

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(translateYDistance);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const timing = { duration, easing: Easing.out(Easing.cubic) };

    opacity.value = withDelay(delay, withTiming(1, timing));
    translateY.value = withDelay(delay, withTiming(0, timing));

    const timeout = setTimeout(() => setIsComplete(true), delay + duration);
    return () => clearTimeout(timeout);
  }, [delay, duration, opacity, translateY, translateYDistance]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return { animatedStyle, isComplete };
}
