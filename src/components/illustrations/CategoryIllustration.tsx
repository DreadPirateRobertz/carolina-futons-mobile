import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Ellipse } from 'react-native-svg';
import { colors } from '@/theme/tokens';

interface Props {
  width?: number;
  height?: number;
  testID?: string;
}

export function CategoryIllustration({ width = 280, height = 200, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 200" testID={testID}>
      <Defs>
        <LinearGradient id="cat-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.skyGradientTop} stopOpacity={0.4} />
          <Stop offset="100%" stopColor={colors.sandLight} />
        </LinearGradient>
      </Defs>
      <Rect width={280} height={200} fill="url(#cat-sky)" />
      <Path
        d="M0 150 Q70 130 140 140 Q210 128 280 142 L280 200 L0 200Z"
        fill={colors.sandDark}
        opacity={0.4}
      />
      <Path
        d="M30 160 L30 110 Q40 80 50 110 L50 160"
        fill={colors.mountainBlueDark}
        opacity={0.6}
      />
      <Path d="M20 125 Q40 95 60 125" fill={colors.mountainBlue} opacity={0.35} />
      <Path
        d="M70 158 L70 120 Q78 95 86 120 L86 158"
        fill={colors.mountainBlueDark}
        opacity={0.55}
      />
      <Path d="M62 130 Q78 105 94 130" fill={colors.mountainBlue} opacity={0.3} />
      <Path
        d="M190 158 L190 115 Q198 88 206 115 L206 158"
        fill={colors.mountainBlueDark}
        opacity={0.6}
      />
      <Path d="M182 128 Q198 98 214 128" fill={colors.mountainBlue} opacity={0.35} />
      <Path
        d="M235 160 L235 125 Q241 105 247 125 L247 160"
        fill={colors.mountainBlueDark}
        opacity={0.5}
      />
      <Path d="M228 135 Q241 112 254 135" fill={colors.mountainBlue} opacity={0.3} />
      <Path
        d="M110 200 Q125 160 140 155 Q155 160 170 200"
        fill={colors.sandBase}
        opacity={0.5}
        stroke={colors.espressoLight}
        strokeWidth={0.5}
      />
      <Ellipse cx={140} cy={165} rx={8} ry={3} fill={colors.sunsetCoral} opacity={0.4} />
      <Ellipse cx={125} cy={172} rx={5} ry={2} fill={colors.sunsetCoralLight} opacity={0.3} />
      <Ellipse cx={155} cy={170} rx={6} ry={2} fill={colors.sunsetCoralLight} opacity={0.3} />
    </Svg>
  );
}
