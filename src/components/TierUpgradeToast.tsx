/**
 * @module TierUpgradeToast
 *
 * Animated "You've reached {tier} tier!" toast shown when a loyalty tier upgrade
 * fires via useTriggerMoments. Flies up and fades out, consistent with the
 * PointsToast / ChallengeCompletedToast animation pattern.
 *
 * Respects prefers-reduced-motion: when reduce motion is enabled the
 * animation is skipped.
 *
 * cfutons_mobile-0lt / Phase 5
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
import type { LoyaltyTier } from '@/hooks/useLoyalty';

interface Props {
  /** The new tier the user has reached. */
  tier: LoyaltyTier;
  /** Whether the toast is currently visible / should animate in. */
  visible: boolean;
  /** Called after the exit animation completes so the caller can dismiss the trigger. */
  onDismiss?: () => void;
  testID?: string;
}

const TIER_LABEL: Record<LoyaltyTier, string> = {
  bronze: 'bronze',
  silver: 'silver',
  gold: 'gold',
};

export function TierUpgradeToast({ tier, visible, onDismiss, testID }: Props) {
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
        withDelay(1400, withTiming(0, { duration: 400 })),
      );
      translateY.value = withSequence(
        withTiming(-40, { duration: 300 }),
        withDelay(1400, withTiming(-80, { duration: 400 })),
      );
      // Dismiss after animation completes (300 fly-up + 1400 hold + 400 fade = 2100ms)
      if (onDismiss) {
        setTimeout(onDismiss, 2100);
      }
    });
  }, [visible, opacity, translateY, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const label = TIER_LABEL[tier];

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      testID={testID ?? 'tier-upgrade-toast'}
      accessibilityLabel={`You've reached ${label} tier!`}
      accessibilityElementsHidden={!visible}
      pointerEvents="none"
    >
      <View
        style={[
          styles.pill,
          { backgroundColor: colors.mountainBlue, borderRadius: borderRadius.pill },
        ]}
      >
        <Text style={styles.heading}>Tier Upgrade!</Text>
        <Text style={styles.label} testID={(testID ?? 'tier-upgrade-toast') + '-label'}>
          {`You've reached ${label} tier`}
        </Text>
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
    paddingVertical: 12,
    alignItems: 'center',
    maxWidth: 280,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
