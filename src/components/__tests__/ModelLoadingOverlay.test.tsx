import React from 'react';
import { render } from '@testing-library/react-native';
import { ModelLoadingOverlay } from '../ModelLoadingOverlay';
import type { ModelLoadStatus } from '@/services/modelLoader';

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: any) => c },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => fn(),
    useEffect: require('react').useEffect,
    withTiming: (val: any) => val,
    withRepeat: (val: any) => val,
    withDelay: (_d: any, val: any) => val,
    withSequence: (...vals: any[]) => vals[0],
    interpolate: (val: any) => val,
    Easing: { out: () => 0, in: () => 0, ease: 0, inOut: () => 0 },
  };
});

describe('ModelLoadingOverlay', () => {
  it('renders with checking-cache status', () => {
    const status: ModelLoadStatus = { state: 'checking-cache' };
    const { getByText, getByTestId } = render(<ModelLoadingOverlay status={status} />);
    expect(getByTestId('model-loading-overlay')).toBeTruthy();
    expect(getByText('Checking local cache...')).toBeTruthy();
  });

  it('renders progress bar during download', () => {
    const status: ModelLoadStatus = { state: 'downloading', progress: 0.45 };
    const { getByText, getByTestId } = render(<ModelLoadingOverlay status={status} />);
    expect(getByTestId('model-progress-bar')).toBeTruthy();
    expect(getByText('Downloading 3D model... 45%')).toBeTruthy();
  });

  it('renders error state', () => {
    const status: ModelLoadStatus = { state: 'error', message: 'Network error' };
    const { getByText } = render(<ModelLoadingOverlay status={status} />);
    expect(getByText('Network error')).toBeTruthy();
  });

  it('renders idle/ready with default text', () => {
    const status: ModelLoadStatus = { state: 'idle' };
    const { getByText } = render(<ModelLoadingOverlay status={status} />);
    expect(getByText('Preparing AR model...')).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const status: ModelLoadStatus = { state: 'checking-cache' };
    const { getByTestId } = render(<ModelLoadingOverlay status={status} testID="custom" />);
    expect(getByTestId('custom')).toBeTruthy();
  });
});
