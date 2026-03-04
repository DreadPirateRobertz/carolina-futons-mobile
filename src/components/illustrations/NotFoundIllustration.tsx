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

export function NotFoundIllustration({ width = 280, height = 200, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 200" testID={testID}>
      <Defs>
        <LinearGradient id="nf-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.mountainBlueLight} stopOpacity={0.45} />
          <Stop offset="25%" stopColor={colors.skyGradientTop} stopOpacity={0.35} />
          <Stop offset="50%" stopColor={colors.offWhite} stopOpacity={0.7} />
          <Stop offset="75%" stopColor={colors.offWhite} stopOpacity={0.85} />
          <Stop offset="100%" stopColor={colors.offWhite} stopOpacity={0.95} />
        </LinearGradient>
        <LinearGradient id="nf-fog" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={colors.offWhite} stopOpacity={0} />
          <Stop offset="25%" stopColor={colors.offWhite} stopOpacity={0.85} />
          <Stop offset="50%" stopColor={colors.offWhite} stopOpacity={0.9} />
          <Stop offset="75%" stopColor={colors.offWhite} stopOpacity={0.85} />
          <Stop offset="100%" stopColor={colors.offWhite} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width={280} height={200} fill="url(#nf-sky)" />

      {/* 4 mountain layers — very low opacity, swallowed by fog */}
      <Path
        d={buildSmallMountainPath(280, 200, 0.4, 53)}
        fill={colors.mountainBlueDark}
        opacity={0.1}
      />

      {/* Deep fog layer 1 — covers distant mountains */}
      <Rect y={75} width={280} height={35} fill="url(#nf-fog)" />

      <Path
        d={buildSmallMountainPath(280, 200, 0.52, 26)}
        fill={colors.mountainBlue}
        opacity={0.14}
      />

      {/* Fog ellipses — drifting cloud shapes */}
      <Ellipse cx={80} cy={95} rx={65} ry={12} fill={colors.offWhite} opacity={0.65} />
      <Ellipse cx={210} cy={100} rx={55} ry={10} fill={colors.offWhite} opacity={0.55} />

      {/* Deep fog layer 2 */}
      <Rect y={108} width={280} height={30} fill="url(#nf-fog)" />

      <Path
        d={buildSmallMountainPath(280, 200, 0.63, 71)}
        fill={colors.mountainBlue}
        opacity={0.18}
      />

      {/* More fog wisps */}
      <Ellipse cx={140} cy={128} rx={70} ry={14} fill={colors.offWhite} opacity={0.6} />
      <Ellipse cx={50} cy={135} rx={45} ry={9} fill={colors.offWhite} opacity={0.5} />
      <Ellipse cx={240} cy={132} rx={40} ry={8} fill={colors.offWhite} opacity={0.45} />

      {/* Deep fog layer 3 */}
      <Rect y={142} width={280} height={22} fill="url(#nf-fog)" />

      <Path
        d={buildSmallMountainPath(280, 200, 0.78, 38)}
        fill={colors.sandDark}
        opacity={0.2}
      />

      {/* Faint trail disappearing into mist */}
      <Path
        d="M140 200 C138 188, 142 178, 140 170 C138 162, 143 155, 140 148 C137 141, 142 135, 140 128"
        fill="none"
        stroke={colors.sandBase}
        strokeWidth={4}
        opacity={0.25}
        strokeLinecap="round"
      />
      <Path
        d="M140 200 C138 188, 142 178, 140 170 C138 162, 143 155, 140 148 C137 141, 142 135, 140 128"
        fill="none"
        stroke={colors.sandLight}
        strokeWidth={2}
        opacity={0.15}
        strokeLinecap="round"
      />
      {/* Trail fades out at the top — ghost footsteps */}
      <Ellipse cx={139} cy={132} rx={3} ry={1.5} fill={colors.sandBase} opacity={0.15} />
      <Ellipse cx={141} cy={125} rx={2.5} ry={1.2} fill={colors.sandBase} opacity={0.1} />
      <Ellipse cx={140} cy={118} rx={2} ry={1} fill={colors.sandBase} opacity={0.06} />

      {/* Bottom fog — everything dissolves */}
      <Ellipse cx={140} cy={175} rx={80} ry={15} fill={colors.offWhite} opacity={0.5} />
    </Svg>
  );
}
