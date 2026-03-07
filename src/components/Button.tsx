/**
 * @module Button
 *
 * Primary action button used throughout the app. Supports three visual
 * variants (primary, secondary, ghost), three sizes, and loading/disabled
 * states. Ghost variant renders as an outlined button for lower-emphasis actions.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { colors, borderRadius, shadows, typography } from '@/theme/tokens';
import { BrandedSpinner } from './BrandedSpinner';

/** Visual style of the button: primary (coral), secondary (blue), or ghost (outlined). */
type Variant = 'primary' | 'secondary' | 'ghost';

/** Button size controlling padding. */
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  testID?: string;
}

const variantStyles: Record<Variant, ViewStyle> = {
  primary: {
    backgroundColor: colors.sunsetCoral,
  },
  secondary: {
    backgroundColor: colors.mountainBlue,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.espressoLight,
  },
};

const sizeStyles: Record<Size, { paddingVertical: number; paddingHorizontal: number }> = {
  sm: { paddingVertical: 8, paddingHorizontal: 16 },
  md: { paddingVertical: 12, paddingHorizontal: 24 },
  lg: { paddingVertical: 16, paddingHorizontal: 32 },
};

/**
 * Themed action button with loading spinner support.
 *
 * @param props.label - Button text
 * @param props.onPress - Press handler
 * @param props.variant - Visual style: 'primary' | 'secondary' | 'ghost'
 * @param props.size - Padding size: 'sm' | 'md' | 'lg'
 * @param props.disabled - Disables interaction and dims appearance
 * @param props.loading - Shows a spinner and disables interaction
 * @param props.fullWidth - Stretches to fill container width
 * @param props.testID - Test identifier for E2E tests
 * @returns A styled touchable button element
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  testID,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantStyles[variant],
        sizeStyles[size],
        { borderRadius: borderRadius.button },
        variant === 'primary' && shadows.button,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <BrandedSpinner
          size="small"
          color={variant === 'ghost' ? colors.espresso : '#FFFFFF'}
          testID={testID ? `${testID}-spinner` : undefined}
        />
      ) : (
        <Text
          style={[
            styles.label,
            typography.button,
            {
              color: variant === 'ghost' ? colors.espresso : '#FFFFFF',
            },
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    textAlign: 'center',
  },
});
