/**
 * @module BadgeToast
 *
 * Animated "Badge Unlocked: {name}" toast that flies up and fades out when a
 * gamification badge is awarded. Mirrors the PointsToast animation pattern and
 * is driven by useBadgeToast via BadgeToastContext.
 *
 * Respects prefers-reduced-motion: skips animation when enabled.
 * hq-v0a2z
 */
import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

interface Props {
  /** Badge name to display (e.g. "Explorer Badge"). */
  badgeName: string;
  /** Whether the toast is currently visible / should animate in. */
  visible: boolean;
  testID?: string;
}

export function BadgeToast({ badgeName, visible, testID }: Props) {
  const { colors, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();

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
        withDelay(1800, withTiming(0, { duration: 400 })),
      );
      translateY.value = withSequence(
        withTiming(-40, { duration: 300 }),
        withDelay(1800, withTiming(-80, { duration: 400 })),
      );
    });
  }, [visible, badgeName, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.container, { bottom: 120 + insets.bottom }, animatedStyle]}
      testID={testID ?? 'badge-toast'}
      accessibilityLabel={`Badge Unlocked: ${badgeName}`}
      accessibilityElementsHidden={!visible}
      pointerEvents="none"
    >
      <View
        style={[
          styles.pill,
          { backgroundColor: colors.mountainBlue, borderRadius: borderRadius.pill },
        ]}
      >
        <Text style={styles.label}>Badge Unlocked</Text>
        <Text style={styles.name}>{badgeName}</Text>
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
    bottom: 120,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
