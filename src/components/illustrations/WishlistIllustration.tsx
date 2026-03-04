import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Path,
  Circle,
} from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { buildSmallMountainPath } from './shared';

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
          <Stop offset="0%" stopColor={colors.skyGradientTop} stopOpacity={0.6} />
          <Stop offset="25%" stopColor={colors.mountainBlueLight} stopOpacity={0.4} />
          <Stop offset="50%" stopColor={colors.skyGradientBottom} stopOpacity={0.5} />
          <Stop offset="75%" stopColor={colors.sandLight} stopOpacity={0.7} />
          <Stop offset="100%" stopColor={colors.offWhite} stopOpacity={0.9} />
        </LinearGradient>
        <RadialGradient id="wish-glow" cx="50%" cy="80%" r="35%">
          <Stop offset="0%" stopColor={colors.sunsetCoralLight} stopOpacity={0.4} />
          <Stop offset="60%" stopColor={colors.skyGradientBottom} stopOpacity={0.15} />
          <Stop offset="100%" stopColor={colors.skyGradientBottom} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={280} height={200} fill="url(#wish-sky)" />

      {/* Warm glow behind cabin area */}
      <Circle cx={140} cy={155} r={60} fill="url(#wish-glow)" />

      {/* 4 mountain layers via C-bezier */}
      <Path
        d={buildSmallMountainPath(280, 200, 0.48, 37)}
        fill={colors.mountainBlueDark}
        opacity={0.18}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.57, 62)}
        fill={colors.mountainBlue}
        opacity={0.28}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.68, 14)}
        fill={colors.espressoLight}
        opacity={0.38}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.8, 51)}
        fill={colors.sandDark}
        opacity={0.45}
      />

      {/* Tree on the left */}
      <Path
        d="M55 168 L55 138"
        fill="none"
        stroke={colors.espresso}
        strokeWidth={2}
        opacity={0.6}
      />
      <Path
        d="M42 155 C45 138, 55 128, 55 128 C55 128, 65 138, 68 155"
        fill={colors.mountainBlueDark}
        opacity={0.5}
      />
      <Path
        d="M45 148 C48 135, 55 127, 55 127 C55 127, 62 135, 65 148"
        fill={colors.mountainBlue}
        opacity={0.35}
      />

      {/* Tree on the right */}
      <Path
        d="M215 170 L215 142"
        fill="none"
        stroke={colors.espresso}
        strokeWidth={2}
        opacity={0.55}
      />
      <Path
        d="M203 158 C206 143, 215 134, 215 134 C215 134, 224 143, 227 158"
        fill={colors.mountainBlueDark}
        opacity={0.45}
      />
      <Path
        d="M206 150 C209 138, 215 131, 215 131 C215 131, 221 138, 224 150"
        fill={colors.mountainBlue}
        opacity={0.3}
      />

      {/* Small tree far right */}
      <Path
        d="M245 172 L245 155"
        fill="none"
        stroke={colors.espresso}
        strokeWidth={1.5}
        opacity={0.4}
      />
      <Path
        d="M237 165 C239 155, 245 150, 245 150 C245 150, 251 155, 253 165"
        fill={colors.mountainBlueDark}
        opacity={0.35}
      />

      {/* Cabin body */}
      <Rect x={118} y={155} width={44} height={25} fill={colors.espressoLight} opacity={0.7} />
      {/* Cabin roof */}
      <Path
        d="M112 155 L140 135 L168 155 Z"
        fill={colors.espresso}
        opacity={0.75}
      />
      {/* Door */}
      <Rect x={132} y={164} width={12} height={16} fill={colors.sandDark} opacity={0.6} />
      {/* Window */}
      <Rect x={148} y={160} width={8} height={8} fill={colors.skyGradientBottom} opacity={0.5} />
      {/* Window glow */}
      <Circle cx={152} cy={164} r={5} fill={colors.sunsetCoralLight} opacity={0.2} />

      {/* Chimney */}
      <Rect x={155} y={138} width={6} height={17} fill={colors.espresso} opacity={0.65} />

      {/* Chimney smoke — curving wisps rising */}
      <Path
        d="M158 138 C160 130, 155 125, 158 118 C161 111, 155 106, 158 100"
        fill="none"
        stroke={colors.offWhite}
        strokeWidth={2}
        opacity={0.3}
        strokeLinecap="round"
      />
      <Path
        d="M158 138 C162 132, 157 127, 161 121 C165 115, 159 110, 163 104"
        fill="none"
        stroke={colors.offWhite}
        strokeWidth={1.2}
        opacity={0.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
