/**
 * @module useCartAnimation
 *
 * Provides a satisfying bounce-and-fade animation for the "Add to Cart"
 * button press. The button scales up briefly then settles back, giving
 * tactile feedback that the item was added successfully.
 */
import { useState, useCallback, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from './useReducedMotion';

interface Options {
  duration?: number;
  onComplete?: () => void;
}

const DEFAULT_DURATION = 500;

export function useCartAnimation(options?: Options) {
  const duration = options?.duration ?? DEFAULT_DURATION;
  const onCompleteRef = useRef(options?.onComplete);
  onCompleteRef.current = options?.onComplete;
  const reduceMotion = useReducedMotion();

  const [isAnimating, setIsAnimating] = useState(false);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const trigger = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    if (!reduceMotion) {
      // Scale: 1 -> 1.15 -> 0.95 -> 1.0 (bounce)
      scale.value = withSequence(
        withSpring(1.15, { damping: 8, stiffness: 400 }),
        withSpring(0.95, { damping: 10, stiffness: 300 }),
        withSpring(1.0, { damping: 12, stiffness: 200 }),
      );

      // Brief opacity dip for "flash" effect
      opacity.value = withSequence(
        withTiming(0.7, { duration: duration * 0.2 }),
        withTiming(1.0, { duration: duration * 0.3 }),
      );
    }

    // Complete after duration (or immediately if reduce motion)
    setTimeout(() => {
      setIsAnimating(false);
      onCompleteRef.current?.();
    }, reduceMotion ? 0 : duration);
  }, [isAnimating, scale, opacity, duration, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return {
    isAnimating,
    scale,
    opacity,
    animatedStyle,
    trigger,
  };
}
