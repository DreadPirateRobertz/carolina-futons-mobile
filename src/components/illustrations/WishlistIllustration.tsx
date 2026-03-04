import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Polygon, Circle } from 'react-native-svg';
import { colors } from '@/theme/tokens';

interface Props {
  width?: number;
  height?: number;
  testID?: string;
}

export function WishlistIllustration({ width = 280, height = 200, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 200" testID={testID}>
      <Defs>
        <LinearGradient id="wish-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.skyGradientTop} stopOpacity={0.5} />
          <Stop offset="100%" stopColor={colors.sandLight} />
        </LinearGradient>
      </Defs>
      <Rect width={280} height={200} fill="url(#wish-sky)" />
      <Path
        d="M0 140 Q70 100 140 115 Q210 95 280 120 L280 200 L0 200Z"
        fill={colors.mountainBlue}
        opacity={0.3}
      />
      <Path
        d="M0 165 Q70 150 140 155 Q210 148 280 158 L280 200 L0 200Z"
        fill={colors.sandDark}
        opacity={0.4}
      />
      <Polygon points="140,95 115,130 165,130" fill={colors.espresso} opacity={0.8} />
      <Rect x={122} y={130} width={36} height={30} fill={colors.espressoLight} />
      <Rect x={133} y={140} width={14} height={20} fill={colors.sandBase} />
      <Polygon
        points="140,88 108,128 172,128"
        fill="none"
        stroke={colors.espresso}
        strokeWidth={1.5}
        opacity={0.5}
      />
      <Path
        d="M60 160 L60 130 Q65 110 70 130 L70 160"
        fill={colors.mountainBlueDark}
        opacity={0.5}
      />
      <Path d="M55 140 Q65 125 75 140" fill={colors.mountainBlue} opacity={0.3} />
      <Path
        d="M200 158 L200 125 Q205 105 210 125 L210 158"
        fill={colors.mountainBlueDark}
        opacity={0.5}
      />
      <Path d="M195 138 Q205 120 215 138" fill={colors.mountainBlue} opacity={0.3} />
      <Path
        d="M230 160 L230 135 Q233 120 236 135 L236 160"
        fill={colors.mountainBlueDark}
        opacity={0.4}
      />
      <Circle cx={155} cy={120} r={3} fill={colors.sunsetCoral} opacity={0.6} />
    </Svg>
  );
}
