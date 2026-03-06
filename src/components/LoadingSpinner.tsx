/**
 * @module LoadingSpinner
 *
 * Centered loading indicator for async states. Wraps React Native's
 * ActivityIndicator in a padded container with a progressbar accessibility role.
 */

import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';

interface Props {
  size?: 'small' | 'large';
  color?: string;
  testID?: string;
}

/**
 * Renders a centered ActivityIndicator spinner.
 *
 * @param props.size - Spinner size: 'small' or 'large'
 * @param props.color - Spinner color (defaults to mountainBlue brand color)
 * @param props.testID - Test identifier
 * @returns A centered spinner View
 */
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
