/**
 * @module StreakDangerBanner
 *
 * Phase 5 — Dismissible warning banner shown on HomeScreen when the user's
 * daily visit streak is at risk. Uses Mountain Blue accent to signal urgency
 * without alarm.
 *
 * Renders nothing when `visible` is false.
 *
 * cm-a7bqj / Phase 5
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function StreakDangerBanner({ visible, onDismiss }: Props) {
  const { colors, spacing, borderRadius } = useTheme();

  if (!visible) return null;

  return (
    <View
      testID="streak-danger-banner"
      style={[
        styles.banner,
        {
          backgroundColor: colors.mountainBlue,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
        },
      ]}
    >
      <Text testID="streak-danger-message" style={styles.message}>
        {'Your streak is at risk! Open the app tomorrow to keep it going.'}
      </Text>
      <TouchableOpacity
        testID="streak-danger-dismiss"
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss streak warning"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.dismissIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },
  dismissIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
