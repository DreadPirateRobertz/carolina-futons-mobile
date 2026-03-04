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
          <Stop offset="0%" stopColor={colors.espresso} stopOpacity={0.4} />
          <Stop offset="60%" stopColor={colors.mountainBlueDark} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={colors.sandDark} stopOpacity={0.5} />
        </LinearGradient>
        <RadialGradient id="err-lightning" cx="50%" cy="40%">
          <Stop offset="0%" stopColor={colors.sunsetCoral} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={colors.sunsetCoral} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={280} height={200} fill="url(#err-sky)" />
      <Ellipse cx={90} cy={50} rx={60} ry={25} fill={colors.espressoLight} opacity={0.5} />
      <Ellipse cx={130} cy={45} rx={50} ry={22} fill={colors.espresso} opacity={0.4} />
      <Ellipse cx={180} cy={55} rx={55} ry={20} fill={colors.espressoLight} opacity={0.45} />
      <Ellipse cx={160} cy={40} rx={45} ry={18} fill={colors.espresso} opacity={0.35} />
      <Path
        d="M145 65 L148 85 L142 85 L146 105"
        stroke={colors.sunsetCoral}
        strokeWidth={2}
        fill="none"
        opacity={0.6}
      />
      <Circle cx={146} cy={75} r={25} fill="url(#err-lightning)" />
      <Path
        d="M0 140 L50 105 L100 125 L140 95 L190 115 L240 100 L280 120 L280 200 L0 200Z"
        fill={colors.espresso}
        opacity={0.3}
      />
      <Path
        d="M0 165 Q70 150 140 158 Q210 148 280 160 L280 200 L0 200Z"
        fill={colors.espressoLight}
        opacity={0.35}
      />
      <Path
        d="M0 180 Q70 172 140 176 Q210 170 280 178 L280 200 L0 200Z"
        fill={colors.sandDark}
        opacity={0.4}
      />
    </Svg>
  );
}
