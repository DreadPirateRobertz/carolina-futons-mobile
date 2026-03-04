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

export function ErrorIllustration({ width = 280, height = 200, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 200" testID={testID}>
      <Defs>
        <LinearGradient id="err-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.espresso} stopOpacity={0.55} />
          <Stop offset="25%" stopColor={colors.mountainBlueDark} stopOpacity={0.45} />
          <Stop offset="50%" stopColor={colors.espressoLight} stopOpacity={0.35} />
          <Stop offset="75%" stopColor={colors.mauve} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={colors.sandDark} stopOpacity={0.5} />
        </LinearGradient>
        <RadialGradient id="err-flash" cx="52%" cy="38%" r="20%">
          <Stop offset="0%" stopColor={colors.sunsetCoral} stopOpacity={0.45} />
          <Stop offset="50%" stopColor={colors.sunsetCoralLight} stopOpacity={0.15} />
          <Stop offset="100%" stopColor={colors.sunsetCoral} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={280} height={200} fill="url(#err-sky)" />

      {/* Storm cloud layers — dark, heavy, overlapping */}
      <Ellipse cx={70} cy={40} rx={55} ry={22} fill={colors.espresso} opacity={0.5} />
      <Ellipse cx={130} cy={35} rx={60} ry={25} fill={colors.espressoLight} opacity={0.55} />
      <Ellipse cx={190} cy={42} rx={55} ry={20} fill={colors.espresso} opacity={0.45} />
      <Ellipse cx={150} cy={30} rx={50} ry={18} fill={colors.espressoLight} opacity={0.4} />
      <Ellipse cx={240} cy={48} rx={45} ry={18} fill={colors.espresso} opacity={0.35} />
      {/* Lighter cloud wisps underneath */}
      <Ellipse cx={100} cy={55} rx={40} ry={10} fill={colors.mauve} opacity={0.25} />
      <Ellipse cx={200} cy={58} rx={35} ry={8} fill={colors.mauve} opacity={0.2} />

      {/* Lightning flash glow */}
      <Circle cx={148} cy={72} r={30} fill="url(#err-flash)" />

      {/* Lightning bolt — jagged zig-zag path */}
      <Path
        d="M148 48 L143 68 L152 65 L145 85 L155 80 L147 102"
        fill="none"
        stroke={colors.sunsetCoral}
        strokeWidth={2.5}
        opacity={0.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner bright core of lightning */}
      <Path
        d="M148 50 L144 66 L151 64 L146 82 L154 78 L148 98"
        fill="none"
        stroke={colors.sunsetCoralLight}
        strokeWidth={1}
        opacity={0.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 4 mountain layers — moody, darker tones */}
      <Path
        d={buildSmallMountainPath(280, 200, 0.56, 77)}
        fill={colors.espresso}
        opacity={0.25}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.65, 13)}
        fill={colors.mountainBlueDark}
        opacity={0.3}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.75, 49)}
        fill={colors.espressoLight}
        opacity={0.4}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.86, 92)}
        fill={colors.espresso}
        opacity={0.45}
      />

      {/* Rain streaks — subtle diagonal lines */}
      <Path
        d="M60 70 L55 95"
        fill="none"
        stroke={colors.mountainBlueLight}
        strokeWidth={0.6}
        opacity={0.2}
      />
      <Path
        d="M100 65 L95 90"
        fill="none"
        stroke={colors.mountainBlueLight}
        strokeWidth={0.6}
        opacity={0.18}
      />
      <Path
        d="M180 68 L175 93"
        fill="none"
        stroke={colors.mountainBlueLight}
        strokeWidth={0.6}
        opacity={0.2}
      />
      <Path
        d="M220 72 L215 97"
        fill="none"
        stroke={colors.mountainBlueLight}
        strokeWidth={0.6}
        opacity={0.15}
      />
    </Svg>
  );
}
