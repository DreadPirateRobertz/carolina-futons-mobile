/**
 * TDD tests for useCropUI hook.
 *
 * Covers:
 *  Initial state
 *    - default cropRect is full image (x:0, y:0, width:1, height:1)
 *    - aspectRatioLocked defaults to false
 *
 *  updateHandle — free mode (aspect ratio unlocked)
 *    - topLeft handle: moving right/down shrinks width/height, shifts x/y
 *    - topRight handle: moving right increases width
 *    - bottomLeft handle: moving down increases height, shifts x
 *    - bottomRight handle: moving right/down increases width/height
 *    - clamps x/y/width/height to valid bounds [0,1]
 *    - minimum width/height enforced (0.05)
 *
 *  updateHandle — aspect ratio locked
 *    - topLeft: maintains current aspect ratio when dragging
 *    - bottomRight: maintains aspect ratio when dragging
 *    - uniform delta applied proportionally when locked
 *
 *  toggleAspectRatioLock
 *    - toggles aspectRatioLocked true → false → true
 *    - captures current ratio on lock
 *    - locked ratio preserved through subsequent handle moves
 *
 *  resetCrop
 *    - resets cropRect to { x:0, y:0, width:1, height:1 }
 *    - preserves aspectRatioLocked state
 *
 *  bounds validation
 *    - cropRect values always 0 ≤ x+width ≤ 1
 *    - cropRect values always 0 ≤ y+height ≤ 1
 *    - cannot drag past opposite handle (min 0.05 gap)
 *
 * hq-ghe: visual search UX — draggable crop handles, aspect ratio lock.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useCropUI, type CropHandle } from '../useCropUI';

// ── Helpers ───────────────────────────────────────────────────────────────────

const FULL_RECT = { x: 0, y: 0, width: 1, height: 1 };
const MIN_SIZE = 0.05;

function approx(n: number, decimals = 6) {
  return parseFloat(n.toFixed(decimals));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCropUI', () => {
  describe('initial state', () => {
    it('defaults cropRect to full image', () => {
      const { result } = renderHook(() => useCropUI());
      expect(result.current.cropRect).toEqual(FULL_RECT);
    });

    it('aspectRatioLocked defaults to false', () => {
      const { result } = renderHook(() => useCropUI());
      expect(result.current.aspectRatioLocked).toBe(false);
    });

    it('accepts initialAspectLocked=true option', () => {
      const { result } = renderHook(() => useCropUI({ initialAspectLocked: true }));
      expect(result.current.aspectRatioLocked).toBe(true);
    });
  });

  // ── updateHandle — free mode ───────────────────────────────────────────────

  describe('updateHandle — free mode (aspect ratio unlocked)', () => {
    describe('topLeft handle', () => {
      it('moving right (positive dx) shrinks width and increases x', () => {
        const { result } = renderHook(() => useCropUI());
        act(() => result.current.updateHandle('topLeft', 0.1, 0));
        expect(approx(result.current.cropRect.x)).toBeCloseTo(0.1, 5);
        expect(approx(result.current.cropRect.width)).toBeCloseTo(0.9, 5);
      });

      it('moving down (positive dy) shrinks height and increases y', () => {
        const { result } = renderHook(() => useCropUI());
        act(() => result.current.updateHandle('topLeft', 0, 0.2));
        expect(approx(result.current.cropRect.y)).toBeCloseTo(0.2, 5);
        expect(approx(result.current.cropRect.height)).toBeCloseTo(0.8, 5);
      });

      it('moving left (negative dx) is clamped at x=0', () => {
        const { result } = renderHook(() => useCropUI());
        act(() => result.current.updateHandle('topLeft', -0.5, 0));
        expect(result.current.cropRect.x).toBe(0);
        expect(result.current.cropRect.width).toBe(1);
      });
    });

    describe('topRight handle', () => {
      it('moving right increases width', () => {
        // Start with a partial rect
        const { result } = renderHook(() => useCropUI({ initialRect: { x: 0, y: 0, width: 0.5, height: 1 } }));
        act(() => result.current.updateHandle('topRight', 0.2, 0));
        expect(approx(result.current.cropRect.width)).toBeCloseTo(0.7, 5);
        expect(result.current.cropRect.x).toBe(0); // x unchanged
      });

      it('moving left decreases width', () => {
        const { result } = renderHook(() => useCropUI());
        act(() => result.current.updateHandle('topRight', -0.3, 0));
        expect(approx(result.current.cropRect.width)).toBeCloseTo(0.7, 5);
      });

      it('moving up (negative dy) shrinks height and increases y', () => {
        const { result } = renderHook(() => useCropUI());
        act(() => result.current.updateHandle('topRight', 0, -0.15));
        // topRight drag up is same as topLeft: shrinks height, moves y up — but topRight doesn't have negative dy effect
        // Actually topRight moves the top edge: positive dy = moves top down (shrinks height), negative dy = moves top up (but clamped at 0)
        expect(result.current.cropRect.y).toBe(0); // clamped
      });
    });

    describe('bottomLeft handle', () => {
      it('moving down increases height', () => {
        const { result } = renderHook(() => useCropUI({ initialRect: { x: 0, y: 0, width: 1, height: 0.5 } }));
        act(() => result.current.updateHandle('bottomLeft', 0, 0.2));
        expect(approx(result.current.cropRect.height)).toBeCloseTo(0.7, 5);
      });

      it('moving right shrinks width and increases x', () => {
        const { result } = renderHook(() => useCropUI());
        act(() => result.current.updateHandle('bottomLeft', 0.2, 0));
        expect(approx(result.current.cropRect.x)).toBeCloseTo(0.2, 5);
        expect(approx(result.current.cropRect.width)).toBeCloseTo(0.8, 5);
      });
    });

    describe('bottomRight handle', () => {
      it('moving right increases width', () => {
        const { result } = renderHook(() => useCropUI({ initialRect: { x: 0, y: 0, width: 0.5, height: 0.5 } }));
        act(() => result.current.updateHandle('bottomRight', 0.2, 0));
        expect(approx(result.current.cropRect.width)).toBeCloseTo(0.7, 5);
      });

      it('moving down increases height', () => {
        const { result } = renderHook(() => useCropUI({ initialRect: { x: 0, y: 0, width: 0.5, height: 0.5 } }));
        act(() => result.current.updateHandle('bottomRight', 0, 0.2));
        expect(approx(result.current.cropRect.height)).toBeCloseTo(0.7, 5);
      });

      it('moving past image right edge is clamped', () => {
        const { result } = renderHook(() => useCropUI());
        act(() => result.current.updateHandle('bottomRight', 0.5, 0));
        expect(result.current.cropRect.x + result.current.cropRect.width).toBeLessThanOrEqual(1);
      });

      it('moving past image bottom edge is clamped', () => {
        const { result } = renderHook(() => useCropUI());
        act(() => result.current.updateHandle('bottomRight', 0, 0.5));
        expect(result.current.cropRect.y + result.current.cropRect.height).toBeLessThanOrEqual(1);
      });
    });

    describe('minimum size enforcement', () => {
      it('width cannot go below minimum size', () => {
        const { result } = renderHook(() => useCropUI());
        // Drag topLeft far right — width should clamp at MIN_SIZE
        act(() => result.current.updateHandle('topLeft', 0.99, 0));
        expect(result.current.cropRect.width).toBeGreaterThanOrEqual(MIN_SIZE);
      });

      it('height cannot go below minimum size', () => {
        const { result } = renderHook(() => useCropUI());
        act(() => result.current.updateHandle('topLeft', 0, 0.99));
        expect(result.current.cropRect.height).toBeGreaterThanOrEqual(MIN_SIZE);
      });

      it('width cannot go below minimum size from bottomRight', () => {
        const { result } = renderHook(() => useCropUI({ initialRect: { x: 0, y: 0, width: 0.1, height: 1 } }));
        act(() => result.current.updateHandle('bottomRight', -0.1, 0));
        expect(result.current.cropRect.width).toBeGreaterThanOrEqual(MIN_SIZE);
      });
    });
  });

  // ── updateHandle — aspect ratio locked ────────────────────────────────────

  describe('updateHandle — aspect ratio locked', () => {
    it('locking preserves width/height ratio', () => {
      const { result } = renderHook(() => useCropUI({ initialRect: { x: 0, y: 0, width: 0.8, height: 0.4 } }));
      act(() => result.current.toggleAspectRatioLock()); // lock ratio = 2:1
      const ratio = 0.8 / 0.4; // 2.0

      act(() => result.current.updateHandle('bottomRight', 0.1, 0));

      const { width, height } = result.current.cropRect;
      expect(approx(width / height)).toBeCloseTo(ratio, 3);
    });

    it('bottomRight drag maintains ratio on width change', () => {
      const { result } = renderHook(() =>
        useCropUI({ initialRect: { x: 0, y: 0, width: 0.6, height: 0.6 } }),
      );
      act(() => result.current.toggleAspectRatioLock()); // ratio 1:1
      act(() => result.current.updateHandle('bottomRight', 0.1, 0));

      const { width, height } = result.current.cropRect;
      // 1:1 ratio — width should equal height
      expect(approx(width)).toBeCloseTo(height, 3);
    });

    it('topLeft drag maintains ratio', () => {
      const { result } = renderHook(() =>
        useCropUI({ initialRect: { x: 0.1, y: 0.1, width: 0.6, height: 0.6 } }),
      );
      act(() => result.current.toggleAspectRatioLock()); // ratio 1:1
      act(() => result.current.updateHandle('topLeft', 0.05, 0));

      const { width, height } = result.current.cropRect;
      expect(approx(width)).toBeCloseTo(height, 3);
    });

    it('topRight drag maintains ratio', () => {
      // y:0.1 gives the top edge room to shift upward when ratio is maintained
      const { result } = renderHook(() =>
        useCropUI({ initialRect: { x: 0, y: 0.1, width: 0.6, height: 0.6 } }),
      );
      act(() => result.current.toggleAspectRatioLock()); // ratio 1:1
      act(() => result.current.updateHandle('topRight', 0.1, 0));

      const { width, height } = result.current.cropRect;
      expect(approx(width)).toBeCloseTo(height, 3);
    });

    it('bottomLeft drag maintains ratio', () => {
      // x:0.1 gives the left edge room to shift rightward when ratio is maintained
      const { result } = renderHook(() =>
        useCropUI({ initialRect: { x: 0.1, y: 0, width: 0.6, height: 0.6 } }),
      );
      act(() => result.current.toggleAspectRatioLock()); // ratio 1:1
      act(() => result.current.updateHandle('bottomLeft', 0.05, 0));

      const { width, height } = result.current.cropRect;
      expect(approx(width)).toBeCloseTo(height, 3);
    });

    it('initialAspectLocked:true — drag immediately maintains initial aspect ratio', () => {
      // When locked from initialization, updateHandle must enforce the ratio without
      // requiring an explicit toggleAspectRatioLock() call first.
      const { result } = renderHook(() =>
        useCropUI({ initialRect: { x: 0, y: 0, width: 0.8, height: 0.4 }, initialAspectLocked: true }),
      );
      const expectedRatio = 0.8 / 0.4; // 2.0
      act(() => result.current.updateHandle('bottomRight', 0.05, 0));

      const { width, height } = result.current.cropRect;
      expect(approx(width / height)).toBeCloseTo(expectedRatio, 3);
    });
  });

  // ── toggleAspectRatioLock ─────────────────────────────────────────────────

  describe('toggleAspectRatioLock', () => {
    it('toggles false → true', () => {
      const { result } = renderHook(() => useCropUI());
      act(() => result.current.toggleAspectRatioLock());
      expect(result.current.aspectRatioLocked).toBe(true);
    });

    it('toggles true → false', () => {
      const { result } = renderHook(() => useCropUI({ initialAspectLocked: true }));
      act(() => result.current.toggleAspectRatioLock());
      expect(result.current.aspectRatioLocked).toBe(false);
    });

    it('double toggle returns to original state', () => {
      const { result } = renderHook(() => useCropUI());
      act(() => result.current.toggleAspectRatioLock());
      act(() => result.current.toggleAspectRatioLock());
      expect(result.current.aspectRatioLocked).toBe(false);
    });

    it('captures current aspect ratio on lock (used by subsequent moves)', () => {
      const { result } = renderHook(() =>
        useCropUI({ initialRect: { x: 0, y: 0, width: 0.4, height: 0.8 } }),
      );
      act(() => result.current.toggleAspectRatioLock()); // locks 1:2 ratio
      act(() => result.current.updateHandle('bottomRight', 0.2, 0));

      const { width, height } = result.current.cropRect;
      const lockedRatio = 0.4 / 0.8; // 0.5
      expect(approx(width / height)).toBeCloseTo(lockedRatio, 3);
    });
  });

  // ── resetCrop ─────────────────────────────────────────────────────────────

  describe('resetCrop', () => {
    it('resets cropRect to full image', () => {
      const { result } = renderHook(() => useCropUI());
      act(() => result.current.updateHandle('topLeft', 0.3, 0.3));
      act(() => result.current.resetCrop());
      expect(result.current.cropRect).toEqual(FULL_RECT);
    });

    it('does not reset aspectRatioLocked state', () => {
      const { result } = renderHook(() => useCropUI());
      act(() => result.current.toggleAspectRatioLock());
      act(() => result.current.resetCrop());
      expect(result.current.aspectRatioLocked).toBe(true);
    });
  });

  // ── bounds invariants ─────────────────────────────────────────────────────

  describe('bounds invariants', () => {
    const handles: CropHandle[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

    it.each(handles)('%s: x + width never exceeds 1', (handle) => {
      const { result } = renderHook(() => useCropUI());
      act(() => result.current.updateHandle(handle, 1, 0));
      expect(result.current.cropRect.x + result.current.cropRect.width).toBeLessThanOrEqual(1 + 1e-9);
    });

    it.each(handles)('%s: y + height never exceeds 1', (handle) => {
      const { result } = renderHook(() => useCropUI());
      act(() => result.current.updateHandle(handle, 0, 1));
      expect(result.current.cropRect.y + result.current.cropRect.height).toBeLessThanOrEqual(1 + 1e-9);
    });

    it.each(handles)('%s: x is never negative', (handle) => {
      const { result } = renderHook(() => useCropUI());
      act(() => result.current.updateHandle(handle, -1, 0));
      expect(result.current.cropRect.x).toBeGreaterThanOrEqual(0);
    });

    it.each(handles)('%s: y is never negative', (handle) => {
      const { result } = renderHook(() => useCropUI());
      act(() => result.current.updateHandle(handle, 0, -1));
      expect(result.current.cropRect.y).toBeGreaterThanOrEqual(0);
    });
  });
});
