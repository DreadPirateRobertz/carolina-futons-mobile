/**
 * @module StreakBadge
 *
 * Displays a "X days streak 🔥" badge on HomeScreen and AccountScreen.
 * Pure presentational — receives streak count as a prop.
 * cm-ihz
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  /** Number of consecutive days in the current streak. */
  streak: number;
  testID?: string;
}

export function StreakBadge({ streak, testID }: Props) {
  const { colors, borderRadius } = useTheme();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.sunsetCoralLight + '33', borderColor: colors.sunsetCoral, borderRadius: borderRadius.pill },
      ]}
      testID={testID ?? 'streak-badge'}
      accessibilityLabel={`${streak} day streak`}
      accessibilityRole="text"
    >
      <Text style={styles.fire}>🔥</Text>
      <Text style={[styles.count, { color: colors.sunsetCoral }]}>{streak}</Text>
      <Text style={[styles.label, { color: colors.sunsetCoral }]}>day streak</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    gap: 4,
  },
  fire: {
    fontSize: 14,
  },
  count: {
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
