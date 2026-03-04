import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  intensity?: 'light' | 'medium' | 'heavy';
}

export function GlassCard({ children, style, testID, intensity = 'medium' }: Props) {
  const { borderRadius } = useTheme();
  const opacity = intensity === 'light' ? 0.5 : intensity === 'heavy' ? 0.85 : 0.7;

  return (
    <View
      testID={testID}
      style={[
        styles.glass,
        {
          backgroundColor: `rgba(42, 31, 25, ${opacity})`,
          borderColor: darkPalette.glassBorder,
          borderRadius: borderRadius.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
