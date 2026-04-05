/**
 * Tests for CropHandleOverlay component — hq-ghe.
 *
 * Covers:
 *  - Renders overlay and crop border
 *  - Renders all four corner handles
 *  - Aspect ratio lock toggle button rendered with correct label
 *  - Pressing lock toggle calls onToggleAspectLock
 *  - Reset button calls onReset
 *  - Accessibility labels on handles and buttons
 *
 * hq-ghe: visual search UX — draggable crop handles, aspect ratio lock.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CropHandleOverlay } from '../CropHandleOverlay';
import type { CropHandle } from '@/hooks/useCropUI';


const DEFAULT_CROP = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };

function renderOverlay(overrides: Partial<React.ComponentProps<typeof CropHandleOverlay>> = {}) {
  const onHandleMove = jest.fn();
  const onToggleAspectLock = jest.fn();
  const onReset = jest.fn();

  const result = render(
    <CropHandleOverlay
      cropRect={DEFAULT_CROP}
      aspectRatioLocked={false}
      onHandleMove={onHandleMove}
      onToggleAspectLock={onToggleAspectLock}
      onReset={onReset}
      {...overrides}
    />,
  );
  return { ...result, onHandleMove, onToggleAspectLock, onReset };
}

describe('CropHandleOverlay', () => {
  it('renders the overlay container', () => {
    const { getByTestId } = renderOverlay();
    expect(getByTestId('crop-handle-overlay')).toBeTruthy();
  });

  it('renders the crop border', () => {
    const { getByTestId } = renderOverlay();
    expect(getByTestId('crop-border')).toBeTruthy();
  });

  it('renders all four corner handles', () => {
    const { getByTestId } = renderOverlay();
    const handles: CropHandle[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    handles.forEach((handle) => {
      expect(getByTestId(`crop-handle-${handle}`)).toBeTruthy();
    });
  });

  it('renders the aspect ratio lock button', () => {
    const { getByTestId } = renderOverlay();
    expect(getByTestId('crop-aspect-lock')).toBeTruthy();
  });

  it('renders the reset button', () => {
    const { getByTestId } = renderOverlay();
    expect(getByTestId('crop-reset')).toBeTruthy();
  });

  it('lock button has "Lock aspect ratio" label when unlocked', () => {
    const { getByTestId } = renderOverlay({ aspectRatioLocked: false });
    expect(getByTestId('crop-aspect-lock').props.accessibilityLabel).toBe('Lock aspect ratio');
  });

  it('lock button has "Unlock aspect ratio" label when locked', () => {
    const { getByTestId } = renderOverlay({ aspectRatioLocked: true });
    expect(getByTestId('crop-aspect-lock').props.accessibilityLabel).toBe('Unlock aspect ratio');
  });

  it('pressing lock toggle calls onToggleAspectLock', () => {
    const { getByTestId, onToggleAspectLock } = renderOverlay();
    fireEvent.press(getByTestId('crop-aspect-lock'));
    expect(onToggleAspectLock).toHaveBeenCalledTimes(1);
  });

  it('pressing reset calls onReset', () => {
    const { getByTestId, onReset } = renderOverlay();
    fireEvent.press(getByTestId('crop-reset'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('each handle has an accessibility label', () => {
    const { getByTestId } = renderOverlay();
    const handles: CropHandle[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    handles.forEach((handle) => {
      const el = getByTestId(`crop-handle-${handle}`);
      expect(el.props.accessibilityLabel).toContain(handle);
    });
  });

  it('each handle has adjustable accessibility role', () => {
    const { getByTestId } = renderOverlay();
    const handles: CropHandle[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    handles.forEach((handle) => {
      const el = getByTestId(`crop-handle-${handle}`);
      expect(el.props.accessibilityRole).toBe('adjustable');
    });
  });
});
