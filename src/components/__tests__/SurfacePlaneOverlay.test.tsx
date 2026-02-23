/**
 * SurfacePlaneOverlay component tests.
 * cm-beo: AR Camera room detection and surface plane mapping
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { SurfacePlaneOverlay } from '../SurfacePlaneOverlay';
import * as SurfaceDetection from '@/services/surfaceDetection';
import * as LightingEstimation from '@/services/lightingEstimation';

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  // Override layout animations to render immediately
  const View = require('react-native').View;
  Reanimated.default.View = View;
  return {
    ...Reanimated,
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
  };
});

describe('SurfacePlaneOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    SurfaceDetection._resetAll();
    LightingEstimation._reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders in idle state with start scan button', () => {
    const { getByTestId } = render(<SurfacePlaneOverlay />);
    expect(getByTestId('surface-plane-overlay')).toBeTruthy();
    expect(getByTestId('start-scan-button')).toBeTruthy();
  });

  it('starts scanning when start button is pressed', () => {
    const { getByTestId } = render(<SurfacePlaneOverlay />);

    act(() => {
      fireEvent.press(getByTestId('start-scan-button'));
    });

    // Should show scanning UI
    const state = SurfaceDetection.getState();
    expect(state.phase).toBe('scanning');
  });

  it('shows scan progress bar during scanning', () => {
    const { getByTestId } = render(<SurfacePlaneOverlay />);

    act(() => {
      fireEvent.press(getByTestId('start-scan-button'));
    });

    expect(getByTestId('scan-progress-bar')).toBeTruthy();
  });

  it('shows scanning sweep animation during scan', () => {
    const { getByTestId } = render(<SurfacePlaneOverlay />);

    act(() => {
      fireEvent.press(getByTestId('start-scan-button'));
    });

    expect(getByTestId('scanning-sweep')).toBeTruthy();
  });

  it('shows placement target when surface is ready', () => {
    const { getByTestId } = render(<SurfacePlaneOverlay />);

    act(() => {
      fireEvent.press(getByTestId('start-scan-button'));
      jest.advanceTimersByTime(4000);
    });

    expect(getByTestId('placement-tap-target')).toBeTruthy();
  });

  it('calls onPlacementReady when placement target is tapped', () => {
    const onPlacementReady = jest.fn();
    const { getByTestId } = render(
      <SurfacePlaneOverlay onPlacementReady={onPlacementReady} />,
    );

    act(() => {
      fireEvent.press(getByTestId('start-scan-button'));
      jest.advanceTimersByTime(4000);
    });

    act(() => {
      fireEvent.press(getByTestId('placement-tap-target'));
    });

    expect(onPlacementReady).toHaveBeenCalledTimes(1);
    expect(onPlacementReady).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'horizontal',
        confidence: expect.any(Number),
      }),
    );
  });

  it('renders with custom testID', () => {
    const { getByTestId } = render(
      <SurfacePlaneOverlay testID="custom-overlay" />,
    );
    expect(getByTestId('custom-overlay')).toBeTruthy();
  });

  it('cleans up subscriptions on unmount', () => {
    const { unmount } = render(<SurfacePlaneOverlay />);
    // Should not throw on unmount
    expect(() => unmount()).not.toThrow();
  });
});
