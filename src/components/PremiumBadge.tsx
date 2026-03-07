/**
 * @module PremiumBadge
 *
 * Small "CF+" badge indicating premium subscription status. Used next to
 * the user's name on AccountScreen and as unlock indicators on gated features.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  size?: 'sm' | 'md';
  testID?: string;
}

export function PremiumBadge({ size = 'md', testID }: Props) {
  const { colors, borderRadius } = useTheme();
  const isSmall = size === 'sm';

  return (
    <View
      testID={testID ?? 'premium-badge'}
      style={[
        styles.badge,
        {
          backgroundColor: colors.sunsetCoral,
          borderRadius: borderRadius.pill,
          paddingHorizontal: isSmall ? 6 : 8,
          paddingVertical: isSmall ? 2 : 3,
        },
      ]}
    >
      <Text style={[styles.text, isSmall && styles.textSmall]}>CF+</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textSmall: {
    fontSize: 9,
  },
});
