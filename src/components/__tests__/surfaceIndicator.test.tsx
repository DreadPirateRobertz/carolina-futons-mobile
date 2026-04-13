import React from 'react';
import { render } from '@testing-library/react-native';
import { SurfaceIndicator } from '../SurfaceIndicator';

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: any) => c },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => fn(),
    withRepeat: (val: any) => val,
    withSequence: (val: any) => val,
    withTiming: (val: any) => val,
    interpolate: (_val: any, _input: any, output: any) => output[0],
    Easing: { inOut: () => ({}), ease: {} },
  };
});

describe('SurfaceIndicator', () => {
  const defaultProps = {
    phase: 'scanning' as const,
    planeCount: 0,
    statusMessage: 'Point your camera at the floor and move slowly',
    isLightingSufficient: true,
  };

  it('renders with default testID', () => {
    const { getByTestId } = render(<SurfaceIndicator {...defaultProps} />);
    expect(getByTestId('surface-indicator')).toBeTruthy();
  });

  it('renders with custom testID', () => {
    const { getByTestId } = render(<SurfaceIndicator {...defaultProps} testID="custom-surface" />);
    expect(getByTestId('custom-surface')).toBeTruthy();
  });

  it('renders surface grid', () => {
    const { getByTestId } = render(<SurfaceIndicator {...defaultProps} />);
    expect(getByTestId('surface-grid')).toBeTruthy();
  });

  it('shows status message', () => {
    const { getByTestId } = render(<SurfaceIndicator {...defaultProps} />);
    expect(getByTestId('surface-status-text')).toBeTruthy();
  });

  it('displays correct status message text', () => {
    const { getByText } = render(<SurfaceIndicator {...defaultProps} />);
    expect(getByText('Point your camera at the floor and move slowly')).toBeTruthy();
  });

  it('does not show plane count when zero', () => {
    const { queryByTestId } = render(<SurfaceIndicator {...defaultProps} planeCount={0} />);
    expect(queryByTestId('surface-plane-count')).toBeNull();
  });

  it('shows plane count when planes detected', () => {
    const { getByTestId, getByText } = render(
      <SurfaceIndicator {...defaultProps} phase="detected" planeCount={2} />,
    );
    expect(getByTestId('surface-plane-count')).toBeTruthy();
    expect(getByText('2 surfaces detected')).toBeTruthy();
  });

  it('shows singular "surface" for single plane', () => {
    const { getByText } = render(
      <SurfaceIndicator {...defaultProps} phase="detected" planeCount={1} />,
    );
    expect(getByText('1 surface detected')).toBeTruthy();
  });

  it('does not show plane count during initializing', () => {
    const { queryByTestId } = render(
      <SurfaceIndicator {...defaultProps} phase="initializing" planeCount={1} />,
    );
    expect(queryByTestId('surface-plane-count')).toBeNull();
  });

  it('renders in ready phase', () => {
    const { getByTestId } = render(
      <SurfaceIndicator
        phase="ready"
        planeCount={3}
        statusMessage="Tap to place your futon"
        isLightingSufficient={true}
      />,
    );
    expect(getByTestId('surface-indicator')).toBeTruthy();
    expect(getByTestId('surface-status')).toBeTruthy();
  });

  it('renders in detected phase', () => {
    const { getByTestId } = render(
      <SurfaceIndicator
        phase="detected"
        planeCount={1}
        statusMessage="Floor detected!"
        isLightingSufficient={true}
      />,
    );
    expect(getByTestId('surface-indicator')).toBeTruthy();
  });

  it('renders with insufficient lighting', () => {
    const { getByTestId } = render(
      <SurfaceIndicator
        {...defaultProps}
        isLightingSufficient={false}
        statusMessage="Move to a brighter area"
      />,
    );
    expect(getByTestId('surface-indicator')).toBeTruthy();
    expect(getByTestId('surface-status')).toBeTruthy();
  });

  it('has pointerEvents none to allow touch-through', () => {
    const { getByTestId } = render(<SurfaceIndicator {...defaultProps} />);
    expect(getByTestId('surface-indicator').props.pointerEvents).toBe('none');
  });
});
