import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { type FutonModel, type Fabric, inchesToFeetDisplay } from '@/data/futons';

interface Props {
  model: FutonModel;
  fabric: Fabric;
  showDimensions: boolean;
  testID?: string;
}

const SPRING_CONFIG = { damping: 20, stiffness: 200 };

/**
 * Draggable, scalable, rotatable futon overlay for the AR camera view.
 * Renders a perspective futon shape colored with the selected fabric.
 * Supports pan (drag), pinch (scale), and rotation gestures simultaneously.
 */
export function ARFutonOverlay({ model, fabric, showDimensions, testID }: Props) {
  // Gesture state
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedRotation = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      // Snap with spring for natural feel
      translateX.value = withSpring(translateX.value, SPRING_CONFIG);
      translateY.value = withSpring(translateY.value, SPRING_CONFIG);
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.max(0.3, Math.min(3, savedScale.value * e.scale));
    })
    .onEnd(() => {
      scale.value = withSpring(scale.value, SPRING_CONFIG);
    });

  const rotationGesture = Gesture.Rotation()
    .onStart(() => {
      savedRotation.value = rotation.value;
    })
    .onUpdate((e) => {
      rotation.value = savedRotation.value + e.rotation;
    })
    .onEnd(() => {
      rotation.value = withSpring(rotation.value, SPRING_CONFIG);
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture, rotationGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}rad` },
    ],
  }));

  // Futon proportions based on model dimensions
  const aspectRatio = model.dimensions.width / model.dimensions.depth;
  const baseWidth = 220;
  const baseDepth = baseWidth / aspectRatio;
  const backHeight = baseDepth * 0.45;
  const armWidth = 14;
  const seatCushionDepth = baseDepth - backHeight;

  const darkerFabric = darkenColor(fabric.color, 0.15);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View testID={testID} style={[styles.container, animatedStyle]}>
        {/* Futon body - 3/4 perspective view */}
        <View
          style={[styles.futonBody, { width: baseWidth, height: baseDepth + backHeight * 0.3 }]}
        >
          {/* Back cushion */}
          <View
            style={[
              styles.backCushion,
              {
                width: baseWidth - armWidth * 2,
                height: backHeight,
                backgroundColor: darkerFabric,
                marginHorizontal: armWidth,
              },
            ]}
          >
            {/* Back cushion detail lines */}
            <View style={[styles.cushionLine, { backgroundColor: fabric.color, top: '30%' }]} />
            <View style={[styles.cushionLine, { backgroundColor: fabric.color, top: '60%' }]} />
          </View>

          {/* Seat cushion */}
          <View
            style={[
              styles.seatCushion,
              {
                width: baseWidth - armWidth * 2,
                height: seatCushionDepth,
                backgroundColor: fabric.color,
                marginHorizontal: armWidth,
              },
            ]}
          >
            {/* Seat cushion tufting detail */}
            <View style={styles.tuftRow}>
              <View style={[styles.tuft, { backgroundColor: darkerFabric }]} />
              <View style={[styles.tuft, { backgroundColor: darkerFabric }]} />
              <View style={[styles.tuft, { backgroundColor: darkerFabric }]} />
            </View>
          </View>

          {/* Left arm */}
          <View
            style={[
              styles.arm,
              styles.leftArm,
              {
                width: armWidth,
                height: baseDepth,
                backgroundColor: darkerFabric,
              },
            ]}
          />

          {/* Right arm */}
          <View
            style={[
              styles.arm,
              styles.rightArm,
              {
                width: armWidth,
                height: baseDepth,
                backgroundColor: darkerFabric,
              },
            ]}
          />

          {/* Shadow beneath */}
          <View
            style={[
              styles.futonShadow,
              { width: baseWidth * 0.9, top: baseDepth + backHeight * 0.25 },
            ]}
          />

          {/* Legs (visible peeking under) */}
          <View style={[styles.leg, { left: armWidth + 8, top: baseDepth + backHeight * 0.15 }]} />
          <View style={[styles.leg, { right: armWidth + 8, top: baseDepth + backHeight * 0.15 }]} />
        </View>

        {/* Dimension overlays */}
        {showDimensions && (
          <View style={styles.dimensionsContainer}>
            {/* Width line (horizontal, below futon) */}
            <View style={[styles.dimLine, styles.widthLine, { width: baseWidth }]}>
              <View style={styles.dimEndcapLeft} />
              <View style={[styles.dimLineBar, { flex: 1 }]} />
              <View style={styles.dimEndcapRight} />
            </View>
            <View style={[styles.dimLabel, styles.widthLabel, { width: baseWidth }]}>
              <Text style={styles.dimText}>{inchesToFeetDisplay(model.dimensions.width)} W</Text>
            </View>

            {/* Depth line (vertical, right of futon) */}
            <View
              style={[
                styles.dimLine,
                styles.depthLine,
                { height: baseDepth, left: baseWidth / 2 + 20 },
              ]}
            >
              <View style={styles.dimEndcapTop} />
              <View style={[styles.dimLineBarVertical, { flex: 1 }]} />
              <View style={styles.dimEndcapBottom} />
            </View>
            <View
              style={[
                styles.dimLabel,
                styles.depthLabel,
                { left: baseWidth / 2 + 30, top: baseDepth / 2 - 10 },
              ]}
            >
              <Text style={styles.dimText}>{inchesToFeetDisplay(model.dimensions.depth)} D</Text>
            </View>

            {/* Height indicator */}
            <View style={[styles.dimLabel, styles.heightLabel, { top: -(backHeight * 0.3 + 24) }]}>
              <Text style={styles.dimText}>{inchesToFeetDisplay(model.dimensions.height)} H</Text>
            </View>
          </View>
        )}

        {/* Model name badge */}
        <View style={styles.modelBadge}>
          <Text style={styles.modelBadgeText}>{model.name}</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount));
  const b = Math.max(0, (num & 0xff) * (1 - amount));
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  futonBody: {
    position: 'relative',
    // Slight perspective tilt for 3D feel
    transform: [{ perspective: 800 }, { rotateX: '15deg' }],
  },
  backCushion: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    overflow: 'hidden',
  },
  cushionLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    height: 1,
    opacity: 0.3,
    borderRadius: 1,
  },
  seatCushion: {
    borderRadius: 4,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tuftRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    paddingHorizontal: 20,
  },
  tuft: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.25,
  },
  arm: {
    position: 'absolute',
    top: 0,
    borderRadius: 4,
  },
  leftArm: {
    left: 0,
  },
  rightArm: {
    right: 0,
  },
  futonShadow: {
    position: 'absolute',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 100,
    alignSelf: 'center',
    left: '5%',
  },
  leg: {
    position: 'absolute',
    width: 6,
    height: 10,
    backgroundColor: '#5C4033',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  dimensionsContainer: {
    position: 'relative',
    alignItems: 'center',
    marginTop: 8,
  },
  dimLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  widthLine: {
    marginTop: 4,
  },
  depthLine: {
    position: 'absolute',
    flexDirection: 'column',
    top: -80,
  },
  dimLineBar: {
    height: 1.5,
    backgroundColor: '#FFFFFF',
  },
  dimLineBarVertical: {
    width: 1.5,
    backgroundColor: '#FFFFFF',
  },
  dimEndcapLeft: {
    width: 1.5,
    height: 10,
    backgroundColor: '#FFFFFF',
  },
  dimEndcapRight: {
    width: 1.5,
    height: 10,
    backgroundColor: '#FFFFFF',
  },
  dimEndcapTop: {
    width: 10,
    height: 1.5,
    backgroundColor: '#FFFFFF',
  },
  dimEndcapBottom: {
    width: 10,
    height: 1.5,
    backgroundColor: '#FFFFFF',
  },
  dimLabel: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  widthLabel: {
    marginTop: 4,
    alignSelf: 'center',
    alignItems: 'center',
  },
  depthLabel: {
    position: 'absolute',
  },
  heightLabel: {
    position: 'absolute',
    alignSelf: 'center',
  },
  dimText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modelBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  modelBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
