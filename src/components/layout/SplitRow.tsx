import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  left: React.ReactNode;
  right: React.ReactNode;
  /** Ratio of left to right column. Default 1:1. */
  ratio?: '1:1' | '1:2' | '2:1' | '1:3' | '3:1';
  /** Gap between columns */
  gap?: number;
  /** Vertical alignment */
  align?: 'top' | 'center' | 'bottom';
  style?: ViewStyle;
  testID?: string;
}

const RATIOS: Record<NonNullable<Props['ratio']>, [number, number]> = {
  '1:1': [1, 1],
  '1:2': [1, 2],
  '2:1': [2, 1],
  '1:3': [1, 3],
  '3:1': [3, 1],
};

const ALIGN_MAP = {
  top: 'flex-start',
  center: 'center',
  bottom: 'flex-end',
} as const;

/**
 * Two-column side-by-side layout with configurable ratio.
 */
export function SplitRow({
  left,
  right,
  ratio = '1:1',
  gap,
  align = 'top',
  style,
  testID,
}: Props) {
  const { spacing } = useTheme();
  const [leftFlex, rightFlex] = RATIOS[ratio];
  const columnGap = gap ?? spacing.md;

  return (
    <View
      style={[
        styles.root,
        { gap: columnGap, alignItems: ALIGN_MAP[align] },
        style,
      ]}
      testID={testID}
    >
      <View style={{ flex: leftFlex }}>{left}</View>
      <View style={{ flex: rightFlex }}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
  },
});
