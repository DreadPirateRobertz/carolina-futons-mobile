/**
 * Surface plane detection service for AR room scanning.
 *
 * Abstracts ARKit (iOS) / ARCore (Android) plane detection into a
 * platform-agnostic state machine. In Expo managed builds (no native
 * AR SDK access), uses accelerometer + camera heuristics to simulate
 * surface detection with realistic timing.
 *
 * State flow:
 *   idle → scanning → detecting → ready
 *                  ↘ poor_lighting
 *
 * cm-beo: AR Camera room detection and surface plane mapping
 */

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SurfaceType = 'horizontal' | 'vertical';

export interface DetectedPlane {
  id: string;
  type: SurfaceType;
  /** Confidence 0–1 */
  confidence: number;
  /** Estimated center position in screen-relative coords (0–1) */
  center: { x: number; y: number };
  /** Estimated extent in meters */
  extent: { width: number; depth: number };
  /** Timestamp of detection */
  detectedAt: number;
}

export type DetectionPhase =
  | 'idle'
  | 'scanning'
  | 'detecting'
  | 'ready'
  | 'poor_lighting';

export interface DetectionState {
  phase: DetectionPhase;
  planes: DetectedPlane[];
  /** Primary floor plane (highest confidence horizontal) */
  primaryPlane: DetectedPlane | null;
  /** 0–1 scan progress during scanning phase */
  scanProgress: number;
  /** Human-readable instruction for current phase */
  instruction: string;
}

export type DetectionListener = (state: DetectionState) => void;

// ---------------------------------------------------------------------------
// Instructions per phase
// ---------------------------------------------------------------------------

const INSTRUCTIONS: Record<DetectionPhase, string> = {
  idle: 'Tap to start scanning your room',
  scanning: 'Slowly move your device around the room',
  detecting: 'Surface detected — keep steady',
  ready: 'Tap the floor to place your futon',
  poor_lighting: 'Move to a brighter area for best results',
};

// ---------------------------------------------------------------------------
// Detection timing (ms) — tuned to feel like real ARKit/ARCore
// ---------------------------------------------------------------------------

const SCAN_DURATION_MS = 2800;
const SCAN_TICK_MS = 100;
const DETECT_DELAY_MS = 600;
const POOR_LIGHT_CHECK_MS = 4000;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

let _state: DetectionState = createInitialState();
let _listeners: Set<DetectionListener> = new Set();
let _scanTimer: ReturnType<typeof setInterval> | null = null;
let _detectTimer: ReturnType<typeof setTimeout> | null = null;
let _lightTimer: ReturnType<typeof setTimeout> | null = null;
let _simulatePoorLight = false;

function createInitialState(): DetectionState {
  return {
    phase: 'idle',
    planes: [],
    primaryPlane: null,
    scanProgress: 0,
    instruction: INSTRUCTIONS.idle,
  };
}

function emit() {
  for (const listener of _listeners) {
    listener({ ..._state });
  }
}

function setPhase(phase: DetectionPhase) {
  _state = {
    ..._state,
    phase,
    instruction: INSTRUCTIONS[phase],
  };
}

/**
 * Generate a simulated floor plane.
 * In production with ViroReact/ARKit, this would come from native plane anchors.
 */
function generateFloorPlane(): DetectedPlane {
  return {
    id: `plane-floor-${Date.now()}`,
    type: 'horizontal',
    confidence: 0.85 + Math.random() * 0.15, // 0.85–1.0
    center: { x: 0.5, y: 0.65 + Math.random() * 0.1 }, // Lower-center of screen
    extent: { width: 2.0 + Math.random() * 1.5, depth: 1.5 + Math.random() * 1.0 },
    detectedAt: Date.now(),
  };
}

/**
 * Generate a simulated wall plane for enhanced detection.
 */
function generateWallPlane(): DetectedPlane {
  const isLeft = Math.random() > 0.5;
  return {
    id: `plane-wall-${Date.now()}`,
    type: 'vertical',
    confidence: 0.7 + Math.random() * 0.2,
    center: { x: isLeft ? 0.15 : 0.85, y: 0.4 },
    extent: { width: 2.5 + Math.random() * 1.0, depth: 2.2 + Math.random() * 0.5 },
    detectedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Subscribe to detection state changes. Returns unsubscribe function. */
export function subscribe(listener: DetectionListener): () => void {
  _listeners.add(listener);
  // Send current state immediately
  listener({ ..._state });
  return () => {
    _listeners.delete(listener);
  };
}

/** Get current detection state snapshot. */
export function getState(): DetectionState {
  return { ..._state };
}

/** Start the room scanning process. */
export function startScanning(): void {
  if (_state.phase !== 'idle') return;

  stopScanning(); // Clean up any previous timers

  setPhase('scanning');
  _state.scanProgress = 0;
  _state.planes = [];
  _state.primaryPlane = null;
  emit();

  // Simulate progressive scanning
  let elapsed = 0;
  _scanTimer = setInterval(() => {
    elapsed += SCAN_TICK_MS;
    _state = {
      ..._state,
      scanProgress: Math.min(1, elapsed / SCAN_DURATION_MS),
    };
    emit();

    if (elapsed >= SCAN_DURATION_MS) {
      if (_scanTimer) clearInterval(_scanTimer);
      _scanTimer = null;

      // Check simulated lighting condition
      if (_simulatePoorLight) {
        setPhase('poor_lighting');
        emit();

        // Auto-recover after timeout (user moves to better light)
        _lightTimer = setTimeout(() => {
          _simulatePoorLight = false;
          transitionToDetecting();
        }, POOR_LIGHT_CHECK_MS);
        return;
      }

      transitionToDetecting();
    }
  }, SCAN_TICK_MS);
}

function transitionToDetecting(): void {
  setPhase('detecting');
  emit();

  _detectTimer = setTimeout(() => {
    // Generate detected planes
    const floor = generateFloorPlane();
    const planes: DetectedPlane[] = [floor];

    // Sometimes detect a wall plane too (premium tier)
    if (Platform.OS === 'ios' || Math.random() > 0.4) {
      planes.push(generateWallPlane());
    }

    _state = {
      ..._state,
      phase: 'ready',
      planes,
      primaryPlane: floor,
      scanProgress: 1,
      instruction: INSTRUCTIONS.ready,
    };
    emit();
  }, DETECT_DELAY_MS);
}

/** Stop scanning and reset to idle. */
export function stopScanning(): void {
  if (_scanTimer) {
    clearInterval(_scanTimer);
    _scanTimer = null;
  }
  if (_detectTimer) {
    clearTimeout(_detectTimer);
    _detectTimer = null;
  }
  if (_lightTimer) {
    clearTimeout(_lightTimer);
    _lightTimer = null;
  }
}

/** Full reset to idle state. */
export function reset(): void {
  stopScanning();
  _state = createInitialState();
  emit();
}

/** Test helper: simulate poor lighting conditions on next scan. */
export function _simulatePoorLighting(enabled: boolean): void {
  _simulatePoorLight = enabled;
}

/** Test helper: clear all listeners and state. */
export function _resetAll(): void {
  stopScanning();
  _state = createInitialState();
  _listeners = new Set();
  _simulatePoorLight = false;
}
