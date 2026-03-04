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

export function SearchIllustration({ width = 280, height = 200, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 200" testID={testID}>
      <Defs>
        <LinearGradient id="search-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.skyGradientTop} stopOpacity={0.6} />
          <Stop offset="30%" stopColor={colors.mountainBlueLight} stopOpacity={0.5} />
          <Stop offset="55%" stopColor={colors.offWhite} stopOpacity={0.7} />
          <Stop offset="80%" stopColor={colors.sandLight} stopOpacity={0.4} />
          <Stop offset="100%" stopColor={colors.offWhite} stopOpacity={0.9} />
        </LinearGradient>
        <LinearGradient id="search-mist" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={colors.offWhite} stopOpacity={0} />
          <Stop offset="35%" stopColor={colors.offWhite} stopOpacity={0.75} />
          <Stop offset="65%" stopColor={colors.offWhite} stopOpacity={0.75} />
          <Stop offset="100%" stopColor={colors.offWhite} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width={280} height={200} fill="url(#search-sky)" />

      {/* 4 mountain layers — low opacity for misty atmosphere */}
      <Path
        d={buildSmallMountainPath(280, 200, 0.45, 31)}
        fill={colors.mountainBlueDark}
        opacity={0.12}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.55, 58)}
        fill={colors.mountainBlue}
        opacity={0.18}
      />

      {/* Mid-level fog band */}
      <Rect y={100} width={280} height={28} fill="url(#search-mist)" />

      <Path
        d={buildSmallMountainPath(280, 200, 0.65, 44)}
        fill={colors.mountainBlue}
        opacity={0.25}
      />
      <Path
        d={buildSmallMountainPath(280, 200, 0.78, 19)}
        fill={colors.sandDark}
        opacity={0.35}
      />

      {/* Lower fog band */}
      <Rect y={145} width={280} height={20} fill="url(#search-mist)" />

      {/* Fog wisps — drifting ellipses */}
      <Ellipse cx={55} cy={108} rx={45} ry={8} fill={colors.offWhite} opacity={0.55} />
      <Ellipse cx={170} cy={115} rx={55} ry={10} fill={colors.offWhite} opacity={0.45} />
      <Ellipse cx={250} cy={105} rx={35} ry={7} fill={colors.offWhite} opacity={0.4} />
      <Ellipse cx={100} cy={150} rx={50} ry={9} fill={colors.offWhite} opacity={0.5} />
      <Ellipse cx={220} cy={155} rx={40} ry={7} fill={colors.offWhite} opacity={0.35} />

      {/* Distant bird silhouette */}
      <Path
        d="M180 42 C183 38, 186 37, 189 40 C192 37, 195 38, 198 42"
        fill="none"
        stroke={colors.mountainBlueDark}
        strokeWidth={1}
        opacity={0.3}
        strokeLinecap="round"
      />
      {/* Second bird, smaller and fainter */}
      <Path
        d="M160 50 C162 47, 164 46.5, 166 49 C168 46.5, 170 47, 172 50"
        fill="none"
        stroke={colors.mountainBlueDark}
        strokeWidth={0.8}
        opacity={0.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
