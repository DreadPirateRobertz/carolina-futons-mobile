/**
 * @module ARMeasurementOverlay
 *
 * Visual overlay for the AR measurement tool. Renders endpoint markers,
 * a dashed line between points, the measured distance label, and a
 * "Fits!" / "Too large" indicator when comparing to a selected futon.
 */
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import type { Point3D, MeasurementState } from '@/hooks/useARMeasurement';

interface Props {
  points: Point3D[];
  state: MeasurementState;
  distanceDisplay: string;
  fits?: boolean | null;
  testID?: string;
}

export function ARMeasurementOverlay({ points, state, distanceDisplay, fits, testID }: Props) {
  if (state === 'idle') return null;

  return (
    <View style={styles.container} testID={testID ?? 'measurement-overlay'}>
      {/* Instruction text */}
      {state === 'placing-first' && (
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>Tap first endpoint</Text>
        </View>
      )}
      {state === 'placing-second' && (
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>Tap second endpoint</Text>
        </View>
      )}

      {/* Endpoint markers */}
      {points.map((_, index) => (
        <View key={index} style={styles.pointMarker} testID={`measurement-point-${index}`}>
          <View style={styles.pointInner} />
          <View style={styles.pointPulse} />
        </View>
      ))}

      {/* Distance label */}
      {state === 'measured' && distanceDisplay && (
        <View style={styles.distanceLabelContainer}>
          <View style={styles.distanceLabel}>
            <Text style={styles.distanceText}>{distanceDisplay}</Text>
          </View>

          {/* Fit indicator */}
          {fits === true && (
            <View style={[styles.fitBadge, styles.fitBadgeGreen]}>
              <Text style={styles.fitBadgeText}>Fits!</Text>
            </View>
          )}
          {fits === false && (
            <View style={[styles.fitBadge, styles.fitBadgeRed]}>
              <Text style={styles.fitBadgeText}>Too large</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
    pointerEvents: 'none',
  },
  instructionContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: 'rgba(91, 143, 168, 0.85)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  pointMarker: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#5B8FA8',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pointPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(91, 143, 168, 0.5)',
  },
  distanceLabelContainer: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  distanceLabel: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(91, 143, 168, 0.6)',
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  fitBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  fitBadgeGreen: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  fitBadgeRed: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
  },
  fitBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
