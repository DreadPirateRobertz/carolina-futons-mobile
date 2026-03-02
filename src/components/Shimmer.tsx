import React, { useEffect, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

interface ShimmerProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  children?: ReactNode;
}

/**
 * Animated shimmer placeholder for skeleton loading states.
 * Pulses opacity between 0.3 and 1.0 on a bone-colored rectangle.
 */
export function Shimmer({ width, height = 16, borderRadius = 4, style, children }: ShimmerProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.sandDark,
        },
        style,
        animatedStyle,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      {children}
    </Animated.View>
  );
}

/** A row of shimmer bones for text-like placeholders. */
export function ShimmerLines({
  lines = 2,
  lastLineWidth = '60%',
  lineHeight = 12,
  gap = 8,
  style,
}: {
  lines?: number;
  lastLineWidth?: number | string;
  lineHeight?: number;
  gap?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer
          key={i}
          width={i === lines - 1 ? (lastLineWidth as number) : '100%'}
          height={lineHeight}
        />
      ))}
    </View>
  );
}

/** Circle shimmer for avatars / icons. */
export function ShimmerCircle({ size = 40, style }: { size?: number; style?: ViewStyle }) {
  return <Shimmer width={size} height={size} borderRadius={size / 2} style={style} />;
}

