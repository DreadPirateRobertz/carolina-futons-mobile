/**
 * @module AnimatedListItem
 *
 * Wrapper that staggers entrance animations for list items using
 * react-native-reanimated's FadeInDown. Each item's delay is based on its
 * index, creating a cascading reveal effect as lists populate.
 */

import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  index: number;
  delay?: number;
  style?: ViewStyle;
}

/** Wraps children in a staggered fade-in-down entrance animation based on list index. */
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
