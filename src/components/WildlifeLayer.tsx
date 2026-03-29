/**
 * @module WildlifeLayer
 *
 * Renders seasonal wildlife (birds, fireflies, owls) as an overlay on the
 * HomeScreen sky. Opacity values from useLivingSky state gate visibility
 * (threshold > 0.1) and drive Animated fade-in/out transitions.
 *
 * Usage: pass skyState from useLivingSky() in the parent.
 *
 * cf-hhf / Phase 7
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { LivingSkyState } from '@/types/livingSky';

const FADE_DURATION = 2000;
const VISIBILITY_THRESHOLD = 0.1;

interface Props {
  skyState: LivingSkyState;
}

export function WildlifeLayer({ skyState }: Props) {
  const reduceMotion = useReducedMotion();
  const birdAnim = useRef(new Animated.Value(skyState.birdOpacity)).current;
  const fireflyAnim = useRef(new Animated.Value(skyState.fireflyOpacity)).current;
  const owlAnim = useRef(new Animated.Value(skyState.owlOpacity)).current;

  useEffect(() => {
    const duration = reduceMotion ? 0 : FADE_DURATION;
    Animated.parallel([
      Animated.timing(birdAnim, {
        toValue: skyState.birdOpacity,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(fireflyAnim, {
        toValue: skyState.fireflyOpacity,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(owlAnim, {
        toValue: skyState.owlOpacity,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    skyState.birdOpacity,
    skyState.fireflyOpacity,
    skyState.owlOpacity,
    birdAnim,
    fireflyAnim,
    owlAnim,
    reduceMotion,
  ]);

  const showBirds = skyState.birdOpacity > VISIBILITY_THRESHOLD;
  const showFireflies = skyState.fireflyOpacity > VISIBILITY_THRESHOLD;
  const showOwl = skyState.owlOpacity > VISIBILITY_THRESHOLD;

  return (
    <View testID="wildlife-layer" style={styles.container} pointerEvents="none">
      {showBirds && (
        <Animated.View testID="wildlife-birds" style={[styles.layer, { opacity: birdAnim }]}>
          <Animated.Text style={[styles.bird, styles.bird1]}>🐦</Animated.Text>
          <Animated.Text style={[styles.bird, styles.bird2]}>🐦</Animated.Text>
          <Animated.Text style={[styles.bird, styles.bird3]}>🐦</Animated.Text>
        </Animated.View>
      )}

      {showFireflies && (
        <Animated.View testID="wildlife-fireflies" style={[styles.layer, { opacity: fireflyAnim }]}>
          <View style={[styles.firefly, styles.firefly1]} />
          <View style={[styles.firefly, styles.firefly2]} />
          <View style={[styles.firefly, styles.firefly3]} />
          <View style={[styles.firefly, styles.firefly4]} />
          <View style={[styles.firefly, styles.firefly5]} />
        </Animated.View>
      )}

      {showOwl && (
        <Animated.View testID="wildlife-owl" style={[styles.layer, { opacity: owlAnim }]}>
          <Animated.Text style={styles.owl}>🦉</Animated.Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  // Birds — scattered across upper third
  bird: {
    position: 'absolute',
    fontSize: 14,
  },
  bird1: { top: '12%', left: '20%' },
  bird2: { top: '8%', left: '55%' },
  bird3: { top: '15%', left: '75%' },
  // Fireflies — lower half, scattered
  firefly: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFACD',
  },
  firefly1: { top: '55%', left: '15%' },
  firefly2: { top: '65%', left: '35%' },
  firefly3: { top: '60%', left: '60%' },
  firefly4: { top: '70%', left: '80%' },
  firefly5: { top: '50%', left: '50%' },
  // Owl — lower right, perched silhouette
  owl: {
    position: 'absolute',
    fontSize: 22,
    bottom: '15%',
    right: '8%',
  },
});
