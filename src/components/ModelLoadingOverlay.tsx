/**
 * @module ModelLoadingOverlay
 *
 * Branded overlay shown during 3D model download in the AR screen.
 * Displays a progress bar with percentage and status text. Uses the
 * Blue Ridge mountain palette for a warm, on-brand loading experience.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BrandedSpinner } from './BrandedSpinner';
import { colors } from '@/theme/tokens';
import type { ModelLoadStatus } from '@/services/modelLoader';

interface Props {
  status: ModelLoadStatus;
  testID?: string;
}

function statusLabel(status: ModelLoadStatus): string {
  switch (status.state) {
    case 'checking-cache':
      return 'Checking local cache...';
    case 'downloading':
      return `Downloading 3D model... ${Math.round(status.progress * 100)}%`;
    case 'error':
      return status.message;
    default:
      return 'Preparing AR model...';
  }
}

export function ModelLoadingOverlay({ status, testID }: Props) {
  const progress = status.state === 'downloading' ? status.progress : 0;
  const isError = status.state === 'error';

  const barStyle = useAnimatedStyle(() => ({
    width: `${withTiming(progress * 100, { duration: 200, easing: Easing.out(Easing.ease) })}%` as any,
  }));

  return (
    <View style={styles.container} testID={testID ?? 'model-loading-overlay'}>
      <View style={styles.card}>
        {!isError && <BrandedSpinner size="large" color={colors.mountainBlue} />}

        <Text style={[styles.label, isError && styles.errorLabel]}>
          {statusLabel(status)}
        </Text>

        {status.state === 'downloading' && (
          <View style={styles.progressTrack} testID="model-progress-bar">
            <Animated.View style={[styles.progressFill, barStyle]} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    minWidth: 240,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  label: {
    fontSize: 14,
    color: '#3A2518',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorLabel: {
    color: '#C0392B',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E0D5C8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.mountainBlue,
    borderRadius: 3,
  },
});
