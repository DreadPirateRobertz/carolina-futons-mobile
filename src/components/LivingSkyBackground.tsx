/**
 * @module LivingSkyBackground
 *
 * Phase 7 — Full-screen animated sky gradient background for HomeScreen.
 * Reads from useLivingSky hook and renders a 4-stop vertical LinearGradient
 * positioned absolutely behind all content.
 *
 * Falls back to solid #1a1a2e (deep night) if the hook returns invalid state.
 *
 * cf-2le / Phase 7
 */

import React, { memo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useLivingSky } from '@/hooks/useLivingSky';

const FALLBACK_COLOR = '#1a1a2e';

export const LivingSkyBackground = memo(function LivingSkyBackground() {
  const { width, height } = useWindowDimensions();
  const state = useLivingSky();
  const skyColors = state?.skyColors;

  // Fallback: invalid/missing skyColors
  if (!Array.isArray(skyColors) || skyColors.length < 4) {
    return (
      <View
        testID="living-sky-background"
        style={[styles.container, { backgroundColor: FALLBACK_COLOR, width, height }]}
      />
    );
  }

  return (
    <View testID="living-sky-background" style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="lskybg-grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={skyColors[0]} stopOpacity={1} />
            <Stop offset="33%" stopColor={skyColors[1]} stopOpacity={1} />
            <Stop offset="66%" stopColor={skyColors[2]} stopOpacity={1} />
            <Stop offset="100%" stopColor={skyColors[3]} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#lskybg-grad)" />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: -1,
  },
});
