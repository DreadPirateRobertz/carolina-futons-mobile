import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Path,
  Circle,
  Line,
} from 'react-native-svg';
import { colors } from '@/theme/tokens';
import {
  MOUNTAIN_LAYER_CONFIGS,
  GRADIENT_PRESETS_MULTI,
  STANDARD_OPACITIES,
  TRANSPARENT_OPACITIES,
  STANDARD_LAYER_COLORS,
  TRANSPARENT_LAYER_COLORS,
  buildCBezierMountainPath,
  buildBirds,
  buildPineTrees,
  buildFlora,
} from './illustrations/shared';

const VIEWBOX_WIDTH = 1440;
const DEFAULT_HEIGHT = 120;

type Variant = 'sunrise' | 'sunset';

interface Props {
  variant?: Variant;
  height?: number;
  showGlow?: boolean;
  /** Transparent mode for dark section dividers */
  transparent?: boolean;
  /** Show detail elements: birds, trees, flora (default true) */
  showDetails?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function MountainSkyline({
  variant = 'sunrise',
  height = DEFAULT_HEIGHT,
  showGlow = false,
  transparent = false,
  showDetails = true,
  style,
  testID,
}: Props) {
  const gradId = `cf-sky-grad-${variant}`;
  const glowId = `cf-glow-${variant}`;
  const gradientStops = GRADIENT_PRESETS_MULTI[variant];
  const opacities = transparent ? TRANSPARENT_OPACITIES : STANDARD_OPACITIES;
  const layerColors = transparent ? TRANSPARENT_LAYER_COLORS : STANDARD_LAYER_COLORS;

  const birds = showDetails ? buildBirds(VIEWBOX_WIDTH, height) : [];
  const trees = showDetails ? buildPineTrees(VIEWBOX_WIDTH, height) : [];
  const flora = showDetails ? buildFlora(VIEWBOX_WIDTH, height) : [];

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
            {gradientStops.map((stop, i) => (
              <Stop
                key={i}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </LinearGradient>
          {showGlow && (
            <RadialGradient id={glowId} cx="50%" cy="85%" r="40%">
              <Stop offset="0%" stopColor={colors.sunsetCoralLight} stopOpacity={0.6} />
              <Stop offset="100%" stopColor={colors.sunsetCoralLight} stopOpacity={0} />
            </RadialGradient>
          )}
        </Defs>

        {/* Sky background */}
        <Rect width={VIEWBOX_WIDTH} height={height} fill={`url(#${gradId})`} />

        {/* Sunrise glow */}
        {showGlow && (
          <Circle
            cx={VIEWBOX_WIDTH / 2}
            cy={height * 0.85}
            r={height * 0.6}
            fill={`url(#${glowId})`}
          />
        )}

        {/* Bird silhouettes (above mountains) */}
        {birds.map((bird, i) => (
          <Path
            key={`bird-${i}`}
            d={bird.path}
            fill="none"
            stroke={colors.espresso}
            strokeWidth={bird.strokeWidth}
            opacity={0.3}
          />
        ))}

        {/* 7 mountain layers — distant to front */}
        {MOUNTAIN_LAYER_CONFIGS.map((layer, i) => (
          <Path
            key={`mountain-${layer.name}`}
            d={buildCBezierMountainPath(height, layer.baseHeight, layer.seed)}
            fill={layerColors[i]}
            opacity={opacities[i]}
          />
        ))}

        {/* Atmospheric haze bands */}
        <Rect
          y={height * 0.3}
          width={VIEWBOX_WIDTH}
          height={height * 0.08}
          fill={colors.mountainBlueLight}
          opacity={0.06}
        />
        <Rect
          y={height * 0.5}
          width={VIEWBOX_WIDTH}
          height={height * 0.06}
          fill={colors.sandLight}
          opacity={0.04}
        />
        <Rect
          y={height * 0.65}
          width={VIEWBOX_WIDTH}
          height={height * 0.05}
          fill={colors.espressoLight}
          opacity={0.03}
        />

        {/* Pine trees */}
        {trees.map((tree, i) => (
          <React.Fragment key={`tree-${i}`}>
            <Rect
              x={tree.trunk.x}
              y={tree.trunk.y}
              width={tree.trunk.width}
              height={tree.trunk.height}
              fill={colors.espresso}
              opacity={0.4}
            />
            {tree.canopyLayers.map((canopy, j) => (
              <Path
                key={`canopy-${i}-${j}`}
                d={canopy.path}
                fill={colors.espresso}
                opacity={canopy.opacity}
              />
            ))}
          </React.Fragment>
        ))}

        {/* Wildflower flora */}
        {flora.map((f, i) => (
          <React.Fragment key={`flora-${i}`}>
            <Line
              x1={f.stem.x1}
              y1={f.stem.y1}
              x2={f.stem.x2}
              y2={f.stem.y2}
              stroke={colors.espresso}
              strokeWidth={f.stem.strokeWidth}
              opacity={0.3}
            />
            <Circle cx={f.bloom.cx} cy={f.bloom.cy} r={f.bloom.r} fill={f.bloom.color} opacity={0.5} />
          </React.Fragment>
        ))}

        {/* Paper grain overlay */}
        <Rect
          width={VIEWBOX_WIDTH}
          height={height}
          fill={colors.espresso}
          opacity={0.06}
        />
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
