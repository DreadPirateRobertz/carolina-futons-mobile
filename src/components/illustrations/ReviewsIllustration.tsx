import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Path,
  Line,
} from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { buildSmallMountainPath } from './shared';

interface Props {
  width?: number;
  height?: number;
  testID?: string;
}

export function ReviewsIllustration({ width = 280, height = 200, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 200" testID={testID}>
      <Defs>
        <LinearGradient id="rev-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.mountainBlue} stopOpacity={0.3} />
          <Stop offset="20%" stopColor={colors.skyGradientBottom} stopOpacity={0.6} />
          <Stop offset="45%" stopColor={colors.sunsetCoralLight} stopOpacity={0.5} />
          <Stop offset="70%" stopColor={colors.sandLight} stopOpacity={0.7} />
          <Stop offset="100%" stopColor={colors.sandBase} stopOpacity={0.9} />
        </LinearGradient>
        <RadialGradient id="rev-sun" cx="50%" cy="55%" r="35%">
          <Stop offset="0%" stopColor={colors.skyGradientBottom} stopOpacity={0.9} />
          <Stop offset="40%" stopColor={colors.sunsetCoralLight} stopOpacity={0.5} />
          <Stop offset="70%" stopColor={colors.sunsetCoral} stopOpacity={0.2} />
          <Stop offset="100%" stopColor={colors.sunsetCoralDark} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={280} height={200} fill="url(#rev-sky)" />

      {/* Central sun disc and glow */}
      <Circle cx={140} cy={100} r={65} fill="url(#rev-sun)" />
      <Circle cx={140} cy={100} r={16} fill={colors.skyGradientBottom} opacity={0.85} />
      <Circle cx={140} cy={100} r={10} fill={colors.sunsetCoralLight} opacity={0.6} />

      {/* Sun rays — radiating Line elements */}
      <Line x1={140} y1={78} x2={140} y2={62} stroke={colors.skyGradientBottom} strokeWidth={1.5} opacity={0.5} strokeLinecap="round" />
      <Line x1={140} y1={122} x2={140} y2={138} stroke={colors.skyGradientBottom} strokeWidth={1.5} opacity={0.5} strokeLinecap="round" />
      <Line x1={118} y1={100} x2={102} y2={100} stroke={colors.skyGradientBottom} strokeWidth={1.5} opacity={0.5} strokeLinecap="round" />
      <Line x1={162} y1={100} x2={178} y2={100} stroke={colors.skyGradientBottom} strokeWidth={1.5} opacity={0.5} strokeLinecap="round" />
      {/* Diagonal rays */}
      <Line x1={124} y1={84} x2={113} y2={73} stroke={colors.skyGradientBottom} strokeWidth={1.2} opacity={0.35} strokeLinecap="round" />
      <Line x1={156} y1={84} x2={167} y2={73} stroke={colors.skyGradientBottom} strokeWidth={1.2} opacity={0.35} strokeLinecap="round" />
      <Line x1={124} y1={116} x2={113} y2={127} stroke={colors.skyGradientBottom} strokeWidth={1.2} opacity={0.35} strokeLinecap="round" />
      <Line x1={156} y1={116} x2={167} y2={127} stroke={colors.skyGradientBottom} strokeWidth={1.2} opacity={0.35} strokeLinecap="round" />

      {/* 4 mountain layers via C-bezier */}
      <Path
        d={buildSmallMountainPath(280, 200, 0.55, 42)}
        fill={colors.espresso}
        opacity={0.2}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.64, 88)}
        fill={colors.espressoLight}
        opacity={0.3}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.74, 33)}
        fill={colors.espresso}
        opacity={0.4}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.85, 61)}
        fill={colors.sandDark}
        opacity={0.5}
      />
    </Svg>
  );
}
