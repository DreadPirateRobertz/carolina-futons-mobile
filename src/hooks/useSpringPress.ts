/**
 * useSpringPress — Combines spring scale animation with haptic feedback.
 *
 * Returns animated style and pressable handlers. Wrap your component in
 * Animated.View and spread the handlers onto a Pressable.
 */
import { useCallback } from 'react';
import { Platform } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  type WithSpringConfig,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { PRESS_SPRING, PRESS_SCALE } from '@/theme/animations';

type HapticType = 'light' | 'medium' | 'selection' | 'none';

interface Options {
  /** Scale when pressed (default: PRESS_SCALE.button = 0.97) */
  pressedScale?: number;
  /** Spring config (default: PRESS_SPRING) */
  springConfig?: WithSpringConfig;
  /** Haptic feedback type on press-in (default: 'light') */
  haptic?: HapticType;
}

const HAPTIC_MAP = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  selection: () => Haptics.selectionAsync(),
  none: () => {},
} as const;

export function useSpringPress(options: Options = {}) {
  const {
    pressedScale = PRESS_SCALE.button,
    springConfig = PRESS_SPRING,
    haptic = 'light',
  } = options;

  const scale = useSharedValue<number>(PRESS_SCALE.rest);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(pressedScale, springConfig);
    if (haptic !== 'none' && Platform.OS !== 'web') {
      HAPTIC_MAP[haptic]();
    }
  }, [pressedScale, springConfig, haptic, scale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(PRESS_SCALE.rest, springConfig);
  }, [springConfig, scale]);

  return { animatedStyle, onPressIn, onPressOut };
}
