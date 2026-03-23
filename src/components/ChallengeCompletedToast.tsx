/**
 * @module ChallengeCompletedToast
 *
 * Animated challenge completion toast — shows "{title}: +N pts earned"
 * when a gamification challenge is completed. Flies up and fades out,
 * consistent with the PointsToast animation pattern.
 *
 * Respects prefers-reduced-motion: when reduce motion is enabled the
 * animation is skipped entirely.
 *
 * hq-myhj5 / Phase 4
 */

import { useEffect } from 'react';
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
  /** Challenge title, e.g. "Spring Refresh" */
  title: string;
  /** Points awarded for completing this challenge */
  rewardPoints: number;
  /** Whether the toast is currently visible / should animate in. */
  visible: boolean;
  testID?: string;
}

export function ChallengeCompletedToast({ title, rewardPoints, visible, testID }: Props) {
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
        withDelay(1200, withTiming(-80, { duration: 400 })),
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
      testID={testID ?? 'challenge-completed-toast'}
      accessibilityLabel={`${title}: +${rewardPoints} pts earned`}
      accessibilityElementsHidden={!visible}
      pointerEvents="none"
    >
      <View
        style={[
          styles.pill,
          { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.pill },
        ]}
      >
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.points}>+{rewardPoints} pts earned</Text>
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
    alignItems: 'center',
    maxWidth: 280,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  points: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
