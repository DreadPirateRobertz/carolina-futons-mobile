import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Ellipse, Circle } from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { buildSmallMountainPath } from './shared';

interface Props {
  width?: number;
  height?: number;
  testID?: string;
}

const VBW = 280;
const VBH = 200;

export function StreamIllustration({ width = VBW, height = VBH, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VBW} ${VBH}`} testID={testID}>
      <Defs>
        <LinearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.skyGradientTop} stopOpacity={0.4} />
          <Stop offset="25%" stopColor={colors.mountainBlueLight} stopOpacity={0.3} />
          <Stop offset="55%" stopColor={colors.skyGradientBottom} stopOpacity={0.3} />
          <Stop offset="80%" stopColor={colors.sandLight} stopOpacity={0.5} />
          <Stop offset="100%" stopColor={colors.sandLight} />
        </LinearGradient>
        <LinearGradient id="sc-water" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={colors.mountainBlueLight} stopOpacity={0.6} />
          <Stop offset="50%" stopColor={colors.mountainBlue} stopOpacity={0.5} />
          <Stop offset="100%" stopColor={colors.mountainBlue} stopOpacity={0.4} />
        </LinearGradient>
      </Defs>
      <Rect width={VBW} height={VBH} fill="url(#sc-sky)" />
      {/* 5 mountain layers */}
      <Path d={buildSmallMountainPath(VBW, VBH, 0.50, 39)} fill={colors.mountainBlueDark} opacity={0.2} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.58, 56)} fill={colors.mountainBlue} opacity={0.25} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.65, 12)} fill={colors.espresso} opacity={0.3} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.73, 78)} fill={colors.espressoLight} opacity={0.35} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.80, 95)} fill={colors.sandDark} opacity={0.4} />
      {/* Stream channel */}
      <Path d="M100 200 Q110 172 125 158 Q140 148 155 158 Q170 172 180 200" fill="url(#sc-water)" />
      {/* Water ripples */}
      <Path d="M115 168 Q140 158 165 168" fill="none" stroke={colors.offWhite} strokeWidth={1} opacity={0.5} />
      <Path d="M108 180 Q140 170 172 180" fill="none" stroke={colors.offWhite} strokeWidth={0.8} opacity={0.4} />
      <Circle cx={130} cy={163} r={2} fill={colors.offWhite} opacity={0.6} />
      <Circle cx={150} cy={166} r={1.5} fill={colors.offWhite} opacity={0.5} />
      <Circle cx={140} cy={175} r={1.8} fill={colors.offWhite} opacity={0.4} />
      {/* Rocks */}
      <Ellipse cx={85} cy={168} rx={18} ry={10} fill={colors.espressoLight} opacity={0.4} />
      <Ellipse cx={90} cy={165} rx={12} ry={7} fill={colors.espresso} opacity={0.3} />
      <Ellipse cx={195} cy={165} rx={15} ry={8} fill={colors.espressoLight} opacity={0.35} />
      <Ellipse cx={210} cy={172} rx={10} ry={6} fill={colors.espresso} opacity={0.25} />
      {/* Bank paths */}
      <Path d="M0 158 Q30 150 60 155 Q80 152 85 158" fill={colors.sandBase} opacity={0.4} />
      <Path d="M195 158 Q220 150 250 155 Q270 152 280 158" fill={colors.sandBase} opacity={0.4} />
    </Svg>
  );
}
