import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Path,
} from 'react-native-svg';
import { colors } from '@/theme/tokens';

interface Props {
  width?: number;
  height?: number;
  testID?: string;
}

export function ReviewsIllustration({ width = 280, height = 200, testID }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 200" testID={testID}>
      <Defs>
        <RadialGradient id="rev-sun" cx="50%" cy="65%" r="40%">
          <Stop offset="0%" stopColor={colors.skyGradientBottom} stopOpacity={0.8} />
          <Stop offset="50%" stopColor={colors.sunsetCoral} stopOpacity={0.4} />
          <Stop offset="100%" stopColor={colors.sunsetCoralDark} stopOpacity={0.1} />
        </RadialGradient>
        <LinearGradient id="rev-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.mountainBlue} stopOpacity={0.3} />
          <Stop offset="50%" stopColor={colors.sunsetCoralLight} stopOpacity={0.4} />
          <Stop offset="100%" stopColor={colors.sandBase} />
        </LinearGradient>
      </Defs>
      <Rect width={280} height={200} fill="url(#rev-sky)" />
      <Circle cx={140} cy={120} r={70} fill="url(#rev-sun)" />
      <Path
        d="M0 135 L40 95 L80 120 L120 75 L160 110 L200 80 L240 105 L280 90 L280 200 L0 200Z"
        fill={colors.espresso}
        opacity={0.35}
      />
      <Path
        d="M0 155 L50 125 L100 145 L140 115 L180 140 L220 120 L280 140 L280 200 L0 200Z"
        fill={colors.espressoLight}
        opacity={0.4}
      />
      <Path
        d="M0 175 Q70 165 140 170 Q210 163 280 172 L280 200 L0 200Z"
        fill={colors.sandDark}
        opacity={0.5}
      />
    </Svg>
  );
}
