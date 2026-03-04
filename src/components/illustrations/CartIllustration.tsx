import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle } from 'react-native-svg';
import { colors } from '@/theme/tokens';

interface Props {
  width?: number;
  height?: number;
  testID?: string;
}

export function CartIllustration({ width = 280, height = 200, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 200" testID={testID}>
      <Defs>
        <LinearGradient id="cart-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.sunsetCoral} stopOpacity={0.4} />
          <Stop offset="60%" stopColor={colors.sandBase} stopOpacity={0.6} />
          <Stop offset="100%" stopColor={colors.offWhite} />
        </LinearGradient>
      </Defs>
      <Rect width={280} height={200} fill="url(#cart-sky)" />
      <Path
        d="M0 140 Q30 110 70 120 Q110 95 140 105 Q180 80 220 100 Q260 90 280 110 L280 200 L0 200Z"
        fill={colors.mountainBlueDark}
        opacity={0.3}
      />
      <Path
        d="M0 155 Q40 130 80 140 Q120 120 160 135 Q200 115 240 130 Q270 125 280 135 L280 200 L0 200Z"
        fill={colors.mountainBlue}
        opacity={0.4}
      />
      <Path
        d="M0 170 Q50 160 100 165 Q140 155 180 162 Q220 158 280 165 L280 200 L0 200Z"
        fill={colors.sandDark}
        opacity={0.5}
      />
      <Path
        d="M120 200 Q125 175 130 170 Q140 165 150 170 Q155 175 160 200"
        fill={colors.espressoLight}
        opacity={0.5}
        stroke={colors.espresso}
        strokeWidth={0.5}
      />
      <Circle cx={200} cy={55} r={22} fill={colors.sunsetCoralLight} opacity={0.7} />
      <Circle cx={200} cy={55} r={15} fill={colors.sunsetCoral} opacity={0.5} />
    </Svg>
  );
}
