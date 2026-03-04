import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  children: React.ReactNode;
  /** Card-style surface with shadow */
  card?: boolean;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Padded content container. Use card=true for raised card surfaces.
 */
export function ContentBlock({ children, card, style, testID }: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();

  return (
    <View
      style={[
        styles.root,
        { padding: spacing.md },
        card && {
          backgroundColor: colors.white,
          borderRadius: borderRadius.card,
          ...shadows.card,
        },
        style,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {},
});
