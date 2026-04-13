/**
 * @module CropHandleOverlay
 *
 * Renders four draggable corner handles over a preview image for the
 * visual search crop UI — hq-ghe.
 *
 * The overlay is positioned absolutely to fill its parent. CropRect values
 * are normalized [0,1] and converted to pixel positions via the container
 * dimensions reported by onLayout.
 *
 * Each handle is a PanResponder-driven touchable. onHandleMove is called with
 * normalized (dx, dy) deltas so the parent hook (useCropUI) can update state.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  Text,
  type LayoutChangeEvent,
} from 'react-native';
import type { CropHandle, CropRect } from '@/hooks/useCropUI';

export interface CropHandleOverlayProps {
  cropRect: CropRect;
  aspectRatioLocked: boolean;
  onHandleMove: (handle: CropHandle, dx: number, dy: number) => void;
  onToggleAspectLock: () => void;
  onReset: () => void;
}

const HANDLE_SIZE = 24;

export function CropHandleOverlay({
  cropRect,
  aspectRatioLocked,
  onHandleMove,
  onToggleAspectLock,
  onReset,
}: CropHandleOverlayProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  }, []);

  const { x, y, width, height } = cropRect;
  const { width: cw, height: ch } = containerSize;

  // Pixel positions of the crop rectangle edges
  const left = x * cw;
  const top = y * ch;
  const right = (x + width) * cw;
  const bottom = (y + height) * ch;

  return (
    <View
      testID="crop-handle-overlay"
      style={StyleSheet.absoluteFillObject}
      onLayout={handleLayout}
      pointerEvents="box-none"
    >
      {/* Crop border */}
      <View
        testID="crop-border"
        pointerEvents="none"
        style={[
          styles.cropBorder,
          {
            left,
            top,
            width: right - left,
            height: bottom - top,
          },
        ]}
      />

      {/* Corner handles */}
      {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as CropHandle[]).map((handle) => {
        const hx = handle === 'topLeft' || handle === 'bottomLeft' ? left : right;
        const hy = handle === 'topLeft' || handle === 'topRight' ? top : bottom;

        return (
          <DragHandle
            key={handle}
            testID={`crop-handle-${handle}`}
            handle={handle}
            pixelX={hx}
            pixelY={hy}
            containerWidth={cw}
            containerHeight={ch}
            onMove={onHandleMove}
          />
        );
      })}

      {/* Aspect ratio lock toggle */}
      <TouchableOpacity
        testID="crop-aspect-lock"
        style={[styles.lockButton, { left: (left + right) / 2 - 20, top: bottom + 6 }]}
        onPress={onToggleAspectLock}
        accessibilityLabel={aspectRatioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
        accessibilityRole="button"
      >
        <Text style={styles.lockText}>{aspectRatioLocked ? '🔒' : '🔓'}</Text>
      </TouchableOpacity>

      {/* Reset */}
      <TouchableOpacity
        testID="crop-reset"
        style={[styles.resetButton, { left: right - 36, top: top - 36 }]}
        onPress={onReset}
        accessibilityLabel="Reset crop"
        accessibilityRole="button"
      >
        <Text style={styles.resetText}>↺</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── DragHandle ────────────────────────────────────────────────────────────────

interface DragHandleProps {
  testID: string;
  handle: CropHandle;
  pixelX: number;
  pixelY: number;
  containerWidth: number;
  containerHeight: number;
  onMove: (handle: CropHandle, dx: number, dy: number) => void;
}

function DragHandle({
  testID,
  handle,
  pixelX,
  pixelY,
  containerWidth,
  containerHeight,
  onMove,
}: DragHandleProps) {
  const lastPos = useRef({ x: 0, y: 0 });

  // Use refs so the PanResponder closure always reads the latest prop values.
  // The PanResponder is created once (useRef), so props captured at creation
  // time would be stale after the first onLayout update.
  const containerWidthRef = useRef(containerWidth);
  const containerHeightRef = useRef(containerHeight);
  const onMoveRef = useRef(onMove);
  containerWidthRef.current = containerWidth;
  containerHeightRef.current = containerHeight;
  onMoveRef.current = onMove;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        lastPos.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      },
      onPanResponderMove: (e) => {
        const px = e.nativeEvent.pageX;
        const py = e.nativeEvent.pageY;
        const rawDx = px - lastPos.current.x;
        const rawDy = py - lastPos.current.y;
        lastPos.current = { x: px, y: py };

        const cw = containerWidthRef.current;
        const ch = containerHeightRef.current;
        if (cw > 0 && ch > 0) {
          onMoveRef.current(handle, rawDx / cw, rawDy / ch);
        }
      },
    }),
  ).current;

  return (
    <View
      testID={testID}
      {...panResponder.panHandlers}
      style={[
        styles.handle,
        {
          left: pixelX - HANDLE_SIZE / 2,
          top: pixelY - HANDLE_SIZE / 2,
        },
      ]}
      accessibilityLabel={`Drag ${handle} corner`}
      accessibilityRole="adjustable"
    />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cropBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#E8845C',
  },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#E8845C',
    borderWidth: 3,
    borderColor: '#fff',
  },
  lockButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockText: {
    fontSize: 18,
  },
  resetButton: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
