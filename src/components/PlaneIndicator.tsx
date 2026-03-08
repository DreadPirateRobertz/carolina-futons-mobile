/**
 * Visual indicator for detected AR surface planes.
 *
 * Renders a semi-transparent grid overlay on detected floor/wall surfaces
 * to show the user where furniture can be placed. Uses animated transitions
 * for smooth appearance as planes are detected and refined.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import type { DetectedPlane, DetectionState } from '@/services/surfaceDetection';
import type { ShadowParams } from '@/services/lightingEstimation';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  planes: DetectedPlane[];
  detectionState: DetectionState;
  shadowParams: ShadowParams;
  /** Whether the user has placed furniture (hides guide indicators) */
  hasPlacement: boolean;
  testID?: string;
}

/**
 * Renders detected surface planes as visual indicators.
 *
 * - Scanning: shows animated scan line
 * - Detected: shows plane grid with pulsing border
 * - Tracking: stable plane with placement reticle
 */
export function PlaneIndicator({
  planes,
  detectionState,
  shadowParams,
  hasPlacement,
  testID,
}: Props) {
  const reduceMotion = useReducedMotion();
  const scanLinePosition = useSharedValue(0);
  const planeOpacity = useSharedValue(0);
  const reticleScale = useSharedValue(1);

  // Animate scan line during scanning phase
  useEffect(() => {
    if (detectionState === 'scanning') {
      if (reduceMotion) {
        scanLinePosition.value = 0.5;
      } else {
        scanLinePosition.value = withRepeat(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        );
      }
    } else {
      scanLinePosition.value = reduceMotion ? 0.5 : withTiming(0.5, { duration: 300 });
    }
  }, [detectionState, scanLinePosition, reduceMotion]);

  // Fade in planes when detected
  useEffect(() => {
    if (detectionState === 'detected' || detectionState === 'tracking') {
      planeOpacity.value = reduceMotion ? 1 : withTiming(1, { duration: 500 });
    } else {
      planeOpacity.value = reduceMotion ? 0 : withTiming(0, { duration: 300 });
    }
  }, [detectionState, planeOpacity, reduceMotion]);

  // Pulse reticle in detected/tracking state
  useEffect(() => {
    if ((detectionState === 'detected' || detectionState === 'tracking') && !hasPlacement) {
      if (!reduceMotion) {
        reticleScale.value = withRepeat(
          withSequence(
            withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
        );
      }
    } else {
      reticleScale.value = reduceMotion ? 1 : withTiming(1, { duration: 200 });
    }
  }, [detectionState, hasPlacement, reticleScale, reduceMotion]);

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${scanLinePosition.value * 100}%` as `${number}%`,
    opacity: detectionState === 'scanning' ? 0.6 : 0,
  }));

  const planeContainerStyle = useAnimatedStyle(() => ({
    opacity: planeOpacity.value,
  }));

  const reticleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reticleScale.value }],
  }));

  const floorPlanes = planes.filter((p) => p.type === 'floor');
  const wallPlanes = planes.filter((p) => p.type === 'wall');

  return (
    <View style={styles.container} testID={testID} pointerEvents="none">
      {/* Scanning animation */}
      {detectionState === 'scanning' && (
        <View style={styles.scanOverlay} testID="plane-scanning">
          <Animated.View style={[styles.scanLine, scanLineStyle]} />
          <View style={styles.scanHintContainer}>
            <Text style={styles.scanHintText}>
              Point at the floor and move slowly to detect surfaces
            </Text>
          </View>
        </View>
      )}

      {/* Detected plane overlays */}
      <Animated.View style={[styles.planeContainer, planeContainerStyle]}>
        {floorPlanes.map((plane) => (
          <FloorPlaneOverlay
            key={plane.id}
            plane={plane}
            shadowParams={shadowParams}
            testID={`floor-plane-${plane.id}`}
          />
        ))}
        {wallPlanes.map((plane) => (
          <WallPlaneOverlay key={plane.id} plane={plane} testID={`wall-plane-${plane.id}`} />
        ))}
      </Animated.View>

      {/* Placement reticle — shown when surface detected/tracking and no furniture placed */}
      {(detectionState === 'detected' || detectionState === 'tracking') &&
        !hasPlacement &&
        floorPlanes.length > 0 && (
          <View style={styles.reticleContainer} testID="placement-reticle">
            <Animated.View style={[styles.reticle, reticleStyle]}>
              <View style={styles.reticleRing} />
              <View style={styles.reticleDot} />
              <View style={[styles.reticleLine, styles.reticleLineH]} />
              <View style={[styles.reticleLine, styles.reticleLineV]} />
            </Animated.View>
            <Text style={styles.reticleHint}>
              {detectionState === 'detected'
                ? 'Surface found — tap to place furniture'
                : 'Tap on the floor to place furniture'}
            </Text>
          </View>
        )}

      {/* Status badge */}
      <View style={styles.statusContainer}>
        <StatusBadge
          detectionState={detectionState}
          planeCount={planes.length}
          hasFloor={floorPlanes.length > 0}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FloorPlaneOverlay({
  plane,
  shadowParams,
  testID,
}: {
  plane: DetectedPlane;
  shadowParams: ShadowParams;
  testID?: string;
}) {
  // Map plane center/extent to screen positioning
  const left = `${(plane.center.x - plane.extent.width / 6) * 100}%` as `${number}%`;
  const top = `${(plane.center.y - plane.extent.height / 6) * 100}%` as `${number}%`;
  const width = `${(plane.extent.width / 3) * 100}%` as `${number}%`;
  const height = `${(plane.extent.height / 3) * 100}%` as `${number}%`;

  const confidenceOpacity = plane.confidence * 0.4;

  return (
    <View
      style={[
        styles.floorPlane,
        {
          left,
          top,
          width,
          height,
          opacity: confidenceOpacity,
        },
      ]}
      testID={testID}
    >
      {/* Grid pattern */}
      <View style={styles.gridContainer}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View
            key={`h-${i}`}
            style={[styles.gridLine, styles.gridLineH, { top: `${(i + 1) * 20}%` as `${number}%` }]}
          />
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <View
            key={`v-${i}`}
            style={[
              styles.gridLine,
              styles.gridLineV,
              { left: `${(i + 1) * 20}%` as `${number}%` },
            ]}
          />
        ))}
      </View>

      {/* Plane border with confidence glow */}
      <View
        style={[
          styles.planeBorder,
          {
            shadowColor: shadowParams.color,
            shadowOpacity: shadowParams.opacity,
            shadowRadius: shadowParams.blur,
          },
        ]}
      />
    </View>
  );
}

function WallPlaneOverlay({ plane, testID }: { plane: DetectedPlane; testID?: string }) {
  const left = `${(plane.center.x - plane.extent.width / 8) * 100}%` as `${number}%`;
  const top = `${(plane.center.y - plane.extent.height / 8) * 100}%` as `${number}%`;
  const width = `${(plane.extent.width / 4) * 100}%` as `${number}%`;
  const height = `${(plane.extent.height / 4) * 100}%` as `${number}%`;

  return (
    <View
      style={[
        styles.wallPlane,
        {
          left,
          top,
          width,
          height,
          opacity: plane.confidence * 0.25,
        },
      ]}
      testID={testID}
    >
      <View style={styles.wallBorder} />
    </View>
  );
}

function StatusBadge({
  detectionState,
  planeCount,
  hasFloor,
}: {
  detectionState: DetectionState;
  planeCount: number;
  hasFloor: boolean;
}) {
  let label: string;
  let color: string;

  switch (detectionState) {
    case 'scanning':
      label = 'Scanning room...';
      color = '#5B8FA8';
      break;
    case 'detected':
      label = hasFloor ? 'Floor detected' : 'Surface detected';
      color = '#4A7C59';
      break;
    case 'tracking':
      label = `Tracking ${planeCount} surface${planeCount !== 1 ? 's' : ''}`;
      color = '#4A7C59';
      break;
    case 'limited':
      label = 'Limited tracking';
      color = '#E8845C';
      break;
    case 'error':
      label = 'Detection error';
      color = '#E8845C';
      break;
    default:
      label = 'Initializing...';
      color = '#6B7B8D';
      break;
  }

  return (
    <View style={[styles.statusBadge, { backgroundColor: color }]} testID="detection-status">
      <View style={[styles.statusDot, { backgroundColor: '#FFFFFF' }]} />
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  scanLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: '#5B8FA8',
    shadowColor: '#5B8FA8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  scanHintContainer: {
    position: 'absolute',
    bottom: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanHintText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  planeContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  floorPlane: {
    position: 'absolute',
    borderRadius: 4,
    // Perspective transform for floor appearance
    transform: [{ perspective: 600 }, { rotateX: '45deg' }],
  },
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(91, 143, 168, 0.5)',
  },
  gridLineH: {
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineV: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  planeBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderColor: 'rgba(91, 143, 168, 0.6)',
    borderRadius: 4,
  },
  wallPlane: {
    position: 'absolute',
    borderRadius: 2,
  },
  wallBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(201, 160, 160, 0.4)',
    borderRadius: 2,
    borderStyle: 'dashed',
  },
  reticleContainer: {
    position: 'absolute',
    top: '55%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  reticle: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleRing: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  reticleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  reticleLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  reticleLineH: {
    width: 60,
    height: 1,
    top: 29.5,
  },
  reticleLineV: {
    width: 1,
    height: 60,
    left: 29.5,
  },
  reticleHint: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
