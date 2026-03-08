/**
 * @module OfflineBanner
 *
 * Connectivity-aware banner that appears at the top of the screen when the
 * device is offline. Informs the user that they are browsing cached data.
 * Automatically hides when connectivity is restored.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { useConnectivity } from '@/hooks/useConnectivity';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  testID?: string;
}

/**
 * Displays an offline notification banner when the device loses connectivity.
 * Slides in from the top when offline and slides out when connectivity is restored.
 *
 * @param props.testID - Test identifier
 * @returns The banner View with slide animation when offline, or null when online
 */
export function OfflineBanner({ testID }: Props) {
  const { colors } = useTheme();
  const { isOnline } = useConnectivity();
  const reduceMotion = useReducedMotion();

  if (isOnline) return null;

  return (
    <Animated.View
      entering={reduceMotion ? undefined : SlideInUp.duration(300)}
      exiting={reduceMotion ? undefined : SlideOutUp.duration(300)}
      style={[styles.banner, { backgroundColor: colors.espresso }]}
      testID={testID ?? 'offline-banner'}
      accessibilityRole="alert"
      accessibilityLabel="You are offline. Browsing cached products."
    >
      <Text style={styles.bannerText}>You're offline — browsing cached products</Text>
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
