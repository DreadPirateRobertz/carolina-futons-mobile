/**
 * @module PointsToast
 *
 * Animated "+N points earned" toast that flies up and fades out on
 * OrderConfirmationScreen when a purchase completes.
 *
 * Respects prefers-reduced-motion: when reduce motion is enabled the
 * animation is skipped entirely.
 * cm-ihz
 */

import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

interface Props {
  /** Point value to display (e.g. 250 → "+250 points earned"). */
  points: number;
  /** Whether the toast is currently visible / should animate in. */
  visible: boolean;
  testID?: string;
}

export function PointsToast({ points, visible, testID }: Props) {
  const { colors, borderRadius } = useTheme();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      opacity.value = 0;
      translateY.value = 0;
      return;
    }

    AccessibilityInfo.isReduceMotionEnabled().then((reducedMotion) => {
      if (reducedMotion) {
        opacity.value = withTiming(1, { duration: 0 });
        return;
      }

      translateY.value = 0;
      opacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(1200, withTiming(0, { duration: 400 })),
      );
      translateY.value = withSequence(
        withTiming(-40, { duration: 300 }),
        withDelay(
          1200,
          withTiming(-80, { duration: 400 }),
        ),
      );
    });
  }, [visible, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      testID={testID ?? 'points-toast'}
      accessibilityLabel={`${points} points earned`}
      accessibilityElementsHidden={!visible}
      pointerEvents="none"
    >
      <View
        style={[
          styles.pill,
          { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.pill },
        ]}
      >
        <Text style={styles.text}>+{points} points earned</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 100,
    zIndex: 999,
    pointerEvents: 'none',
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
