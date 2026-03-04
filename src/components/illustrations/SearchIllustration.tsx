import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Ellipse } from 'react-native-svg';
import { colors } from '@/theme/tokens';

interface Props {
  width?: number;
  height?: number;
  testID?: string;
}

export function SearchIllustration({ width = 280, height = 200, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 200" testID={testID}>
      <Defs>
        <LinearGradient id="search-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.skyGradientTop} />
          <Stop offset="100%" stopColor={colors.offWhite} />
        </LinearGradient>
        <LinearGradient id="search-mist" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={colors.offWhite} stopOpacity={0} />
          <Stop offset="50%" stopColor={colors.offWhite} stopOpacity={0.7} />
          <Stop offset="100%" stopColor={colors.offWhite} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width={280} height={200} fill="url(#search-sky)" />
      <Path
        d="M0 130 L60 70 L100 110 L150 55 L200 100 L250 65 L280 95 L280 200 L0 200Z"
        fill={colors.mountainBlueDark}
        opacity={0.35}
      />
      <Path
        d="M0 150 L50 100 L90 130 L140 80 L190 120 L230 90 L280 120 L280 200 L0 200Z"
        fill={colors.mountainBlue}
        opacity={0.45}
      />
      <Rect y={110} width={280} height={30} fill="url(#search-mist)" />
      <Path
        d="M0 165 Q60 155 120 160 Q180 150 240 158 Q265 155 280 160 L280 200 L0 200Z"
        fill={colors.sandLight}
        opacity={0.6}
      />
      <Ellipse cx={70} cy={135} rx={50} ry={10} fill={colors.offWhite} opacity={0.5} />
      <Ellipse cx={210} cy={128} rx={40} ry={8} fill={colors.offWhite} opacity={0.4} />
    </Svg>
  );
}
