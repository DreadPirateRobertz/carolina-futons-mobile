import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  index: number;
  delay?: number;
  style?: ViewStyle;
}

export function AnimatedListItem({ children, index, delay = 80, style }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * delay)
        .duration(400)
        .springify()}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
