/**
 * @module StaleDataBadge
 *
 * Small badge indicating that displayed data is from cache and may be outdated.
 * Shown when the device is offline or after a failed network refresh.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  label?: string;
  isStale: boolean;
  testID?: string;
}

export function StaleDataBadge({
  label = 'Showing cached data',
  isStale,
  testID = 'stale-data-badge',
}: Props) {
  const { colors, borderRadius } = useTheme();

  if (!isStale) return null;

  return (
    <View
      style={[styles.badge, { backgroundColor: colors.sandDark, borderRadius: borderRadius.sm }]}
      testID={testID}
      accessibilityLabel={`Data may be outdated — ${label.toLowerCase()}`}
    >
      <Text style={[styles.text, { color: colors.espresso }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
