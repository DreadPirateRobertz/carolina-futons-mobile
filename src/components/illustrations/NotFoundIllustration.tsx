import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Ellipse } from 'react-native-svg';
import { colors } from '@/theme/tokens';

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
          <Stop offset="0%" stopColor={colors.mountainBlueLight} stopOpacity={0.4} />
          <Stop offset="100%" stopColor={colors.offWhite} />
        </LinearGradient>
        <LinearGradient id="nf-fog" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={colors.offWhite} stopOpacity={0} />
          <Stop offset="30%" stopColor={colors.offWhite} stopOpacity={0.8} />
          <Stop offset="70%" stopColor={colors.offWhite} stopOpacity={0.8} />
          <Stop offset="100%" stopColor={colors.offWhite} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width={280} height={200} fill="url(#nf-sky)" />
      <Path
        d="M0 110 L40 75 L80 95 L130 55 L180 85 L230 60 L280 90 L280 200 L0 200Z"
        fill={colors.mountainBlue}
        opacity={0.25}
      />
      <Rect y={95} width={280} height={40} fill="url(#nf-fog)" />
      <Path
        d="M0 140 L60 120 L120 135 L180 115 L240 130 L280 122 L280 200 L0 200Z"
        fill={colors.mountainBlueDark}
        opacity={0.2}
      />
      <Rect y={130} width={280} height={25} fill="url(#nf-fog)" />
      <Ellipse cx={100} cy={120} rx={60} ry={12} fill={colors.offWhite} opacity={0.6} />
      <Ellipse cx={200} cy={140} rx={50} ry={10} fill={colors.offWhite} opacity={0.5} />
      <Path
        d="M0 170 Q70 162 140 166 Q210 160 280 168 L280 200 L0 200Z"
        fill={colors.sandLight}
        opacity={0.5}
      />
    </Svg>
  );
}
