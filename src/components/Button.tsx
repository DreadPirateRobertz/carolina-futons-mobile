import React from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { colors, borderRadius, shadows, typography } from '@/theme/tokens';
import { useSpringPress } from '@/hooks/useSpringPress';
import { PRESS_SCALE } from '@/theme/animations';

type Variant = 'primary' | 'secondary' | 'ghost';
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

  const { animatedStyle, onPressIn, onPressOut } = useSpringPress({
    pressedScale: PRESS_SCALE.button,
    haptic: variant === 'ghost' ? 'selection' : 'light',
  });

  return (
    <Animated.View style={[animatedStyle, fullWidth && styles.fullWidth]}>
      <Pressable
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
        onPressIn={isDisabled ? undefined : onPressIn}
        onPressOut={isDisabled ? undefined : onPressOut}
        disabled={isDisabled}
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
      >
        {loading ? (
          <ActivityIndicator
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
      </Pressable>
    </Animated.View>
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
