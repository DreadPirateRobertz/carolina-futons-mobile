/**
 * @module SurfaceIndicator
 *
 * Visual feedback overlay for AR (Augmented Reality) surface detection.
 * Renders an animated dot grid over the camera feed that reflects the
 * current detection phase: scanning (pulsing ripple), detected (stable grid),
 * and ready (green glow). Includes a status pill with a human-readable
 * message and detected plane count.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import type { DetectionPhase } from '@/services/surfaceDetection';

interface Props {
  /** Current detection phase */
  phase: DetectionPhase;
  /** Number of detected planes */
  planeCount: number;
  /** Status message to display */
  statusMessage: string;
  /** Whether lighting is sufficient */
  isLightingSufficient: boolean;
  testID?: string;
}

const DOT_ROWS = 5;
const DOT_COLS = 7;
const DOT_SIZE = 4;
const DOT_SPACING = 18;

/**
 * Visual indicator for AR surface detection state.
 *
 * Shows an animated grid of dots over the camera feed:
 * - Scanning: dots pulse and sweep to guide user
 * - Detected: dots settle into a stable grid on the detected plane
 * - Ready: grid glows green, user can place furniture
 *
 * Also shows a status pill with current detection message.
 */
export function SurfaceIndicator({
  phase,
  planeCount,
  statusMessage,
  isLightingSufficient,
  testID,
}: Props) {
  const scanPulse = useSharedValue(0);
  const gridOpacity = useSharedValue(0);
  const readyScale = useSharedValue(1);

  // Scanning pulse animation
  useEffect(() => {
    if (phase === 'scanning' || phase === 'initializing') {
      scanPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      gridOpacity.value = withTiming(0.3, { duration: 300 });
    } else if (phase === 'detected') {
      scanPulse.value = withTiming(0.5, { duration: 300 });
      gridOpacity.value = withTiming(0.6, { duration: 500 });
    } else if (phase === 'ready') {
      scanPulse.value = withTiming(1, { duration: 300 });
      gridOpacity.value = withTiming(0.8, { duration: 500 });
      readyScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }
  }, [phase, scanPulse, gridOpacity, readyScale]);

  const gridStyle = useAnimatedStyle(() => ({
    opacity: gridOpacity.value,
    transform: [{ scale: readyScale.value }, { perspective: 600 }, { rotateX: '55deg' }],
  }));

  const dotColor =
    phase === 'ready'
      ? '#4ADE80' // Green for ready
      : phase === 'detected'
        ? '#5B8FA8' // Mountain blue for detected
        : '#FFFFFF'; // White for scanning

  const statusPillColor =
    phase === 'ready'
      ? 'rgba(74, 222, 128, 0.2)'
      : !isLightingSufficient
        ? 'rgba(251, 191, 36, 0.2)'
        : 'rgba(0, 0, 0, 0.6)';

  const statusTextColor =
    phase === 'ready' ? '#4ADE80' : !isLightingSufficient ? '#FBBF24' : '#FFFFFF';

  return (
    <View style={styles.container} testID={testID ?? 'surface-indicator'} pointerEvents="none">
      {/* Plane grid visualization */}
      <Animated.View style={[styles.gridContainer, gridStyle]} testID="surface-grid">
        {Array.from({ length: DOT_ROWS }, (_, row) => (
          <View key={row} style={styles.dotRow}>
            {Array.from({ length: DOT_COLS }, (_, col) => (
              <DotCell
                key={col}
                row={row}
                col={col}
                color={dotColor}
                phase={phase}
                scanPulse={scanPulse}
              />
            ))}
          </View>
        ))}
      </Animated.View>

      {/* Status pill */}
      <View style={styles.statusContainer}>
        <View
          style={[styles.statusPill, { backgroundColor: statusPillColor }]}
          testID="surface-status"
        >
          {(phase === 'scanning' || phase === 'initializing') && <ScanningDot />}
          {phase === 'ready' && <Text style={styles.readyIcon}>+</Text>}
          <Text
            style={[styles.statusText, { color: statusTextColor }]}
            testID="surface-status-text"
          >
            {statusMessage}
          </Text>
        </View>
        {planeCount > 0 && phase !== 'initializing' && (
          <Text style={styles.planeCountText} testID="surface-plane-count">
            {planeCount} surface{planeCount !== 1 ? 's' : ''} detected
          </Text>
        )}
      </View>
    </View>
  );
}

/** Individual dot in the plane grid, animates based on scan phase */
function DotCell({
  row,
  col,
  color,
  phase,
  scanPulse,
}: {
  row: number;
  col: number;
  color: string;
  phase: DetectionPhase;
  scanPulse: Animated.SharedValue<number>;
}) {
  // Stagger the animation based on distance from center
  const centerRow = (DOT_ROWS - 1) / 2;
  const centerCol = (DOT_COLS - 1) / 2;
  const distFromCenter = Math.sqrt(Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2));
  const maxDist = Math.sqrt(Math.pow(centerRow, 2) + Math.pow(centerCol, 2));
  const normalizedDist = distFromCenter / maxDist;

  const dotStyle = useAnimatedStyle(() => {
    if (phase === 'scanning' || phase === 'initializing') {
      // Ripple from center outward
      const wave = interpolate(
        scanPulse.value,
        [0, 1],
        [0 + normalizedDist * 0.3, 1 - normalizedDist * 0.3],
      );
      return {
        opacity: Math.max(0.1, Math.min(1, wave)),
        transform: [{ scale: 0.5 + wave * 0.5 }],
      };
    }
    if (phase === 'detected') {
      return {
        opacity: 0.6 + scanPulse.value * 0.2,
        transform: [{ scale: 0.8 }],
      };
    }
    // ready
    return {
      opacity: 0.8,
      transform: [{ scale: 1 }],
    };
  });

  return <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />;
}

/** Animated scanning indicator dot in the status pill */
function ScanningDot() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 600 }), withTiming(0, { duration: 600 })),
      -1,
      false,
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.4 + pulse.value * 0.6,
    transform: [{ scale: 0.8 + pulse.value * 0.2 }],
  }));

  return <Animated.View style={[styles.scanningDot, style]} />;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridContainer: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
    alignItems: 'center',
    gap: DOT_SPACING - DOT_SIZE,
  },
  dotRow: {
    flexDirection: 'row',
    gap: DOT_SPACING - DOT_SIZE,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  statusContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  readyIcon: {
    color: '#4ADE80',
    fontSize: 16,
    fontWeight: '700',
  },
  scanningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  planeCountText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
});
