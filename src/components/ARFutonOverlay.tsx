import React, { useMemo } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { type FutonModel, type Fabric, inchesToFeetDisplay } from '@/data/futons';

interface Props {
  model: FutonModel;
  fabric: Fabric;
  showDimensions: boolean;
  /** Whether the product has been placed via tap (controls visibility) */
  isPlaced?: boolean;
  /** Product category — murphy-beds get snap-to-wall behavior */
  category?: string;
  /** Shadow opacity from lighting estimation (0-1). Defaults to 0.15. */
  shadowOpacity?: number;
  testID?: string;
}

const SPRING_CONFIG = { damping: 20, stiffness: 200 };
const SNAP_SPRING = { damping: 25, stiffness: 300 };
const SCREEN = Dimensions.get('window');

/**
 * Realistic scale range: ±30% from true size.
 * This prevents unrealistic sizing — a 54" futon can't be pinched to 16" or 162".
 */
const SCALE_MIN = 0.7;
const SCALE_MAX = 1.3;

/** Distance from screen edge (dp) that triggers wall snap for murphy beds */
const WALL_SNAP_THRESHOLD = 60;

/**
 * Draggable, scalable, rotatable futon overlay for the AR camera view.
 * Renders a perspective futon shape colored with the selected fabric.
 * Supports:
 * - Pan (drag) to move
 * - Pinch to scale (constrained to realistic ±30% range)
 * - Two-finger rotation
 * - Tap-to-place (initially hidden until surface tap)
 * - Snap-to-wall for murphy cabinet beds
 * - Real-time shadow that responds to position and scale
 */
export function ARFutonOverlay({
  model,
  fabric,
  showDimensions,
  isPlaced = true,
  category,
  shadowOpacity = 0.15,
  testID,
}: Props) {
  const isMurphyBed = category === 'murphy-beds';

  // Gesture state
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedRotation = useSharedValue(0);

  // Shadow dynamics — track position offset for shadow direction
  const shadowOffsetX = useSharedValue(0);
  const shadowOffsetY = useSharedValue(4);

  // Wall snap state for murphy beds
  const isSnappedToWall = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;

      // Dynamic shadow: offset in the opposite direction of drag
      shadowOffsetX.value = -e.velocityX * 0.005;
      shadowOffsetY.value = 4 + Math.abs(e.velocityY * 0.003);
    })
    .onEnd(() => {
      // Murphy beds: snap to nearest wall (screen edge) if close enough
      if (isMurphyBed) {
        const halfScreen = SCREEN.width / 2;
        const distToLeft = halfScreen + translateX.value;
        const distToRight = halfScreen - translateX.value;

        if (distToLeft < WALL_SNAP_THRESHOLD) {
          // Snap to left wall
          translateX.value = withSpring(-(halfScreen - 30), SNAP_SPRING);
          isSnappedToWall.value = true;
        } else if (distToRight < WALL_SNAP_THRESHOLD) {
          // Snap to right wall
          translateX.value = withSpring(halfScreen - 30, SNAP_SPRING);
          isSnappedToWall.value = true;
        } else {
          translateX.value = withSpring(translateX.value, SPRING_CONFIG);
          isSnappedToWall.value = false;
        }
      } else {
        translateX.value = withSpring(translateX.value, SPRING_CONFIG);
      }

      translateY.value = withSpring(translateY.value, SPRING_CONFIG);

      // Settle shadow back to resting position
      shadowOffsetX.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
      shadowOffsetY.value = withTiming(4, { duration: 300, easing: Easing.out(Easing.quad) });
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      // Constrained to realistic range (±30% of true size)
      scale.value = Math.max(SCALE_MIN, Math.min(SCALE_MAX, savedScale.value * e.scale));
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
    opacity: isPlaced ? 1 : 0,
  }));

  // Dynamic shadow style: reacts to movement, scale, and position
  const shadowAnimatedStyle = useAnimatedStyle(() => {
    // Linear interpolation: map scale from [SCALE_MIN..SCALE_MAX] to output range
    const t = (scale.value - SCALE_MIN) / (SCALE_MAX - SCALE_MIN); // 0..1
    const shadowScale = 0.75 + t * (1.05 - 0.75);
    const dynamicOpacity = 0.2 + t * (0.1 - 0.2);
    const shadowBlur = 4 + t * (14 - 4);

    return {
      transform: [
        { translateX: shadowOffsetX.value },
        { translateY: shadowOffsetY.value },
        { scaleX: shadowScale },
      ],
      opacity: dynamicOpacity,
      height: shadowBlur,
    };
  });

  // Futon proportions based on model dimensions
  const aspectRatio = model.dimensions.width / model.dimensions.depth;
  const baseWidth = 220;
  const baseDepth = baseWidth / aspectRatio;
  const backHeight = baseDepth * 0.45;
  const armWidth = 14;
  const seatCushionDepth = baseDepth - backHeight;

  const darkerFabric = darkenColor(fabric.color, 0.15);

  // Wall snap indicator visibility
  const wallSnapBadge = useMemo(() => {
    if (!isMurphyBed) return null;
    return (
      <View style={styles.snapBadge} testID="ar-snap-badge">
        <Text style={styles.snapBadgeText}>Drag near wall to snap</Text>
      </View>
    );
  }, [isMurphyBed]);

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

          {/* Real-time dynamic shadow beneath — base opacity from lighting estimation */}
          <Animated.View
            style={[
              styles.futonShadow,
              {
                width: baseWidth * 0.9,
                top: baseDepth + backHeight * 0.25,
                backgroundColor: `rgba(0,0,0,${shadowOpacity})`,
              },
              shadowAnimatedStyle,
            ]}
            testID="ar-dynamic-shadow"
          />

          {/* Secondary ambient shadow for depth */}
          <View
            style={[
              styles.ambientShadow,
              { width: baseWidth * 0.7, top: baseDepth + backHeight * 0.3 },
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

        {/* Murphy bed wall snap hint */}
        {wallSnapBadge}
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
  ambientShadow: {
    position: 'absolute',
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 100,
    alignSelf: 'center',
    left: '15%',
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
  snapBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(91,143,168,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'center',
  },
  snapBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});
