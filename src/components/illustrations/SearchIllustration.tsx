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

export function SearchIllustration({ width = VBW, height = VBH, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VBW} ${VBH}`} testID={testID}>
      <Defs>
        <LinearGradient id="search-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.skyGradientTop} stopOpacity={0.9} />
          <Stop offset="30%" stopColor={colors.mountainBlueLight} stopOpacity={0.7} />
          <Stop offset="60%" stopColor={colors.skyGradientBottom} stopOpacity={0.5} />
          <Stop offset="85%" stopColor={colors.sandLight} stopOpacity={0.6} />
          <Stop offset="100%" stopColor={colors.offWhite} />
        </LinearGradient>
      </Defs>
      <Rect width={VBW} height={VBH} fill="url(#search-sky)" />
      {/* 5 mountain layers */}
      <Path d={buildSmallMountainPath(VBW, VBH, 0.50, 33)} fill={colors.mountainBlueDark} opacity={0.2} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.58, 51)} fill={colors.mountainBlue} opacity={0.3} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.66, 14)} fill={colors.mountainBlue} opacity={0.4} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.75, 77)} fill={colors.espressoLight} opacity={0.45} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.83, 92)} fill={colors.sandDark} opacity={0.5} />
      {/* Fog wisps */}
      <Ellipse cx={70} cy={130} rx={55} ry={10} fill={colors.offWhite} opacity={0.5} />
      <Ellipse cx={200} cy={125} rx={45} ry={8} fill={colors.offWhite} opacity={0.4} />
      <Ellipse cx={140} cy={145} rx={60} ry={9} fill={colors.offWhite} opacity={0.35} />
      {/* Distant bird */}
      <Path
        d="M190 40 C193 37 196 36 199 38 C202 36 205 37 208 40"
        fill="none"
        stroke={colors.espresso}
        strokeWidth={0.8}
        opacity={0.3}
      />
    </Svg>
  );
}
