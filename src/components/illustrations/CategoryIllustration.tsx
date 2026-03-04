import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Path,
  Ellipse,
} from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { buildSmallMountainPath } from './shared';

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
          <Stop offset="0%" stopColor={colors.skyGradientTop} stopOpacity={0.5} />
          <Stop offset="30%" stopColor={colors.mountainBlueLight} stopOpacity={0.35} />
          <Stop offset="55%" stopColor={colors.sandLight} stopOpacity={0.5} />
          <Stop offset="80%" stopColor={colors.sandBase} stopOpacity={0.6} />
          <Stop offset="100%" stopColor={colors.offWhite} stopOpacity={0.8} />
        </LinearGradient>
        <LinearGradient id="cat-canopy" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.mountainBlueDark} stopOpacity={0.7} />
          <Stop offset="100%" stopColor={colors.mountainBlue} stopOpacity={0.4} />
        </LinearGradient>
      </Defs>
      <Rect width={280} height={200} fill="url(#cat-sky)" />

      {/* 4 mountain layers via C-bezier — forest backdrop */}
      <Path
        d={buildSmallMountainPath(280, 200, 0.48, 22)}
        fill={colors.mountainBlueDark}
        opacity={0.15}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.58, 67)}
        fill={colors.mountainBlue}
        opacity={0.25}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.68, 39)}
        fill={colors.espressoLight}
        opacity={0.35}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.8, 84)}
        fill={colors.sandDark}
        opacity={0.45}
      />

      {/* Tree trunks — tall forest pines */}
      {/* Left group */}
      <Rect x={28} y={108} width={3} height={60} fill={colors.espresso} opacity={0.6} />
      <Rect x={48} y={102} width={3} height={66} fill={colors.espresso} opacity={0.55} />
      <Rect x={65} y={112} width={2.5} height={56} fill={colors.espresso} opacity={0.5} />

      {/* Right group */}
      <Rect x={195} y={105} width={3} height={63} fill={colors.espresso} opacity={0.6} />
      <Rect x={218} y={110} width={3} height={58} fill={colors.espresso} opacity={0.55} />
      <Rect x={240} y={115} width={2.5} height={53} fill={colors.espresso} opacity={0.5} />

      {/* Tree canopies — overlapping C-curve shapes */}
      {/* Left canopies */}
      <Path
        d="M15 125 C22 100, 30 95, 30 95 C30 95, 38 100, 45 125"
        fill="url(#cat-canopy)"
        opacity={0.55}
      />
      <Path
        d="M20 118 C26 98, 30 92, 30 92 C30 92, 34 98, 40 118"
        fill={colors.mountainBlue}
        opacity={0.35}
      />
      <Path
        d="M33 120 C40 96, 50 90, 50 90 C50 90, 60 96, 67 120"
        fill="url(#cat-canopy)"
        opacity={0.5}
      />
      <Path
        d="M38 112 C44 93, 50 88, 50 88 C50 88, 56 93, 62 112"
        fill={colors.mountainBlue}
        opacity={0.3}
      />
      <Path
        d="M52 125 C58 108, 66 103, 66 103 C66 103, 74 108, 80 125"
        fill="url(#cat-canopy)"
        opacity={0.45}
      />

      {/* Right canopies */}
      <Path
        d="M182 122 C189 98, 197 92, 197 92 C197 92, 205 98, 212 122"
        fill="url(#cat-canopy)"
        opacity={0.55}
      />
      <Path
        d="M187 115 C193 97, 197 91, 197 91 C197 91, 201 97, 207 115"
        fill={colors.mountainBlue}
        opacity={0.3}
      />
      <Path
        d="M204 118 C211 100, 220 95, 220 95 C220 95, 229 100, 236 118"
        fill="url(#cat-canopy)"
        opacity={0.5}
      />
      <Path
        d="M228 122 C234 108, 241 103, 241 103 C241 103, 248 108, 254 122"
        fill="url(#cat-canopy)"
        opacity={0.45}
      />

      {/* Winding forest path through the center */}
      <Path
        d="M120 200 C122 185, 128 175, 135 168 C142 161, 148 155, 145 148 C142 141, 138 135, 140 128"
        fill="none"
        stroke={colors.sandBase}
        strokeWidth={5}
        opacity={0.4}
        strokeLinecap="round"
      />
      <Path
        d="M120 200 C122 185, 128 175, 135 168 C142 161, 148 155, 145 148 C142 141, 138 135, 140 128"
        fill="none"
        stroke={colors.sandLight}
        strokeWidth={2.5}
        opacity={0.3}
        strokeLinecap="round"
      />

      {/* Fallen leaves / forest floor detail */}
      <Ellipse cx={110} cy={178} rx={6} ry={2} fill={colors.sunsetCoral} opacity={0.25} />
      <Ellipse cx={155} cy={175} rx={5} ry={2} fill={colors.sunsetCoralLight} opacity={0.2} />
      <Ellipse cx={90} cy={182} rx={4} ry={1.5} fill={colors.sunsetCoral} opacity={0.2} />
    </Svg>
  );
}
