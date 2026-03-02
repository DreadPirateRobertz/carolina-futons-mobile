import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

// Dark editorial surface color — will be replaced by darkPalette import
// once Stream 1 (theme tokens) merges.
const SKELETON_COLOR = '#352A22';

interface Props {
  width?: number | string;
  height?: number;
  variant?: 'rect' | 'circle' | 'text';
  borderRadius?: number;
  style?: ViewStyle;
  testID?: string;
}

export function SkeletonLoader({
  width = '100%',
  height = 20,
  variant = 'rect',
  borderRadius: customRadius,
  style,
  testID,
}: Props) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]),
  }));

  const radius =
    customRadius ??
    (variant === 'circle'
      ? typeof width === 'number'
        ? width / 2
        : 24
      : 6);

  return (
    <Animated.View
      testID={testID}
      style={[
        {
          width,
          height: variant === 'circle' ? width : height,
          borderRadius: radius,
          backgroundColor: SKELETON_COLOR,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
