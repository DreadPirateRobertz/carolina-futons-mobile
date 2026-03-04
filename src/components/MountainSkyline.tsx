import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg';
import { colors } from '@/theme/tokens';

const VIEWBOX_WIDTH = 1440;
const DEFAULT_HEIGHT = 120;

const GRADIENT_PRESETS = {
  sunrise: { top: colors.skyGradientTop, bottom: colors.skyGradientBottom },
  sunset: { top: colors.sunsetCoral, bottom: colors.skyGradientBottom },
} as const;

type Variant = keyof typeof GRADIENT_PRESETS;

interface Props {
  variant?: Variant;
  height?: number;
  style?: ViewStyle;
  testID?: string;
}

function buildMountainPath(vbH: number): string {
  const points: [number, number][] = [
    [0, vbH],
    [0, vbH * 0.7],
    [60, vbH * 0.55],
    [140, vbH * 0.35],
    [200, vbH * 0.45],
    [280, vbH * 0.25],
    [340, vbH * 0.4],
    [400, vbH * 0.3],
    [480, vbH * 0.15],
    [540, vbH * 0.35],
    [600, vbH * 0.28],
    [680, vbH * 0.42],
    [740, vbH * 0.2],
    [800, vbH * 0.38],
    [860, vbH * 0.12],
    [920, vbH * 0.32],
    [980, vbH * 0.22],
    [1060, vbH * 0.4],
    [1120, vbH * 0.18],
    [1200, vbH * 0.35],
    [1260, vbH * 0.28],
    [1340, vbH * 0.42],
    [1400, vbH * 0.3],
    [1440, vbH * 0.5],
    [1440, vbH],
  ];

  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z';
}

export function MountainSkyline({
  variant = 'sunrise',
  height = DEFAULT_HEIGHT,
  style,
  testID,
}: Props) {
  const grad = GRADIENT_PRESETS[variant];
  const gradId = `cf-sky-grad-${variant}`;
  const mountainPath = buildMountainPath(height);

  return (
    <View testID={testID} style={[styles.container, style]}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={grad.top} />
            <Stop offset="100%" stopColor={grad.bottom} />
          </LinearGradient>
        </Defs>
        <Rect width={VIEWBOX_WIDTH} height={height} fill={`url(#${gradId})`} />
        <Path d={mountainPath} fill={colors.espresso} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
});
