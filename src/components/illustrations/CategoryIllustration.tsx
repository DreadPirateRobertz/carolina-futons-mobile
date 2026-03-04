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

export function CategoryIllustration({ width = VBW, height = VBH, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VBW} ${VBH}`} testID={testID}>
      <Defs>
        <LinearGradient id="cat-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.skyGradientTop} stopOpacity={0.5} />
          <Stop offset="25%" stopColor={colors.mountainBlueLight} stopOpacity={0.4} />
          <Stop offset="55%" stopColor={colors.skyGradientBottom} stopOpacity={0.3} />
          <Stop offset="80%" stopColor={colors.sandLight} stopOpacity={0.6} />
          <Stop offset="100%" stopColor={colors.offWhite} />
        </LinearGradient>
      </Defs>
      <Rect width={VBW} height={VBH} fill="url(#cat-sky)" />
      {/* 5 mountain layers */}
      <Path d={buildSmallMountainPath(VBW, VBH, 0.55, 48)} fill={colors.mountainBlueDark} opacity={0.2} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.63, 22)} fill={colors.mountainBlue} opacity={0.3} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.70, 67)} fill={colors.espresso} opacity={0.35} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.78, 35)} fill={colors.espressoLight} opacity={0.4} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.85, 84)} fill={colors.sandDark} opacity={0.45} />
      {/* Trees with trunk + canopy */}
      <Path d="M35 165 L35 125 Q42 100 49 125 L49 165" fill={colors.mountainBlueDark} opacity={0.6} />
      <Path d="M26 135 Q42 108 58 135" fill={colors.mountainBlue} opacity={0.35} />
      <Path d="M28 145 Q42 120 56 145" fill={colors.mountainBlue} opacity={0.25} />
      <Path d="M75 163 L75 128 Q81 105 87 128 L87 163" fill={colors.mountainBlueDark} opacity={0.55} />
      <Path d="M67 138 Q81 112 95 138" fill={colors.mountainBlue} opacity={0.3} />
      <Path d="M69 148 Q81 125 93 148" fill={colors.mountainBlue} opacity={0.22} />
      <Path d="M195 163 L195 122 Q202 96 209 122 L209 163" fill={colors.mountainBlueDark} opacity={0.6} />
      <Path d="M187 132 Q202 104 217 132" fill={colors.mountainBlue} opacity={0.35} />
      <Path d="M240 165 L240 132 Q245 115 250 132 L250 165" fill={colors.mountainBlueDark} opacity={0.5} />
      <Path d="M233 142 Q245 120 257 142" fill={colors.mountainBlue} opacity={0.3} />
      {/* Forest path */}
      <Path
        d="M110 200 Q125 168 140 162 Q155 168 170 200"
        fill={colors.sandBase}
        opacity={0.5}
        stroke={colors.espressoLight}
        strokeWidth={0.5}
      />
      <Ellipse cx={140} cy={170} rx={8} ry={3} fill={colors.sunsetCoral} opacity={0.4} />
      <Ellipse cx={125} cy={178} rx={5} ry={2} fill={colors.sunsetCoralLight} opacity={0.3} />
      <Ellipse cx={155} cy={175} rx={6} ry={2} fill={colors.sunsetCoralLight} opacity={0.3} />
    </Svg>
  );
}
