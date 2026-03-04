import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Path,
  Circle,
  Line,
} from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { buildSmallMountainPath } from './shared';

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
          <Stop offset="0%" stopColor={colors.skyGradientTop} stopOpacity={0.8} />
          <Stop offset="25%" stopColor={colors.sunsetCoralLight} stopOpacity={0.5} />
          <Stop offset="50%" stopColor={colors.skyGradientBottom} stopOpacity={0.7} />
          <Stop offset="75%" stopColor={colors.sandLight} stopOpacity={0.6} />
          <Stop offset="100%" stopColor={colors.offWhite} stopOpacity={0.9} />
        </LinearGradient>
      </Defs>
      <Rect width={280} height={200} fill="url(#cart-sky)" />

      {/* Warm sunset glow */}
      <Circle cx={220} cy={50} r={30} fill={colors.sunsetCoralLight} opacity={0.35} />
      <Circle cx={220} cy={50} r={18} fill={colors.sunsetCoral} opacity={0.45} />

      {/* 4 mountain layers via C-bezier */}
      <Path
        d={buildSmallMountainPath(280, 200, 0.52, 42)}
        fill={colors.mountainBlueDark}
        opacity={0.2}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.6, 17)}
        fill={colors.mountainBlue}
        opacity={0.3}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.7, 73)}
        fill={colors.espressoLight}
        opacity={0.4}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.82, 29)}
        fill={colors.sandDark}
        opacity={0.5}
      />

      {/* Winding footpath down the hillside */}
      <Path
        d="M140 170 C145 160, 135 152, 140 144 C145 136, 130 128, 138 120 C146 112, 128 105, 135 98"
        fill="none"
        stroke={colors.sandLight}
        strokeWidth={3}
        opacity={0.5}
        strokeLinecap="round"
      />
      <Path
        d="M140 170 C145 160, 135 152, 140 144 C145 136, 130 128, 138 120 C146 112, 128 105, 135 98"
        fill="none"
        stroke={colors.offWhite}
        strokeWidth={1.5}
        opacity={0.3}
        strokeLinecap="round"
      />

      {/* Wooden sign post */}
      <Line
        x1={90}
        y1={148}
        x2={90}
        y2={175}
        stroke={colors.espresso}
        strokeWidth={2.5}
        opacity={0.7}
      />
      {/* Sign board */}
      <Path
        d="M75 148 L105 148 L105 160 L75 160 Z"
        fill={colors.espressoLight}
        opacity={0.65}
        stroke={colors.espresso}
        strokeWidth={0.8}
      />
      {/* Sign grain lines */}
      <Line
        x1={78}
        y1={152}
        x2={102}
        y2={152}
        stroke={colors.sandDark}
        strokeWidth={0.5}
        opacity={0.4}
      />
      <Line
        x1={78}
        y1={156}
        x2={102}
        y2={156}
        stroke={colors.sandDark}
        strokeWidth={0.5}
        opacity={0.3}
      />

      {/* Small grass tufts along path */}
      <Path
        d="M150 172 Q152 166 154 172"
        fill="none"
        stroke={colors.espressoLight}
        strokeWidth={1}
        opacity={0.4}
      />
      <Path
        d="M125 168 Q127 163 129 168"
        fill="none"
        stroke={colors.espressoLight}
        strokeWidth={1}
        opacity={0.35}
      />
    </Svg>
  );
}
