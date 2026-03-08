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
import { useReducedMotion } from './useReducedMotion';

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
  const reduceMotion = useReducedMotion();

  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(reduceMotion ? 0 : translateYDistance);
  const [isComplete, setIsComplete] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      setIsComplete(true);
      return;
    }

    const timing = { duration, easing: Easing.out(Easing.cubic) };

    opacity.value = withDelay(delay, withTiming(1, timing));
    translateY.value = withDelay(delay, withTiming(0, timing));

    const timeout = setTimeout(() => setIsComplete(true), delay + duration);
    return () => clearTimeout(timeout);
  }, [delay, duration, opacity, translateY, translateYDistance, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return { animatedStyle, isComplete };
}
