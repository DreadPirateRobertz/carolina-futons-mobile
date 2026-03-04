import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Path, Circle } from 'react-native-svg';
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
  /** Show a radial sunrise glow behind the mountains */
  showGlow?: boolean;
  style?: ViewStyle;
  testID?: string;
}

/** Foreground mountain silhouette — sharp, close peaks */
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

/** Mid-ground mountain layer — softer, wider ridges for atmospheric depth */
function buildMidGroundPath(vbH: number): string {
  const points: [number, number][] = [
    [0, vbH],
    [0, vbH * 0.82],
    [120, vbH * 0.6],
    [240, vbH * 0.7],
    [360, vbH * 0.5],
    [500, vbH * 0.62],
    [640, vbH * 0.45],
    [780, vbH * 0.55],
    [900, vbH * 0.4],
    [1040, vbH * 0.58],
    [1160, vbH * 0.48],
    [1300, vbH * 0.6],
    [1440, vbH * 0.52],
    [1440, vbH],
  ];

  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z';
}

export function MountainSkyline({
  variant = 'sunrise',
  height = DEFAULT_HEIGHT,
  showGlow = false,
  style,
  testID,
}: Props) {
  const grad = GRADIENT_PRESETS[variant];
  const gradId = `cf-sky-grad-${variant}`;
  const glowId = `cf-glow-${variant}`;
  const foregroundPath = buildMountainPath(height);
  const midGroundPath = buildMidGroundPath(height);

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
          {showGlow && (
            <RadialGradient id={glowId} cx="50%" cy="85%" r="40%">
              <Stop offset="0%" stopColor={colors.sunsetCoralLight} stopOpacity={0.6} />
              <Stop offset="100%" stopColor={colors.sunsetCoralLight} stopOpacity={0} />
            </RadialGradient>
          )}
        </Defs>
        <Rect width={VIEWBOX_WIDTH} height={height} fill={`url(#${gradId})`} />
        {showGlow && (
          <Circle cx={VIEWBOX_WIDTH / 2} cy={height * 0.85} r={height * 0.6} fill={`url(#${glowId})`} />
        )}
        {/* Mid-ground — espressoLight for atmospheric depth */}
        <Path d={midGroundPath} fill={colors.espressoLight} opacity={0.5} />
        {/* Foreground — sharp espresso silhouette */}
        <Path d={foregroundPath} fill={colors.espresso} />
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
