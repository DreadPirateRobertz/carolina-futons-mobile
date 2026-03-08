/**
 * @module ReviewsIllustration
 *
 * Sunrise/golden-hour mountain scene used on review listing screens.
 * The radiant sun and warm rays evoke positivity and trust — fitting
 * for a section where customers share product feedback.
 */
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

const VBW = 280;
const VBH = 200;

/** SVG illustration for the reviews empty-state or header. */
export function ReviewsIllustration({ width = VBW, height = VBH, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VBW} ${VBH}`} testID={testID}>
      <Defs>
        <RadialGradient id="rev-sun" cx="50%" cy="55%" r="45%">
          <Stop offset="0%" stopColor={colors.skyGradientBottom} stopOpacity={0.8} />
          <Stop offset="40%" stopColor={colors.sunsetCoral} stopOpacity={0.4} />
          <Stop offset="70%" stopColor={colors.sunsetCoralLight} stopOpacity={0.2} />
          <Stop offset="100%" stopColor={colors.sunsetCoralDark} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="rev-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.mountainBlue} stopOpacity={0.3} />
          <Stop offset="30%" stopColor={colors.skyGradientTop} stopOpacity={0.4} />
          <Stop offset="55%" stopColor={colors.sunsetCoralLight} stopOpacity={0.4} />
          <Stop offset="80%" stopColor={colors.sandLight} stopOpacity={0.6} />
          <Stop offset="100%" stopColor={colors.sandBase} />
        </LinearGradient>
      </Defs>
      <Rect width={VBW} height={VBH} fill="url(#rev-sky)" />
      {/* Sun glow */}
      <Circle cx={140} cy={110} r={70} fill="url(#rev-sun)" />
      {/* Sun rays */}
      <Line
        x1={140}
        y1={50}
        x2={140}
        y2={30}
        stroke={colors.sunsetCoralLight}
        strokeWidth={1}
        opacity={0.3}
      />
      <Line
        x1={170}
        y1={55}
        x2={185}
        y2={38}
        stroke={colors.sunsetCoralLight}
        strokeWidth={0.8}
        opacity={0.25}
      />
      <Line
        x1={110}
        y1={55}
        x2={95}
        y2={38}
        stroke={colors.sunsetCoralLight}
        strokeWidth={0.8}
        opacity={0.25}
      />
      <Line
        x1={190}
        y1={70}
        x2={210}
        y2={60}
        stroke={colors.sunsetCoralLight}
        strokeWidth={0.6}
        opacity={0.2}
      />
      <Line
        x1={90}
        y1={70}
        x2={70}
        y2={60}
        stroke={colors.sunsetCoralLight}
        strokeWidth={0.6}
        opacity={0.2}
      />
      {/* 5 mountain layers */}
      <Path d={buildSmallMountainPath(VBW, VBH, 0.52, 42)} fill={colors.espresso} opacity={0.2} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.6, 17)} fill={colors.espresso} opacity={0.3} />
      <Path
        d={buildSmallMountainPath(VBW, VBH, 0.68, 73)}
        fill={colors.espressoLight}
        opacity={0.35}
      />
      <Path
        d={buildSmallMountainPath(VBW, VBH, 0.76, 29)}
        fill={colors.espressoLight}
        opacity={0.4}
      />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.84, 61)} fill={colors.sandDark} opacity={0.5} />
    </Svg>
  );
}
