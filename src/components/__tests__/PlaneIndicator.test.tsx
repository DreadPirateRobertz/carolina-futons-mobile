import React from 'react';
import { render } from '@testing-library/react-native';
import { PlaneIndicator } from '@/components/PlaneIndicator';
import type { DetectedPlane } from '@/services/surfaceDetection';
import type { ShadowParams } from '@/services/lightingEstimation';

// Mock reanimated — must match the import structure exactly
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
    },
    useSharedValue: (init: number) => ({ value: init }),
    useAnimatedStyle: () => ({}),
    withTiming: (val: number) => val,
    withRepeat: (val: number) => val,
    withSequence: (...vals: number[]) => vals[0],
    Easing: {
      inOut: () => ({}),
      ease: {},
    },
  };
});

const defaultShadow: ShadowParams = {
  opacity: 0.25,
  blur: 8,
  offsetX: -2.4,
  offsetY: 6.4,
  color: 'rgba(0, 0, 10, 0.25)',
};

const floorPlane: DetectedPlane = {
  id: 'plane-1',
  type: 'floor',
  alignment: 'horizontal',
  center: { x: 0.5, y: 0.65, z: 1.5 },
  extent: { width: 2.5, height: 1.8 },
  rotation: 0,
  confidence: 0.85,
  lastUpdated: Date.now(),
};

const wallPlane: DetectedPlane = {
  id: 'plane-2',
  type: 'wall',
  alignment: 'vertical',
  center: { x: 0.5, y: 0.35, z: 2.0 },
  extent: { width: 2.0, height: 2.4 },
  rotation: 0,
  confidence: 0.75,
  lastUpdated: Date.now(),
};

describe('PlaneIndicator', () => {
  it('renders scanning animation when scanning', () => {
    const { getByTestId } = render(
      <PlaneIndicator
        planes={[]}
        detectionState="scanning"
        shadowParams={defaultShadow}
        hasPlacement={false}
        testID="plane-indicator"
      />,
    );

    expect(getByTestId('plane-scanning')).toBeTruthy();
  });

  it('shows scan hint text during scanning', () => {
    const { getByText } = render(
      <PlaneIndicator
        planes={[]}
        detectionState="scanning"
        shadowParams={defaultShadow}
        hasPlacement={false}
      />,
    );

    expect(getByText('Move your device slowly to scan the room')).toBeTruthy();
  });

  it('renders floor plane overlay when detected', () => {
    const { getByTestId } = render(
      <PlaneIndicator
        planes={[floorPlane]}
        detectionState="detected"
        shadowParams={defaultShadow}
        hasPlacement={false}
      />,
    );

    expect(getByTestId('floor-plane-plane-1')).toBeTruthy();
  });

  it('renders wall plane overlay', () => {
    const { getByTestId } = render(
      <PlaneIndicator
        planes={[floorPlane, wallPlane]}
        detectionState="tracking"
        shadowParams={defaultShadow}
        hasPlacement={false}
      />,
    );

    expect(getByTestId('floor-plane-plane-1')).toBeTruthy();
    expect(getByTestId('wall-plane-plane-2')).toBeTruthy();
  });

  it('shows placement reticle when tracking without placement', () => {
    const { getByTestId } = render(
      <PlaneIndicator
        planes={[floorPlane]}
        detectionState="tracking"
        shadowParams={defaultShadow}
        hasPlacement={false}
      />,
    );

    expect(getByTestId('placement-reticle')).toBeTruthy();
  });

  it('hides placement reticle after furniture placed', () => {
    const { queryByTestId } = render(
      <PlaneIndicator
        planes={[floorPlane]}
        detectionState="tracking"
        shadowParams={defaultShadow}
        hasPlacement={true}
      />,
    );

    expect(queryByTestId('placement-reticle')).toBeNull();
  });

  it('shows detection status badge', () => {
    const { getByTestId, getByText } = render(
      <PlaneIndicator
        planes={[floorPlane]}
        detectionState="detected"
        shadowParams={defaultShadow}
        hasPlacement={false}
      />,
    );

    expect(getByTestId('detection-status')).toBeTruthy();
    expect(getByText('Floor detected')).toBeTruthy();
  });

  it('shows tracking status with plane count', () => {
    const { getByText } = render(
      <PlaneIndicator
        planes={[floorPlane, wallPlane]}
        detectionState="tracking"
        shadowParams={defaultShadow}
        hasPlacement={false}
      />,
    );

    expect(getByText('Tracking 2 surfaces')).toBeTruthy();
  });

  it('shows singular "surface" for single plane', () => {
    const { getByText } = render(
      <PlaneIndicator
        planes={[floorPlane]}
        detectionState="tracking"
        shadowParams={defaultShadow}
        hasPlacement={false}
      />,
    );

    expect(getByText('Tracking 1 surface')).toBeTruthy();
  });

  it('shows initializing status', () => {
    const { getByText } = render(
      <PlaneIndicator
        planes={[]}
        detectionState="initializing"
        shadowParams={defaultShadow}
        hasPlacement={false}
      />,
    );

    expect(getByText('Initializing...')).toBeTruthy();
  });

  it('does not show scanning overlay when not scanning', () => {
    const { queryByTestId } = render(
      <PlaneIndicator
        planes={[floorPlane]}
        detectionState="tracking"
        shadowParams={defaultShadow}
        hasPlacement={false}
      />,
    );

    expect(queryByTestId('plane-scanning')).toBeNull();
  });

  it('renders with testID', () => {
    const { getByTestId } = render(
      <PlaneIndicator
        planes={[]}
        detectionState="scanning"
        shadowParams={defaultShadow}
        hasPlacement={false}
        testID="my-indicator"
      />,
    );

    expect(getByTestId('my-indicator')).toBeTruthy();
  });
});
