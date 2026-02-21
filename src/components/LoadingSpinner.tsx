import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';

interface Props {
  size?: 'small' | 'large';
  color?: string;
  testID?: string;
}

export function LoadingSpinner({ size = 'small', color = colors.mountainBlue, testID }: Props) {
  return (
    <View style={styles.container} testID={testID} accessibilityRole="progressbar">
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
});
