/**
 * @module NotFoundIllustration
 *
 * Fog-shrouded mountain landscape for 404 / "not found" screens.
 * Heavy fog layers and a trail that fades into mist convey the idea
 * that the requested content cannot be located.
 */
import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Ellipse } from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { buildSmallMountainPath } from './shared';

interface Props {
  width?: number;
  height?: number;
  testID?: string;
}

const VBW = 280;
const VBH = 200;

/** SVG illustration for 404 / resource-not-found screens. */
export function NotFoundIllustration({ width = VBW, height = VBH, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VBW} ${VBH}`} testID={testID}>
      <Defs>
        <LinearGradient id="nf-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.mountainBlueLight} stopOpacity={0.5} />
          <Stop offset="25%" stopColor={colors.skyGradientTop} stopOpacity={0.4} />
          <Stop offset="55%" stopColor={colors.mountainBlueLight} stopOpacity={0.3} />
          <Stop offset="80%" stopColor={colors.sandLight} stopOpacity={0.5} />
          <Stop offset="100%" stopColor={colors.offWhite} />
        </LinearGradient>
        <LinearGradient id="nf-fog" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={colors.offWhite} stopOpacity={0} />
          <Stop offset="30%" stopColor={colors.offWhite} stopOpacity={0.8} />
          <Stop offset="70%" stopColor={colors.offWhite} stopOpacity={0.8} />
          <Stop offset="100%" stopColor={colors.offWhite} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width={VBW} height={VBH} fill="url(#nf-sky)" />
      {/* 5 mountain layers */}
      <Path d={buildSmallMountainPath(VBW, VBH, 0.45, 36)} fill={colors.mountainBlue} opacity={0.15} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.53, 58)} fill={colors.mountainBlue} opacity={0.2} />
      {/* Deep fog layers */}
      <Rect y={95} width={VBW} height={35} fill="url(#nf-fog)" />
      <Ellipse cx={100} cy={115} rx={65} ry={14} fill={colors.offWhite} opacity={0.6} />
      <Ellipse cx={210} cy={120} rx={55} ry={12} fill={colors.offWhite} opacity={0.5} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.62, 81)} fill={colors.mountainBlueDark} opacity={0.25} />
      <Rect y={130} width={VBW} height={25} fill="url(#nf-fog)" />
      <Ellipse cx={160} cy={140} rx={50} ry={10} fill={colors.offWhite} opacity={0.45} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.72, 19)} fill={colors.espressoLight} opacity={0.3} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.82, 47)} fill={colors.sandLight} opacity={0.4} />
      {/* Faint trail disappearing into fog */}
      <Path
        d="M120 200 Q130 185 140 180 Q150 175 160 180 Q170 185 175 195"
        fill="none"
        stroke={colors.sandDark}
        strokeWidth={1.2}
        opacity={0.3}
      />
      <Path
        d="M138 180 Q140 170 142 165"
        fill="none"
        stroke={colors.sandDark}
        strokeWidth={0.8}
        opacity={0.15}
      />
    </Svg>
  );
}
