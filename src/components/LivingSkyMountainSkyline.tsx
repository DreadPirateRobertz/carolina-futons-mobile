/**
 * @module LivingSkyMountainSkyline
 *
 * Phase 7 — Living Blue Ridge Sky renderer for the Carolina Futons mobile app.
 * Consumes LivingSkyState (from useLivingSky hook — bishop's hq-u0aqm) and
 * renders a fully animated SVG skyline: 4 ridge layers, time-of-day sky
 * gradient, sun/moon celestials, stars, clouds, birds, fireflies, and
 * seasonal precipitation.
 *
 * viewBox: 0 0 1040 150 — scales to device width × 0.144 height ratio.
 *
 * Dependencies:
 *   - react-native-svg
 *   - LivingSkyState interface (finalized by melania, hq-wisp-aojs)
 *   - useLivingSky hook: bishop's hq-u0aqm (wire in when it lands)
 *
 * cm-tvwtf / Phase 7
 */

import React, { useMemo } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Path,
  Circle,
  G,
  Line,
} from 'react-native-svg';
import { DEFAULT_SKY_STATE, type LivingSkyState } from '@/types/livingSky';

const VB_W = 1040;
const VB_H = 150;

interface Props {
  state?: LivingSkyState;
  height?: number;
  style?: ViewStyle;
  testID?: string;
}

// --- Ridge path data (4 layers, viewBox 0 0 1040 150) ---
// R4: farthest, nearly flat gentle swell
const RIDGE_R4 =
  'M0,105 C80,98 200,102 350,99 C500,96 640,101 780,98 C900,95 980,100 1040,97 L1040,150 L0,150 Z';
// R3: wide smooth arch, dominant crest left-of-center
const RIDGE_R3 =
  'M0,118 C60,108 180,112 320,105 C440,99 560,110 700,106 C820,102 940,112 1040,108 L1040,150 L0,150 Z';
// R2: left-dominant mass, lower right — key blue-purple band
const RIDGE_R2 =
  'M0,130 C50,120 160,125 280,116 C380,108 480,122 600,118 C720,114 860,126 1040,120 L1040,150 L0,150 Z';
// R1: nearest — Mt. Pisgah-style summit ~x500, dense forested slopes
const RIDGE_R1 =
  'M0,145 C60,138 150,142 260,134 C360,127 430,118 500,112 C570,118 640,130 760,136 C880,142 970,145 1040,143 L1040,150 L0,150 Z';

// 35 stars: deterministic positions (seeded layout)
const STAR_POSITIONS: { cx: number; cy: number; r: number }[] = [
  { cx: 45, cy: 12, r: 1.2 },
  { cx: 112, cy: 8, r: 0.9 },
  { cx: 178, cy: 18, r: 1.0 },
  { cx: 234, cy: 5, r: 1.4 },
  { cx: 289, cy: 22, r: 0.8 },
  { cx: 345, cy: 10, r: 1.1 },
  { cx: 401, cy: 4, r: 1.3 },
  { cx: 456, cy: 16, r: 0.9 },
  { cx: 512, cy: 7, r: 1.0 },
  { cx: 567, cy: 20, r: 1.2 },
  { cx: 623, cy: 11, r: 0.8 },
  { cx: 678, cy: 3, r: 1.4 },
  { cx: 734, cy: 14, r: 1.0 },
  { cx: 789, cy: 8, r: 1.1 },
  { cx: 845, cy: 19, r: 0.9 },
  { cx: 900, cy: 6, r: 1.3 },
  { cx: 956, cy: 13, r: 1.0 },
  { cx: 1012, cy: 9, r: 0.8 },
  { cx: 78, cy: 35, r: 0.7 },
  { cx: 155, cy: 42, r: 0.9 },
  { cx: 267, cy: 38, r: 0.7 },
  { cx: 390, cy: 44, r: 0.8 },
  { cx: 478, cy: 32, r: 0.6 },
  { cx: 534, cy: 47, r: 0.9 },
  { cx: 612, cy: 36, r: 0.7 },
  { cx: 701, cy: 41, r: 0.8 },
  { cx: 823, cy: 33, r: 0.6 },
  { cx: 912, cy: 45, r: 0.9 },
  { cx: 990, cy: 38, r: 0.7 },
  { cx: 30, cy: 55, r: 0.6 },
  { cx: 198, cy: 62, r: 0.7 },
  { cx: 445, cy: 58, r: 0.6 },
  { cx: 640, cy: 65, r: 0.8 },
  { cx: 815, cy: 60, r: 0.6 },
  { cx: 1000, cy: 55, r: 0.7 },
];

// Birds: small V-shapes high in sky
const BIRD_SHAPES = [
  'M120,28 Q124,24 128,28',
  'M140,22 Q144,18 148,22',
  'M162,30 Q166,26 170,30',
  'M340,18 Q345,14 350,18',
  'M358,24 Q363,20 368,24',
  'M700,15 Q705,11 710,15',
  'M720,22 Q725,18 730,22',
  'M740,16 Q745,12 750,16',
];

// Firefly positions (dusk/night, foreground layer)
const FIREFLY_POSITIONS = [
  { cx: 80, cy: 125 },
  { cx: 160, cy: 130 },
  { cx: 240, cy: 120 },
  { cx: 380, cy: 128 },
  { cx: 460, cy: 122 },
  { cx: 580, cy: 132 },
  { cx: 680, cy: 118 },
  { cx: 800, cy: 126 },
  { cx: 900, cy: 130 },
  { cx: 980, cy: 120 },
];

// Cloud shapes (simple ellipse groups)
const CLOUD_SHAPES = [
  { cx: 200, cy: 35, rx: 60, ry: 18 },
  { cx: 260, cy: 28, rx: 45, ry: 14 },
  { cx: 650, cy: 42, rx: 70, ry: 20 },
  { cx: 710, cy: 34, rx: 50, ry: 16 },
  { cx: 900, cy: 38, rx: 55, ry: 17 },
];

// Snow flake positions (simple dots for precipitation overlay)
const SNOW_POSITIONS = [
  { cx: 50, cy: 20 },
  { cx: 130, cy: 45 },
  { cx: 210, cy: 15 },
  { cx: 290, cy: 60 },
  { cx: 370, cy: 30 },
  { cx: 450, cy: 55 },
  { cx: 530, cy: 10 },
  { cx: 610, cy: 40 },
  { cx: 690, cy: 25 },
  { cx: 770, cy: 65 },
  { cx: 850, cy: 20 },
  { cx: 930, cy: 50 },
  { cx: 1010, cy: 35 },
  { cx: 100, cy: 80 },
  { cx: 200, cy: 95 },
  { cx: 340, cy: 85 },
  { cx: 480, cy: 90 },
  { cx: 620, cy: 75 },
  { cx: 760, cy: 88 },
  { cx: 900, cy: 78 },
];

// Mist/rain line positions (diagonal streaks)
const MIST_LINES = Array.from({ length: 20 }, (_, i) => ({
  x1: (i * 52) % VB_W,
  y1: 0,
  x2: ((i * 52) % VB_W) - 15,
  y2: VB_H,
}));

export function LivingSkyMountainSkyline({
  state = DEFAULT_SKY_STATE,
  height,
  style,
  testID = 'living-sky-skyline',
}: Props) {
  const svgHeight = height ?? Math.round(VB_H);

  const { skyColors, glowColors, ridgeColors, sunPos, moonPos } = state;

  // Stable gradient IDs per render (no random — SSR safe)
  const gradIds = useMemo(
    () => ({
      sky: 'lsky-sky-grad',
      glow: 'lsky-glow-grad',
      moon: 'lsky-moon-shadow',
    }),
    [],
  );

  const showSun = sunPos.opacity > 0;
  const showMoon = moonPos.opacity > 0;
  const showStars = state.starOpacity > 0;
  const showBirds = state.birdOpacity > 0;
  const showFireflies = state.fireflyOpacity > 0;
  const showPrecip = state.precipitationOpacity > 0 && state.precipitationType !== 'none';
  const showRim = state.rimOpacity > 0;

  return (
    <View testID={testID} style={[styles.container, style]}>
      <Svg
        width="100%"
        height={svgHeight}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMax meet"
      >
        <Defs>
          {/* Sky gradient — 4 stops top→bottom */}
          <LinearGradient id={gradIds.sky} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={skyColors[0]} stopOpacity={1} />
            <Stop offset="33%" stopColor={skyColors[1]} stopOpacity={1} />
            <Stop offset="66%" stopColor={skyColors[2]} stopOpacity={1} />
            <Stop offset="100%" stopColor={skyColors[3]} stopOpacity={1} />
          </LinearGradient>

          {/* Sun/moon glow radial */}
          <RadialGradient
            id={gradIds.glow}
            cx={showSun ? sunPos.cx / VB_W : moonPos.cx / VB_W}
            cy={(showSun ? sunPos.cy : moonPos.cy) / VB_H}
            r="0.35"
            gradientUnits="objectBoundingBox"
          >
            <Stop offset="0%" stopColor={glowColors[0]} />
            <Stop offset="100%" stopColor={glowColors[1]} />
          </RadialGradient>

          {/* Moon phase shadow — circle offset to create crescent */}
          <RadialGradient id={gradIds.moon} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#0A0A20" stopOpacity={1} />
            <Stop offset="100%" stopColor="#0A0A20" stopOpacity={0.9} />
          </RadialGradient>
        </Defs>

        {/* 1. Sky background */}
        <Rect
          testID="sky-rect"
          x={0}
          y={0}
          width={VB_W}
          height={VB_H}
          fill={`url(#${gradIds.sky})`}
        />

        {/* 2. Glow overlay (sun/moon radial wash) */}
        {(showSun || showMoon) && (
          <Rect x={0} y={0} width={VB_W} height={VB_H} fill={`url(#${gradIds.glow})`} />
        )}

        {/* 3. Stars */}
        {showStars && (
          <G testID="sky-stars" opacity={state.starOpacity}>
            {STAR_POSITIONS.map((s, i) => (
              <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#FFFFFF" />
            ))}
          </G>
        )}

        {/* 4. Sun */}
        {showSun && (
          <G testID="sky-sun" opacity={sunPos.opacity}>
            {/* Outer halo */}
            <Circle
              cx={sunPos.cx}
              cy={sunPos.cy}
              r={sunPos.r * 2.2}
              fill="#FFE080"
              opacity={0.15}
            />
            {/* Inner halo */}
            <Circle
              cx={sunPos.cx}
              cy={sunPos.cy}
              r={sunPos.r * 1.5}
              fill="#FFE080"
              opacity={0.25}
            />
            {/* Disc */}
            <Circle cx={sunPos.cx} cy={sunPos.cy} r={sunPos.r} fill="#FFD740" />
          </G>
        )}

        {/* 5. Moon */}
        {showMoon && (
          <G testID="sky-moon" opacity={moonPos.opacity}>
            {/* Glow ring */}
            <Circle cx={moonPos.cx} cy={moonPos.cy} r={14} fill="#E8E8FF" opacity={0.12} />
            {/* Moon disc */}
            <Circle cx={moonPos.cx} cy={moonPos.cy} r={10} fill="#D0D0E8" />
            {/* Phase shadow — offset circle cuts the crescent */}
            <Circle
              cx={moonPos.cx + moonPos.shadowOffset.dx}
              cy={moonPos.cy + moonPos.shadowOffset.dy}
              r={10}
              fill={`url(#${gradIds.moon})`}
            />
          </G>
        )}

        {/* 6. Clouds */}
        {state.cloudOpacity > 0 && (
          <G opacity={state.cloudOpacity}>
            {CLOUD_SHAPES.map((c, i) => (
              <G key={i}>
                <Circle cx={c.cx} cy={c.cy} r={c.ry} fill="#FFFFFF" opacity={0.7} />
                <Circle cx={c.cx - 20} cy={c.cy + 4} r={c.ry * 0.8} fill="#FFFFFF" opacity={0.6} />
                <Circle cx={c.cx + 22} cy={c.cy + 2} r={c.ry * 0.75} fill="#FFFFFF" opacity={0.6} />
              </G>
            ))}
          </G>
        )}

        {/* 7. Birds (distant V-shapes) */}
        {showBirds && (
          <G testID="sky-birds" opacity={state.birdOpacity}>
            {BIRD_SHAPES.map((d, i) => (
              <Path key={i} d={d} fill="none" stroke="#1A1A2E" strokeWidth={1.2} />
            ))}
          </G>
        )}

        {/* 8. Ridge R4 — farthest, nearly sky-colored */}
        <Path testID="ridge-r4" d={RIDGE_R4} fill={ridgeColors.r4} />

        {/* 9. Ridge R3 — wide smooth arch */}
        <Path testID="ridge-r3" d={RIDGE_R3} fill={ridgeColors.r3} />

        {/* 10. Ridge R2 — key blue-purple band */}
        <Path testID="ridge-r2" d={RIDGE_R2} fill={ridgeColors.r2} />

        {/* 11. Ridge R1 — nearest, dark forest slopes */}
        <Path testID="ridge-r1" d={RIDGE_R1} fill={ridgeColors.r1} />

        {/* 12. Rim light on R1 ridge top (dawn / golden hour) */}
        {showRim && (
          <Path
            testID="sky-rim-light"
            d={RIDGE_R1}
            fill="none"
            stroke={state.rimColor}
            strokeWidth={1.5}
            opacity={state.rimOpacity}
          />
        )}

        {/* 13. Fireflies (dusk / night) */}
        {showFireflies && (
          <G testID="sky-fireflies" opacity={state.fireflyOpacity}>
            {FIREFLY_POSITIONS.map((f, i) => (
              <Circle key={i} cx={f.cx} cy={f.cy} r={1.4} fill="#CCFF88" opacity={0.9} />
            ))}
          </G>
        )}

        {/* 14. Precipitation (snow or mist) */}
        {showPrecip && (
          <G testID="sky-precipitation" opacity={state.precipitationOpacity}>
            {state.precipitationType === 'snow'
              ? SNOW_POSITIONS.map((p, i) => (
                  <Circle key={i} cx={p.cx} cy={p.cy} r={1.5} fill="#FFFFFF" opacity={0.85} />
                ))
              : MIST_LINES.map((l, i) => (
                  <Line
                    key={i}
                    x1={l.x1}
                    y1={l.y1}
                    x2={l.x2}
                    y2={l.y2}
                    stroke="#8BB5C9"
                    strokeWidth={0.8}
                    opacity={0.6}
                  />
                ))}
          </G>
        )}
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
