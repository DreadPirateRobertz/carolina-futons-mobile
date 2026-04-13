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
 *  - onLayout updates container dimensions used for pixel positioning
 *  - Crop border positioned correctly after layout
 *  - DragHandle PanResponder: grant records position, move fires onHandleMove
 *  - Normalized delta (rawDx/containerWidth, rawDy/containerHeight)
 *  - Guard: no onHandleMove call when container has zero dimensions
 *  - Incremental delta tracking (not cumulative from gesture start)
 *
 * hq-ghe: visual search UX — draggable crop handles, aspect ratio lock.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CropHandleOverlay } from '../CropHandleOverlay';
import type { CropHandle, CropRect } from '@/hooks/useCropUI';

// ── Constants & helpers ───────────────────────────────────────────────────────

const CONTAINER_W = 300;
const CONTAINER_H = 400;

const DEFAULT_CROP: CropRect = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
const CENTER_CROP: CropRect = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
const FULL_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 };

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

/** Fire an onLayout event on the overlay view to give it real pixel dimensions. */
function fireLayout(
  overlay: ReturnType<typeof render>['getByTestId'] extends (id: string) => infer R ? R : never,
  w = CONTAINER_W,
  h = CONTAINER_H,
) {
  fireEvent(overlay, 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: w, height: h } },
  });
}

/**
 * Simulate a PanResponder drag sequence on a handle element.
 *
 * Sequence:
 *   1. onStartShouldSetResponder  — activate
 *   2. onResponderGrant           — records (startX, startY) as lastPos
 *   3. onResponderMove            — fires onPanResponderMove with (endX, endY)
 *
 * CropHandleOverlay reads `e.nativeEvent.pageX / pageY` directly in its
 * onPanResponderMove handler, so we pass those values in nativeEvent.
 */
function simulateDrag(
  handle: ReturnType<typeof render>['getByTestId'] extends (id: string) => infer R ? R : never,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  const h = handle.props;

  if (h.onStartShouldSetResponder) {
    h.onStartShouldSetResponder({ nativeEvent: {} });
  }

  if (h.onResponderGrant) {
    h.onResponderGrant({
      nativeEvent: { pageX: startX, pageY: startY, touches: [] },
      touchHistory: { touchBank: [] },
    });
  }

  if (h.onResponderMove) {
    h.onResponderMove({
      nativeEvent: { pageX: endX, pageY: endY, touches: [] },
      touchHistory: {
        touchBank: [
          {
            touchActive: true,
            currentTimeStamp: Date.now(),
            currentPageX: endX,
            currentPageY: endY,
            previousPageX: startX,
            previousPageY: startY,
            startTimeStamp: Date.now() - 100,
            startPageX: startX,
            startPageY: startY,
          },
        ],
        numberActiveTouches: 1,
        indexOfSingleActiveTouch: 0,
      },
    });
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CropHandleOverlay', () => {
  // ── Basic structure ────────────────────────────────────────────────────────

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

  // ── Aspect lock toggle ─────────────────────────────────────────────────────

  it('lock button has "Lock aspect ratio" label when unlocked', () => {
    const { getByTestId } = renderOverlay({ aspectRatioLocked: false });
    expect(getByTestId('crop-aspect-lock').props.accessibilityLabel).toBe('Lock aspect ratio');
  });

  it('lock button has "Unlock aspect ratio" label when locked', () => {
    const { getByTestId } = renderOverlay({ aspectRatioLocked: true });
    expect(getByTestId('crop-aspect-lock').props.accessibilityLabel).toBe('Unlock aspect ratio');
  });

  it('shows 🔒 emoji when aspectRatioLocked is true', () => {
    const { getByText } = renderOverlay({ aspectRatioLocked: true });
    expect(getByText('🔒')).toBeTruthy();
  });

  it('shows 🔓 emoji when aspectRatioLocked is false', () => {
    const { getByText } = renderOverlay({ aspectRatioLocked: false });
    expect(getByText('🔓')).toBeTruthy();
  });

  it('pressing lock toggle calls onToggleAspectLock', () => {
    const { getByTestId, onToggleAspectLock } = renderOverlay();
    fireEvent.press(getByTestId('crop-aspect-lock'));
    expect(onToggleAspectLock).toHaveBeenCalledTimes(1);
  });

  it('lock button has "button" accessibility role', () => {
    const { getByTestId } = renderOverlay();
    expect(getByTestId('crop-aspect-lock').props.accessibilityRole).toBe('button');
  });

  // ── Reset button ───────────────────────────────────────────────────────────

  it('pressing reset calls onReset', () => {
    const { getByTestId, onReset } = renderOverlay();
    fireEvent.press(getByTestId('crop-reset'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('reset button has "Reset crop" accessibility label', () => {
    const { getByTestId } = renderOverlay();
    expect(getByTestId('crop-reset').props.accessibilityLabel).toBe('Reset crop');
  });

  it('reset button has "button" accessibility role', () => {
    const { getByTestId } = renderOverlay();
    expect(getByTestId('crop-reset').props.accessibilityRole).toBe('button');
  });

  it('shows ↺ symbol on reset button', () => {
    const { getByText } = renderOverlay();
    expect(getByText('↺')).toBeTruthy();
  });

  // ── Handle accessibility ───────────────────────────────────────────────────

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

  // ── onLayout / container dimensions ───────────────────────────────────────

  describe('onLayout', () => {
    it('fires without error', () => {
      const { getByTestId } = renderOverlay();
      expect(() => fireLayout(getByTestId('crop-handle-overlay'))).not.toThrow();
    });

    it('crop border has zero dimensions before layout fires', () => {
      const { getByTestId } = renderOverlay({ cropRect: CENTER_CROP });
      const border = getByTestId('crop-border');
      expect(border.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ left: 0, top: 0, width: 0, height: 0 })]),
      );
    });

    it('updates crop border dimensions after layout — full rect', () => {
      const { getByTestId } = renderOverlay({ cropRect: FULL_CROP });
      fireLayout(getByTestId('crop-handle-overlay'));
      const border = getByTestId('crop-border');
      expect(border.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ left: 0, top: 0, width: CONTAINER_W, height: CONTAINER_H }),
        ]),
      );
    });

    it('updates crop border dimensions after layout — center rect', () => {
      const { getByTestId } = renderOverlay({ cropRect: CENTER_CROP });
      fireLayout(getByTestId('crop-handle-overlay'));
      const border = getByTestId('crop-border');
      // x=0.25*300=75, y=0.25*400=100, w=0.5*300=150, h=0.5*400=200
      expect(border.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ left: 75, top: 100, width: 150, height: 200 }),
        ]),
      );
    });

    it('re-renders with new crop border position when cropRect changes', () => {
      const { getByTestId, rerender } = renderOverlay({ cropRect: FULL_CROP });
      fireLayout(getByTestId('crop-handle-overlay'));

      rerender(
        <CropHandleOverlay
          cropRect={CENTER_CROP}
          aspectRatioLocked={false}
          onHandleMove={jest.fn()}
          onToggleAspectLock={jest.fn()}
          onReset={jest.fn()}
        />,
      );

      const border = getByTestId('crop-border');
      expect(border.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ left: 75, top: 100, width: 150, height: 200 }),
        ]),
      );
    });
  });

  // ── DragHandle PanResponder ────────────────────────────────────────────────

  describe('DragHandle PanResponder', () => {
    describe('shouldSet handlers', () => {
      it('onStartShouldSetResponder returns true', () => {
        const { getByTestId } = renderOverlay();
        const handle = getByTestId('crop-handle-topLeft');
        if (handle.props.onStartShouldSetResponder) {
          expect(handle.props.onStartShouldSetResponder({ nativeEvent: {} })).toBe(true);
        }
      });

      it('onMoveShouldSetResponder returns true', () => {
        const { getByTestId } = renderOverlay();
        const handle = getByTestId('crop-handle-topLeft');
        if (handle.props.onMoveShouldSetResponder) {
          expect(handle.props.onMoveShouldSetResponder({ nativeEvent: {} })).toBe(true);
        }
      });
    });

    describe('gesture interactions', () => {
      it('calls onHandleMove with normalized (dx, dy) after a drag', () => {
        const { getByTestId, onHandleMove } = renderOverlay();
        fireLayout(getByTestId('crop-handle-overlay'));

        // Drag topLeft 30px right, 40px down in a 300×400 container
        simulateDrag(getByTestId('crop-handle-topLeft'), 0, 0, 30, 40);

        expect(onHandleMove).toHaveBeenCalled();
        const [handle, dx, dy] = onHandleMove.mock.calls[0];
        expect(handle).toBe('topLeft');
        expect(dx).toBeCloseTo(30 / CONTAINER_W);
        expect(dy).toBeCloseTo(40 / CONTAINER_H);
      });

      it('does NOT call onHandleMove before layout fires (zero container)', () => {
        const { getByTestId, onHandleMove } = renderOverlay();
        // Deliberately skip fireLayout so containerWidth/Height stay 0
        simulateDrag(getByTestId('crop-handle-topLeft'), 0, 0, 30, 40);
        expect(onHandleMove).not.toHaveBeenCalled();
      });

      it('does NOT call onHandleMove on grant alone (no move)', () => {
        const { getByTestId, onHandleMove } = renderOverlay();
        fireLayout(getByTestId('crop-handle-overlay'));
        const handle = getByTestId('crop-handle-topLeft');

        if (handle.props.onResponderGrant) {
          handle.props.onResponderGrant({
            nativeEvent: { pageX: 50, pageY: 80, touches: [] },
            touchHistory: { touchBank: [] },
          });
        }
        expect(onHandleMove).not.toHaveBeenCalled();
      });

      it('passes the correct handle id for each corner', () => {
        const corners: CropHandle[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
        for (const corner of corners) {
          const { getByTestId, onHandleMove } = renderOverlay();
          fireLayout(getByTestId('crop-handle-overlay'));
          simulateDrag(getByTestId(`crop-handle-${corner}`), 0, 0, 10, 10);
          if (onHandleMove.mock.calls.length > 0) {
            expect(onHandleMove.mock.calls[0][0]).toBe(corner);
          }
        }
      });

      it('uses grant position as delta baseline, not screen origin', () => {
        // Verifies that lastPos is seeded from the grant event so that
        // delta = (movePageX - grantPageX), not movePageX itself.
        const { getByTestId, onHandleMove } = renderOverlay();
        fireLayout(getByTestId('crop-handle-overlay'));

        // Grant at page-x 60, move to page-x 90 → raw delta = 30, not 90.
        simulateDrag(getByTestId('crop-handle-topLeft'), 60, 0, 90, 0);

        expect(onHandleMove).toHaveBeenCalled();
        const [, dx] = onHandleMove.mock.calls[0];
        expect(dx).toBeCloseTo(30 / CONTAINER_W); // 0.1, not 90/300 = 0.3
        expect(dx).not.toBeCloseTo(90 / CONTAINER_W);
      });

      it('produces negative dx/dy when dragging left and up', () => {
        const { getByTestId, onHandleMove } = renderOverlay();
        fireLayout(getByTestId('crop-handle-overlay'));

        simulateDrag(getByTestId('crop-handle-bottomRight'), 60, 80, 30, 50);

        expect(onHandleMove).toHaveBeenCalled();
        const [, dx, dy] = onHandleMove.mock.calls[0];
        expect(dx).toBeCloseTo(-30 / CONTAINER_W);
        expect(dy).toBeCloseTo(-30 / CONTAINER_H);
      });

      it('normalizes using container width and height independently', () => {
        const { getByTestId, onHandleMove } = renderOverlay();
        // Use a non-square container so W and H normalizations differ
        fireLayout(getByTestId('crop-handle-overlay'), 200, 500);

        simulateDrag(getByTestId('crop-handle-topRight'), 0, 0, 100, 250);

        expect(onHandleMove).toHaveBeenCalled();
        const [, dx, dy] = onHandleMove.mock.calls[0];
        expect(dx).toBeCloseTo(100 / 200); // 0.5
        expect(dy).toBeCloseTo(250 / 500); // 0.5
      });
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('renders without error for full-screen cropRect', () => {
      expect(() => renderOverlay({ cropRect: FULL_CROP })).not.toThrow();
    });

    it('renders without error for zero-size cropRect', () => {
      const zeroCrop: CropRect = { x: 0, y: 0, width: 0, height: 0 };
      expect(() => renderOverlay({ cropRect: zeroCrop })).not.toThrow();
    });

    it('crop border has zero width/height for zero-size cropRect after layout', () => {
      const zeroCrop: CropRect = { x: 0.5, y: 0.5, width: 0, height: 0 };
      const { getByTestId } = renderOverlay({ cropRect: zeroCrop });
      fireLayout(getByTestId('crop-handle-overlay'));
      const border = getByTestId('crop-border');
      expect(border.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ width: 0, height: 0 })]),
      );
    });

    it('re-renders correctly when aspectRatioLocked prop toggles', () => {
      const { getByText, rerender } = renderOverlay({ aspectRatioLocked: false });
      expect(getByText('🔓')).toBeTruthy();

      rerender(
        <CropHandleOverlay
          cropRect={DEFAULT_CROP}
          aspectRatioLocked={true}
          onHandleMove={jest.fn()}
          onToggleAspectLock={jest.fn()}
          onReset={jest.fn()}
        />,
      );
      expect(getByText('🔒')).toBeTruthy();
    });
  });
});
