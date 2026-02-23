/**
 * Visual overlay showing detected surface planes in the AR camera view.
 *
 * Renders animated dot grids on detected floor/wall planes, a scanning
 * progress indicator, and phase-appropriate instruction text. Integrates
 * with the surfaceDetection service to show real-time detection status.
 *
 * cm-beo: AR Camera room detection and surface plane mapping
 */

import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
} from 'react-native-reanimated';
import * as SurfaceDetection from '@/services/surfaceDetection';
import type { DetectionState, DetectedPlane } from '@/services/surfaceDetection';
import * as LightingEstimation from '@/services/lightingEstimation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  /** Called when a surface is tapped for furniture placement */
  onPlacementReady?: (plane: DetectedPlane) => void;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Dot grid config
// ---------------------------------------------------------------------------

const DOT_ROWS = 6;
const DOT_COLS = 8;
const DOT_SIZE = 6;
const DOT_SPACING = 28;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated scanning indicator bar */
function ScanProgressBar({ progress }: { progress: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(progress, { duration: 120 });
  }, [progress, width]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={scanStyles.container} testID="scan-progress-bar">
      <View style={scanStyles.track}>
        <Animated.View style={[scanStyles.fill, barStyle]} />
      </View>
      <Text style={scanStyles.label}>{Math.round(progress * 100)}%</Text>
    </View>
  );
}

/** Animated dot grid rendered over a detected plane */
function PlaneGrid({ plane }: { plane: DetectedPlane }) {
  const opacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(plane.confidence, { duration: 400 });
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [plane.confidence, opacity, pulseScale]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opacity.value, [0, 1], [0, 0.6]),
    transform: [{ scale: pulseScale.value }],
  }));

  // Position grid based on plane center (screen-relative 0–1)
  const gridWidth = DOT_COLS * DOT_SPACING;
  const gridHeight = DOT_ROWS * DOT_SPACING;
  const left = plane.center.x * SCREEN_WIDTH - gridWidth / 2;
  const top = plane.center.y * SCREEN_HEIGHT - gridHeight / 2;

  const isFloor = plane.type === 'horizontal';
  const dotColor = isFloor ? '#4ADE80' : '#60A5FA'; // Green for floor, blue for walls

  return (
    <Animated.View
      style={[gridStyles.container, { left, top }, containerStyle]}
      testID={`plane-grid-${plane.id}`}
    >
      {Array.from({ length: DOT_ROWS }).map((_, row) => (
        <View key={row} style={gridStyles.row}>
          {Array.from({ length: DOT_COLS }).map((_, col) => (
            <View
              key={col}
              style={[
                gridStyles.dot,
                {
                  backgroundColor: dotColor,
                  // Perspective fade: dots further from center are dimmer
                  opacity: 0.3 + 0.7 * (1 - Math.abs(col - DOT_COLS / 2) / DOT_COLS),
                },
              ]}
            />
          ))}
        </View>
      ))}
      {/* Plane type label */}
      <View style={gridStyles.labelContainer}>
        <Text style={gridStyles.labelText}>
          {isFloor ? 'Floor' : 'Wall'} · {Math.round(plane.confidence * 100)}%
        </Text>
      </View>
    </Animated.View>
  );
}

/** Scanning animation — sweeping line effect */
function ScanningEffect() {
  const sweepY = useSharedValue(0);

  useEffect(() => {
    sweepY.value = withRepeat(
      withTiming(SCREEN_HEIGHT, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [sweepY]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sweepY.value }],
  }));

  return (
    <Animated.View style={[sweepStyles.line, lineStyle]} testID="scanning-sweep" />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SurfacePlaneOverlay({ onPlacementReady, testID }: Props) {
  const [detectionState, setDetectionState] = useState<DetectionState>(
    SurfaceDetection.getState(),
  );
  const instructionOpacity = useSharedValue(1);

  useEffect(() => {
    const unsubscribe = SurfaceDetection.subscribe(setDetectionState);
    LightingEstimation.start();

    return () => {
      unsubscribe();
      LightingEstimation.stop();
    };
  }, []);

  // Pulse instruction text on phase change
  useEffect(() => {
    instructionOpacity.value = withSequence(
      withTiming(0.3, { duration: 150 }),
      withSpring(1, { damping: 15 }),
    );
  }, [detectionState.phase, instructionOpacity]);

  const instructionStyle = useAnimatedStyle(() => ({
    opacity: instructionOpacity.value,
  }));

  const handleStartScan = useCallback(() => {
    SurfaceDetection.startScanning();
  }, []);

  const handlePlaceTap = useCallback(() => {
    if (detectionState.primaryPlane && onPlacementReady) {
      onPlacementReady(detectionState.primaryPlane);
    }
  }, [detectionState.primaryPlane, onPlacementReady]);

  const { phase, planes, scanProgress, instruction } = detectionState;
  const lightCondition = LightingEstimation.getCondition();

  return (
    <View style={styles.container} testID={testID ?? 'surface-plane-overlay'} pointerEvents="box-none">
      {/* Scanning sweep animation */}
      {phase === 'scanning' && <ScanningEffect />}

      {/* Scan progress bar */}
      {phase === 'scanning' && <ScanProgressBar progress={scanProgress} />}

      {/* Detected plane grids */}
      {(phase === 'detecting' || phase === 'ready') &&
        planes.map((plane) => <PlaneGrid key={plane.id} plane={plane} />)}

      {/* Tap-to-place target when ready */}
      {phase === 'ready' && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.placementTarget}>
          <TouchableOpacity
            onPress={handlePlaceTap}
            style={styles.placementButton}
            testID="placement-tap-target"
            accessibilityLabel="Tap to place futon on detected surface"
            accessibilityRole="button"
          >
            <View style={styles.placementRing}>
              <View style={styles.placementDot} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Instruction text */}
      <Animated.View style={[styles.instructionContainer, instructionStyle]}>
        {phase === 'idle' ? (
          <TouchableOpacity
            onPress={handleStartScan}
            style={styles.startButton}
            testID="start-scan-button"
            accessibilityLabel="Start scanning your room"
            accessibilityRole="button"
          >
            <Text style={styles.startButtonText}>Scan Room</Text>
          </TouchableOpacity>
        ) : (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.instructionBadge}
          >
            {phase === 'poor_lighting' && <Text style={styles.warningIcon}>!</Text>}
            <Text style={styles.instructionText}>{instruction}</Text>
          </Animated.View>
        )}
      </Animated.View>

      {/* Low light warning badge */}
      {lightCondition === 'low' && phase !== 'poor_lighting' && (
        <Animated.View entering={FadeIn} style={styles.lightWarning} testID="low-light-warning">
          <Text style={styles.lightWarningText}>Low light detected</Text>
        </Animated.View>
      )}
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
  instructionContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  warningIcon: {
    color: '#FCD34D',
    fontSize: 16,
    fontWeight: '800',
  },
  startButton: {
    backgroundColor: '#E8845C',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  placementTarget: {
    position: 'absolute',
    top: '55%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  placementButton: {
    padding: 20,
  },
  placementRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(74, 222, 128, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placementDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
  },
  lightWarning: {
    position: 'absolute',
    top: 150,
    alignSelf: 'center',
    backgroundColor: 'rgba(252, 211, 77, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.4)',
  },
  lightWarningText: {
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '600',
  },
});

const scanStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 55,
    left: 40,
    right: 40,
    alignItems: 'center',
    gap: 6,
  },
  track: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#4ADE80',
    borderRadius: 2,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
});

const gridStyles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  row: {
    flexDirection: 'row',
    gap: DOT_SPACING - DOT_SIZE,
    marginBottom: DOT_SPACING - DOT_SIZE,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  labelContainer: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});

const sweepStyles = StyleSheet.create({
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(74, 222, 128, 0.4)',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
});
