/**
 * @module useCropUI
 *
 * Draggable crop handle state for the visual search image preview — hq-ghe.
 *
 * Manages a normalized CropRect (all values in [0,1] relative to image
 * dimensions) with four draggable corner handles and an optional aspect ratio
 * lock.
 *
 * Handle semantics (dx/dy are normalized deltas):
 *   topLeft     — moves the top-left corner: shifts x/y, shrinks width/height
 *   topRight    — moves the top-right corner: changes width, shifts y
 *   bottomLeft  — moves the bottom-left corner: shifts x, changes height
 *   bottomRight — moves the bottom-right corner: changes width/height
 *
 * Invariants always held:
 *   0 ≤ x, 0 ≤ y, x+width ≤ 1, y+height ≤ 1
 *   width ≥ MIN_SIZE, height ≥ MIN_SIZE
 *
 * Aspect ratio lock: when locked, the perpendicular dimension is adjusted to
 * maintain the ratio captured at lock time.
 */

import { useState, useCallback } from 'react';

export type CropHandle = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UseCropUIOptions {
  initialAspectLocked?: boolean;
  initialRect?: CropRect;
}

export interface UseCropUIResult {
  cropRect: CropRect;
  aspectRatioLocked: boolean;
  updateHandle: (handle: CropHandle, dx: number, dy: number) => void;
  toggleAspectRatioLock: () => void;
  resetCrop: () => void;
}

const FULL_RECT: CropRect = { x: 0, y: 0, width: 1, height: 1 };
const MIN_SIZE = 0.05;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function useCropUI(options: UseCropUIOptions = {}): UseCropUIResult {
  const { initialAspectLocked = false, initialRect = FULL_RECT } = options;

  const [cropRect, setCropRect] = useState<CropRect>(initialRect);
  const [aspectRatioLocked, setAspectRatioLocked] = useState(initialAspectLocked);
  // Ratio locked at the moment the lock was engaged (width / height).
  // Initialized from initialRect when initialAspectLocked is true.
  const [lockedRatio, setLockedRatio] = useState<number | null>(
    initialAspectLocked ? initialRect.width / initialRect.height : null,
  );

  const updateHandle = useCallback(
    (handle: CropHandle, dx: number, dy: number) => {
      setCropRect((prev) => {
        let { x, y, width, height } = prev;

        switch (handle) {
          case 'topLeft': {
            // Moving right/down increases x/y and shrinks width/height
            let newX = x + dx;
            let newY = y + dy;
            let newWidth = width - dx;
            let newHeight = height - dy;

            // Clamp x: cannot go below 0 or past (x+width - MIN_SIZE)
            if (newX < 0) { newWidth += newX; newX = 0; }
            const maxX = x + width - MIN_SIZE;
            if (newX > maxX) { newWidth = MIN_SIZE; newX = maxX; }

            // Clamp y: cannot go below 0 or past (y+height - MIN_SIZE)
            if (newY < 0) { newHeight += newY; newY = 0; }
            const maxY = y + height - MIN_SIZE;
            if (newY > maxY) { newHeight = MIN_SIZE; newY = maxY; }

            // Enforce min size
            if (newWidth < MIN_SIZE) { newWidth = MIN_SIZE; }
            if (newHeight < MIN_SIZE) { newHeight = MIN_SIZE; }

            if (lockedRatio !== null) {
              // Use dx to drive — adjust height to maintain ratio
              newHeight = newWidth / lockedRatio;
              if (newHeight < MIN_SIZE) {
                newHeight = MIN_SIZE;
                newWidth = newHeight * lockedRatio;
              }
              // Recompute y from bottom edge (bottomRight corner stays fixed)
              const bottomEdge = y + height;
              newY = bottomEdge - newHeight;
              if (newY < 0) { newY = 0; newHeight = bottomEdge; newWidth = newHeight * lockedRatio; }
              newX = x + (width - newWidth);
            }

            return { x: newX, y: newY, width: newWidth, height: newHeight };
          }

          case 'topRight': {
            // dx changes width; dy moves top edge (shifts y, shrinks height)
            let newWidth = width + dx;
            let newY = y + dy;
            let newHeight = height - dy;

            // Clamp width
            if (newWidth < MIN_SIZE) newWidth = MIN_SIZE;
            if (x + newWidth > 1) newWidth = 1 - x;

            // Clamp y
            if (newY < 0) { newHeight += newY; newY = 0; }
            const maxY = y + height - MIN_SIZE;
            if (newY > maxY) { newHeight = MIN_SIZE; newY = maxY; }
            if (newHeight < MIN_SIZE) newHeight = MIN_SIZE;

            if (lockedRatio !== null) {
              newHeight = newWidth / lockedRatio;
              if (newHeight < MIN_SIZE) {
                newHeight = MIN_SIZE;
                newWidth = newHeight * lockedRatio;
                if (x + newWidth > 1) newWidth = 1 - x;
              }
              const bottomEdge = y + height;
              newY = bottomEdge - newHeight;
              if (newY < 0) { newY = 0; newHeight = bottomEdge; newWidth = newHeight * lockedRatio; }
            }

            return { x, y: newY, width: newWidth, height: newHeight };
          }

          case 'bottomLeft': {
            // dx moves left edge (shifts x, shrinks width); dy changes height
            let newX = x + dx;
            let newWidth = width - dx;
            let newHeight = height + dy;

            // Clamp x
            if (newX < 0) { newWidth += newX; newX = 0; }
            const maxX = x + width - MIN_SIZE;
            if (newX > maxX) { newWidth = MIN_SIZE; newX = maxX; }
            if (newWidth < MIN_SIZE) newWidth = MIN_SIZE;

            // Clamp height
            if (newHeight < MIN_SIZE) newHeight = MIN_SIZE;
            if (y + newHeight > 1) newHeight = 1 - y;

            if (lockedRatio !== null) {
              newHeight = newWidth / lockedRatio;
              if (newHeight < MIN_SIZE) {
                newHeight = MIN_SIZE;
                newWidth = newHeight * lockedRatio;
              }
              if (y + newHeight > 1) {
                newHeight = 1 - y;
                newWidth = newHeight * lockedRatio;
              }
              newX = x + (width - newWidth);
              if (newX < 0) { newX = 0; newWidth = x + width; }
            }

            return { x: newX, y, width: newWidth, height: newHeight };
          }

          case 'bottomRight': {
            // dx increases width; dy increases height
            let newWidth = width + dx;
            let newHeight = height + dy;

            // Clamp width
            if (newWidth < MIN_SIZE) newWidth = MIN_SIZE;
            if (x + newWidth > 1) newWidth = 1 - x;

            // Clamp height
            if (newHeight < MIN_SIZE) newHeight = MIN_SIZE;
            if (y + newHeight > 1) newHeight = 1 - y;

            if (lockedRatio !== null) {
              // Drive from width change
              newHeight = newWidth / lockedRatio;
              if (newHeight < MIN_SIZE) {
                newHeight = MIN_SIZE;
                newWidth = newHeight * lockedRatio;
              }
              if (x + newWidth > 1) {
                newWidth = 1 - x;
                newHeight = newWidth / lockedRatio;
              }
              if (y + newHeight > 1) {
                newHeight = 1 - y;
                newWidth = newHeight * lockedRatio;
                if (x + newWidth > 1) newWidth = 1 - x;
              }
            }

            return { x, y, width: newWidth, height: newHeight };
          }
        }
      });
    },
    [lockedRatio],
  );

  const toggleAspectRatioLock = useCallback(() => {
    setAspectRatioLocked((prev) => {
      const next = !prev;
      if (next) {
        // Capture current ratio on lock
        setCropRect((r) => {
          setLockedRatio(r.width / r.height);
          return r;
        });
      } else {
        setLockedRatio(null);
      }
      return next;
    });
  }, []);

  const resetCrop = useCallback(() => {
    setCropRect(FULL_RECT);
  }, []);

  return {
    cropRect,
    aspectRatioLocked,
    updateHandle,
    toggleAspectRatioLock,
    resetCrop,
  };
}
