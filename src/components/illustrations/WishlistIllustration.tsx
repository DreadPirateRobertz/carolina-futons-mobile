/**
 * @module WishlistIllustration
 *
 * Cozy cabin-in-the-mountains scene for the wishlist empty-state.
 * A cabin with chimney smoke, flanked by pine trees, evokes a sense
 * of comfort and aspiration — "save items you'd love to bring home."
 */
import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Polygon, Circle } from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { buildSmallMountainPath } from './shared';

interface Props {
  width?: number;
  height?: number;
  testID?: string;
}

const VBW = 280;
const VBH = 200;

/** SVG illustration for the empty wishlist screen. */
export function WishlistIllustration({ width = VBW, height = VBH, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VBW} ${VBH}`} testID={testID}>
      <Defs>
        <LinearGradient id="wish-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.skyGradientTop} stopOpacity={0.6} />
          <Stop offset="25%" stopColor={colors.mountainBlueLight} stopOpacity={0.5} />
          <Stop offset="55%" stopColor={colors.skyGradientBottom} stopOpacity={0.4} />
          <Stop offset="80%" stopColor={colors.sandLight} stopOpacity={0.7} />
          <Stop offset="100%" stopColor={colors.offWhite} />
        </LinearGradient>
      </Defs>
      <Rect width={VBW} height={VBH} fill="url(#wish-sky)" />
      {/* 5 mountain layers */}
      <Path
        d={buildSmallMountainPath(VBW, VBH, 0.52, 44)}
        fill={colors.mountainBlueDark}
        opacity={0.2}
      />
      <Path
        d={buildSmallMountainPath(VBW, VBH, 0.6, 18)}
        fill={colors.mountainBlue}
        opacity={0.3}
      />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.68, 75)} fill={colors.espresso} opacity={0.35} />
      <Path
        d={buildSmallMountainPath(VBW, VBH, 0.76, 31)}
        fill={colors.espressoLight}
        opacity={0.4}
      />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.84, 63)} fill={colors.sandDark} opacity={0.45} />
      {/* Cabin */}
      <Polygon points="140,100 118,130 162,130" fill={colors.espresso} opacity={0.8} />
      <Rect x={122} y={130} width={36} height={28} fill={colors.espressoLight} />
      <Rect x={133} y={140} width={14} height={18} fill={colors.sandBase} />
      {/* Chimney smoke */}
      <Path
        d="M155 100 C157 90 152 82 155 74 C158 66 153 58 156 50"
        fill="none"
        stroke={colors.espressoLight}
        strokeWidth={1.2}
        opacity={0.3}
      />
      <Path
        d="M155 74 C159 68 155 62 158 56"
        fill="none"
        stroke={colors.espressoLight}
        strokeWidth={0.8}
        opacity={0.2}
      />
      {/* Trees with more detail */}
      <Path
        d="M60 160 L60 130 Q65 110 70 130 L70 160"
        fill={colors.mountainBlueDark}
        opacity={0.5}
      />
      <Path d="M55 140 Q65 122 75 140" fill={colors.mountainBlue} opacity={0.35} />
      <Path d="M53 148 Q65 130 77 148" fill={colors.mountainBlue} opacity={0.25} />
      <Path
        d="M200 158 L200 125 Q205 105 210 125 L210 158"
        fill={colors.mountainBlueDark}
        opacity={0.5}
      />
      <Path d="M195 138 Q205 118 215 138" fill={colors.mountainBlue} opacity={0.35} />
      <Path d="M193 146 Q205 128 217 146" fill={colors.mountainBlue} opacity={0.25} />
      <Circle cx={155} cy={120} r={3} fill={colors.sunsetCoral} opacity={0.6} />
    </Svg>
  );
}
