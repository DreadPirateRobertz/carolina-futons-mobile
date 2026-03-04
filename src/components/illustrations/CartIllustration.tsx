import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle, Line } from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { buildSmallMountainPath } from './shared';

interface Props {
  width?: number;
  height?: number;
  testID?: string;
}

const VBW = 280;
const VBH = 200;

export function CartIllustration({ width = VBW, height = VBH, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VBW} ${VBH}`} testID={testID}>
      <Defs>
        <LinearGradient id="cart-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.skyGradientTop} stopOpacity={0.8} />
          <Stop offset="25%" stopColor={colors.mountainBlueLight} stopOpacity={0.6} />
          <Stop offset="50%" stopColor={colors.sunsetCoralLight} stopOpacity={0.4} />
          <Stop offset="75%" stopColor={colors.sandLight} stopOpacity={0.6} />
          <Stop offset="100%" stopColor={colors.offWhite} />
        </LinearGradient>
      </Defs>
      <Rect width={VBW} height={VBH} fill="url(#cart-sky)" />
      {/* Sun */}
      <Circle cx={200} cy={50} r={22} fill={colors.sunsetCoralLight} opacity={0.7} />
      <Circle cx={200} cy={50} r={15} fill={colors.sunsetCoral} opacity={0.5} />
      {/* 5 mountain layers */}
      <Path d={buildSmallMountainPath(VBW, VBH, 0.55, 42)} fill={colors.mountainBlueDark} opacity={0.2} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.62, 17)} fill={colors.mountainBlue} opacity={0.3} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.70, 73)} fill={colors.espresso} opacity={0.35} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.78, 29)} fill={colors.espressoLight} opacity={0.4} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.85, 61)} fill={colors.sandDark} opacity={0.5} />
      {/* Trail marker posts */}
      <Line x1={80} y1={158} x2={80} y2={145} stroke={colors.espresso} strokeWidth={1.5} opacity={0.5} />
      <Line x1={78} y1={145} x2={82} y2={145} stroke={colors.espresso} strokeWidth={1} opacity={0.5} />
      <Line x1={180} y1={162} x2={180} y2={150} stroke={colors.espresso} strokeWidth={1.5} opacity={0.4} />
      <Line x1={178} y1={150} x2={182} y2={150} stroke={colors.espresso} strokeWidth={1} opacity={0.4} />
      {/* Small footpath */}
      <Path
        d="M60 190 Q100 178 140 180 Q180 176 220 185 Q250 182 270 190"
        fill="none"
        stroke={colors.sandBase}
        strokeWidth={1.5}
        opacity={0.4}
      />
    </Svg>
  );
}
