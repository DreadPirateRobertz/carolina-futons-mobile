/**
 * @module OfflineBanner
 *
 * Connectivity-aware banner that appears at the top of the screen when the
 * device is offline. Shows how many writes are queued for replay, or falls
 * back to a "browsing cached products" message when the queue is empty.
 * Automatically hides when connectivity is restored.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { useConnectivity } from '@/hooks/useConnectivity';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useQueueStatus } from '@/hooks/useQueueStatus';

interface Props {
  testID?: string;
}

function queueLabel(pendingCount: number): string {
  if (pendingCount === 0) return 'browsing cached products';
  if (pendingCount === 1) return '1 change queued';
  return `${pendingCount} changes queued`;
}

function accessibilityLabel(pendingCount: number): string {
  if (pendingCount === 0) return 'You are offline. Browsing cached products.';
  if (pendingCount === 1) return 'You are offline. 1 change queued — will sync when reconnected.';
  return `You are offline. ${pendingCount} changes queued — will sync when reconnected.`;
}

/**
 * Displays an offline notification banner when the device loses connectivity.
 * Shows the number of pending queued writes, or a generic offline message when
 * the queue is empty. Slides in from the top when offline and slides out when
 * connectivity is restored.
 *
 * @param props.testID - Test identifier
 * @returns The banner View with slide animation when offline, or null when online
 */
export function OfflineBanner({ testID }: Props) {
  const { colors } = useTheme();
  const { isOnline } = useConnectivity();
  const reduceMotion = useReducedMotion();
  const { pendingCount } = useQueueStatus();

  if (isOnline) return null;

  return (
    <Animated.View
      entering={reduceMotion ? undefined : SlideInUp.duration(300)}
      exiting={reduceMotion ? undefined : SlideOutUp.duration(300)}
      style={[styles.banner, { backgroundColor: colors.espresso }]}
      testID={testID ?? 'offline-banner'}
      accessibilityRole="alert"
      accessibilityLabel={accessibilityLabel(pendingCount)}
    >
      <Text style={styles.bannerText}>You're offline — {queueLabel(pendingCount)}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
