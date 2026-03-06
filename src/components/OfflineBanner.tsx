/**
 * @module OfflineBanner
 *
 * Connectivity-aware banner that appears at the top of the screen when the
 * device is offline. Informs the user that they are browsing cached data.
 * Automatically hides when connectivity is restored.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { useConnectivity } from '@/hooks/useConnectivity';

interface Props {
  testID?: string;
}

/**
 * Displays an offline notification banner when the device loses connectivity.
 * Returns null when online, so it can be placed unconditionally in layouts.
 *
 * @param props.testID - Test identifier
 * @returns The banner View when offline, or null when online
 */
export function OfflineBanner({ testID }: Props) {
  const { colors } = useTheme();
  const { isOnline } = useConnectivity();

  if (isOnline) return null;

  return (
    <View
      style={[styles.banner, { backgroundColor: colors.espresso }]}
      testID={testID ?? 'offline-banner'}
      accessibilityRole="alert"
      accessibilityLabel="You are offline. Browsing cached products."
    >
      <Text style={styles.bannerText}>You're offline — browsing cached products</Text>
    </View>
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
