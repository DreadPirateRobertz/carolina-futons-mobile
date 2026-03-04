import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Ellipse, Circle } from 'react-native-svg';
import { colors } from '@/theme/tokens';

interface Props {
  width?: number;
  height?: number;
  testID?: string;
}

export function StreamIllustration({ width = 280, height = 200, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 200" testID={testID}>
      <Defs>
        <LinearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.skyGradientTop} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={colors.sandLight} />
        </LinearGradient>
        <LinearGradient id="sc-water" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={colors.mountainBlueLight} stopOpacity={0.6} />
          <Stop offset="100%" stopColor={colors.mountainBlue} stopOpacity={0.4} />
        </LinearGradient>
      </Defs>
      <Rect width={280} height={200} fill="url(#sc-sky)" />
      <Path
        d="M0 130 Q70 115 140 125 Q210 110 280 122 L280 200 L0 200Z"
        fill={colors.sandDark}
        opacity={0.35}
      />
      <Path d="M100 200 Q110 170 125 155 Q140 145 155 155 Q170 170 180 200" fill="url(#sc-water)" />
      <Path
        d="M115 165 Q140 155 165 165"
        fill="none"
        stroke={colors.offWhite}
        strokeWidth={1}
        opacity={0.5}
      />
      <Path
        d="M108 178 Q140 168 172 178"
        fill="none"
        stroke={colors.offWhite}
        strokeWidth={0.8}
        opacity={0.4}
      />
      <Ellipse cx={85} cy={165} rx={18} ry={10} fill={colors.espressoLight} opacity={0.4} />
      <Ellipse cx={195} cy={162} rx={15} ry={8} fill={colors.espressoLight} opacity={0.35} />
      <Ellipse cx={210} cy={172} rx={10} ry={6} fill={colors.espresso} opacity={0.25} />
      <Path d="M0 155 Q30 148 60 152 Q80 150 85 155" fill={colors.sandBase} opacity={0.4} />
      <Path d="M195 155 Q220 148 250 152 Q270 150 280 155" fill={colors.sandBase} opacity={0.4} />
      <Circle cx={130} cy={160} r={2} fill={colors.offWhite} opacity={0.6} />
      <Circle cx={150} cy={163} r={1.5} fill={colors.offWhite} opacity={0.5} />
    </Svg>
  );
}
