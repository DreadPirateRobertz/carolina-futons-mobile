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
import { getStreakMultiplier } from '@/utils/streakMultiplier';

interface Props {
  /** Number of consecutive days in the current streak. */
  streak: number;
  testID?: string;
  /** Force-show the 1× multiplier chip even when streak is below the threshold. */
  showBaseMultiplier?: boolean;
}

export function StreakBadge({ streak, testID, showBaseMultiplier }: Props) {
  const { colors, borderRadius } = useTheme();
  const multiplier = getStreakMultiplier(streak);
  const showMultiplier = multiplier > 1 || showBaseMultiplier === true;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.sunsetCoralLight + '33',
          borderColor: colors.sunsetCoral,
          borderRadius: borderRadius.pill,
        },
      ]}
      testID={testID ?? 'streak-badge'}
      accessibilityLabel={`${streak} day streak${showMultiplier ? `, ${multiplier}× points` : ''}`}
      accessibilityRole="text"
    >
      <Text style={styles.fire}>🔥</Text>
      <Text style={[styles.count, { color: colors.sunsetCoral }]}>{streak}</Text>
      <Text style={[styles.label, { color: colors.sunsetCoral }]}>day streak</Text>
      {showMultiplier && (
        <Text
          testID="streak-multiplier"
          style={[
            styles.multiplier,
            {
              color: colors.mountainBlue,
              backgroundColor: colors.mountainBlue + '22',
              borderRadius: borderRadius.sm,
            },
          ]}
        >
          {multiplier}×
        </Text>
      )}
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
  multiplier: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
});
