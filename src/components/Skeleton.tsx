import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SkeletonRowProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SkeletonRow({
  width = '100%',
  height = 12,
  borderRadius = 4,
  animated = true,
  style,
  testID,
}: SkeletonRowProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const shimmer = useSharedValue(0.4);

  useEffect(() => {
    if (!animated || reduceMotion) {
      shimmer.value = 0.6;
      return;
    }
    shimmer.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [shimmer, animated, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  return (
    <Animated.View
      testID={testID}
      accessibilityLabel="Loading"
      style={[
        { width: width as DimensionValue, height, borderRadius, backgroundColor: colors.sandBase },
        animatedStyle,
        style,
      ]}
    />
  );
}

interface SkeletonCardProps {
  width?: number | string;
  header?: boolean;
  lines?: number;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SkeletonCard({
  width = '100%',
  header = false,
  lines = 1,
  animated = true,
  style,
  testID,
}: SkeletonCardProps) {
  const { colors, spacing, borderRadius } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          width: width as ViewStyle['width'],
          padding: spacing.md,
          borderRadius: borderRadius.md,
          backgroundColor: colors.sandDark,
          gap: spacing.sm,
        },
      }),
    [width, spacing, borderRadius, colors.sandDark],
  );

  return (
    <View testID={testID} style={[s.card, style]}>
      {header ? (
        <SkeletonRow testID={`${testID ?? 'sk-card'}-header`} height={20} animated={animated} />
      ) : null}
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonRow
          key={i}
          testID={`${testID ?? 'sk-card'}-line`}
          height={12}
          animated={animated}
        />
      ))}
    </View>
  );
}

interface SkeletonGridProps {
  rows?: number;
  columns?: number;
  animated?: boolean;
  cardHeader?: boolean;
  cardLines?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SkeletonGrid({
  rows = 1,
  columns = 1,
  animated = true,
  cardHeader = false,
  cardLines = 1,
  style,
  testID,
}: SkeletonGridProps) {
  const { spacing } = useTheme();
  const total = rows * columns;

  return (
    <View
      testID={testID}
      style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, style]}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{ flexBasis: `${100 / columns}%`, padding: spacing.xs / 2 }}>
          <SkeletonCard
            testID={`${testID ?? 'sk-grid'}-card`}
            header={cardHeader}
            lines={cardLines}
            animated={animated}
          />
        </View>
      ))}
    </View>
  );
}
