/**
 * @module Divider
 *
 * Horizontal rule component that respects the current theme. Supports
 * three visual weights and configurable vertical spacing so content
 * sections have consistent separation without ad-hoc margin hacks.
 */
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  /** Visual weight */
  weight?: 'hairline' | 'thin' | 'thick';
  /** Override color (defaults to sandDark) */
  color?: string;
  /** Vertical margin */
  spacing?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  testID?: string;
}

const WEIGHTS = { hairline: StyleSheet.hairlineWidth, thin: 1, thick: 2 };

/**
 * Themed horizontal divider line.
 */
export function Divider({
  weight = 'thin',
  color,
  spacing: spacingSize = 'md',
  style,
  testID,
}: Props) {
  const { colors, spacing } = useTheme();

  const marginVertical =
    spacingSize === 'sm' ? spacing.sm : spacingSize === 'lg' ? spacing.lg : spacing.md;

  return (
    <View
      style={[
        styles.root,
        {
          height: WEIGHTS[weight],
          backgroundColor: color ?? colors.sandDark,
          marginVertical,
        },
        style,
      ]}
      testID={testID}
      accessibilityRole="none"
    />
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
});
