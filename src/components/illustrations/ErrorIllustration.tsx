import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Ellipse,
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

const VBW = 280;
const VBH = 200;

export function ErrorIllustration({ width = VBW, height = VBH, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VBW} ${VBH}`} testID={testID}>
      <Defs>
        <LinearGradient id="err-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.espresso} stopOpacity={0.5} />
          <Stop offset="30%" stopColor={colors.mountainBlueDark} stopOpacity={0.4} />
          <Stop offset="60%" stopColor={colors.espressoLight} stopOpacity={0.3} />
          <Stop offset="85%" stopColor={colors.sandDark} stopOpacity={0.4} />
          <Stop offset="100%" stopColor={colors.sandDark} stopOpacity={0.5} />
        </LinearGradient>
        <RadialGradient id="err-lightning" cx="50%" cy="40%">
          <Stop offset="0%" stopColor={colors.sunsetCoral} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={colors.sunsetCoral} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={VBW} height={VBH} fill="url(#err-sky)" />
      {/* Storm clouds — darker layers */}
      <Ellipse cx={80} cy={45} rx={65} ry={26} fill={colors.espressoLight} opacity={0.5} />
      <Ellipse cx={130} cy={40} rx={55} ry={24} fill={colors.espresso} opacity={0.45} />
      <Ellipse cx={185} cy={48} rx={58} ry={22} fill={colors.espressoLight} opacity={0.4} />
      <Ellipse cx={160} cy={35} rx={48} ry={20} fill={colors.espresso} opacity={0.38} />
      {/* Lightning bolts */}
      <Path
        d="M145 62 L148 82 L142 82 L146 102"
        stroke={colors.sunsetCoral}
        strokeWidth={2}
        fill="none"
        opacity={0.6}
      />
      <Path
        d="M100 55 L103 72 L98 72 L101 88"
        stroke={colors.sunsetCoral}
        strokeWidth={1.5}
        fill="none"
        opacity={0.4}
      />
      <Path
        d="M200 58 L202 70 L198 70 L201 84"
        stroke={colors.sunsetCoralLight}
        strokeWidth={1.2}
        fill="none"
        opacity={0.35}
      />
      <Circle cx={146} cy={72} r={25} fill="url(#err-lightning)" />
      {/* 5 mountain layers */}
      <Path d={buildSmallMountainPath(VBW, VBH, 0.55, 42)} fill={colors.espresso} opacity={0.25} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.63, 17)} fill={colors.espresso} opacity={0.3} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.72, 73)} fill={colors.espressoLight} opacity={0.35} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.80, 29)} fill={colors.espressoLight} opacity={0.4} />
      <Path d={buildSmallMountainPath(VBW, VBH, 0.88, 61)} fill={colors.sandDark} opacity={0.45} />
    </Svg>
  );
}
