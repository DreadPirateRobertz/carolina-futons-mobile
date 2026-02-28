/**
 * Surface plane detection service for AR room mapping.
 *
 * Abstracts ARKit (iOS) / ARCore (Android) plane detection into a unified API.
 * Detects floor and wall planes, tracks their geometry, and provides placement
 * anchors where furniture can be positioned.
 *
 * In Expo managed workflow, this uses a polling-based simulation with device
 * sensor data. In production with a dev client, the native bridge would provide
 * real ARKit/ARCore plane data.
 */

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlaneType = 'floor' | 'wall' | 'ceiling' | 'unknown';

export type PlaneAlignment = 'horizontal' | 'vertical';

export type DetectionState =
  | 'initializing'
  | 'scanning'
  | 'detected'
  | 'tracking'
  | 'limited'
  | 'error';

/** UI-facing detection phase for the SurfaceIndicator */
export type DetectionPhase = 'initializing' | 'scanning' | 'detected' | 'ready';

/** A detected surface plane in the AR scene */
export interface DetectedPlane {
  /** Unique plane identifier */
  id: string;
  /** Classification of the surface */
  type: PlaneType;
  /** Horizontal (floor/ceiling) or vertical (wall) */
  alignment: PlaneAlignment;
  /** Center position in screen-relative coordinates (0-1 range) */
  center: { x: number; y: number; z: number };
  /** Plane extent in meters */
  extent: { width: number; height: number };
  /** Rotation around Y axis in radians */
  rotation: number;
  /** Confidence score 0-1 */
  confidence: number;
  /** Timestamp of last update */
  lastUpdated: number;
}

/** A viable placement point on a detected surface */
export interface PlacementAnchor {
  /** ID of the plane this anchor sits on */
  planeId: string;
  /** Position in screen coordinates (0-1 range) */
  position: { x: number; y: number };
  /** World position in meters from camera */
  worldPosition: { x: number; y: number; z: number };
  /** Whether this point is suitable for furniture placement */
  isValid: boolean;
  /** Distance from camera in meters */
  distance: number;
}

/** Configuration for surface detection */
export interface SurfaceDetectionConfig {
  /** Detect horizontal planes (floors, tables) */
  detectHorizontal: boolean;
  /** Detect vertical planes (walls) */
  detectVertical: boolean;
  /** Minimum plane extent in meters to report */
  minimumPlaneExtent: number;
  /** Maximum number of planes to track simultaneously */
  maxPlanes: number;
  /** Minimum confidence threshold (0-1) */
  confidenceThreshold: number;
}

export interface SurfaceDetectionCallbacks {
  onPlaneDetected?: (plane: DetectedPlane) => void;
  onPlaneUpdated?: (plane: DetectedPlane) => void;
  onPlaneRemoved?: (planeId: string) => void;
  onStateChanged?: (state: DetectionState) => void;
  onError?: (error: SurfaceDetectionError) => void;
}

export interface SurfaceDetectionError {
  code: 'NOT_SUPPORTED' | 'PERMISSION_DENIED' | 'SESSION_FAILED' | 'TRACKING_LOST';
  message: string;
}

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG: SurfaceDetectionConfig = {
  detectHorizontal: true,
  detectVertical: true,
  minimumPlaneExtent: 0.3, // 30cm minimum — filters out small surfaces
  maxPlanes: 8,
  confidenceThreshold: 0.6,
};

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let _state: DetectionState = 'initializing';
let _planes: Map<string, DetectedPlane> = new Map();
let _config: SurfaceDetectionConfig = { ...DEFAULT_CONFIG };
let _callbacks: SurfaceDetectionCallbacks = {};
let _scanInterval: ReturnType<typeof setInterval> | null = null;
let _isRunning = false;
let _planeIdCounter = 0;

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Check if surface detection is available on this device.
 */
export function isSurfaceDetectionAvailable(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Start surface detection with the given configuration.
 * Begins scanning for floor/wall planes in the camera view.
 */
export function startDetection(
  config?: Partial<SurfaceDetectionConfig>,
  callbacks?: SurfaceDetectionCallbacks,
): void {
  if (_isRunning) return;

  _config = { ...DEFAULT_CONFIG, ...config };
  _callbacks = callbacks ?? {};
  _planes.clear();
  _planeIdCounter = 0;
  _isRunning = true;

  _setState('scanning');

  // In Expo managed workflow, we simulate plane detection using a deterministic
  // scan progression. In production with a dev client, this would be replaced
  // with real ARKit/ARCore native module bindings.
  _beginScanSimulation();
}

/**
 * Stop surface detection and clean up resources.
 */
export function stopDetection(): void {
  if (!_isRunning) return;

  _isRunning = false;

  if (_scanInterval) {
    clearInterval(_scanInterval);
    _scanInterval = null;
  }

  _planes.clear();
  _setState('initializing');
}

/**
 * Get all currently detected planes.
 */
export function getDetectedPlanes(): DetectedPlane[] {
  return Array.from(_planes.values());
}

/**
 * Get the current detection state.
 */
export function getDetectionState(): DetectionState {
  return _state;
}

/**
 * Find the best placement anchor for a hit-test at the given screen point.
 * Finds the nearest suitable floor plane and returns a placement position.
 */
export function hitTest(screenX: number, screenY: number): PlacementAnchor | null {
  const floors = Array.from(_planes.values()).filter(
    (p) => p.type === 'floor' && p.confidence >= _config.confidenceThreshold,
  );

  if (floors.length === 0) return null;

  // Find the closest floor plane to the tap point
  let bestPlane: DetectedPlane | null = null;
  let bestDistance = Infinity;

  for (const plane of floors) {
    const dx = screenX - plane.center.x;
    const dy = screenY - plane.center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestPlane = plane;
    }
  }

  if (!bestPlane) return null;

  // Check if tap point is within the plane's extent
  const halfW = bestPlane.extent.width / 2;
  const halfH = bestPlane.extent.height / 2;
  const localX = screenX - bestPlane.center.x;
  const localY = screenY - bestPlane.center.y;
  const isWithinPlane = Math.abs(localX) <= halfW && Math.abs(localY) <= halfH;

  return {
    planeId: bestPlane.id,
    position: { x: screenX, y: screenY },
    worldPosition: {
      x: bestPlane.center.x + localX * 2, // Scale to world coords
      y: bestPlane.center.y,
      z: bestPlane.center.z + localY * 2,
    },
    isValid: isWithinPlane && bestPlane.confidence >= _config.confidenceThreshold,
    distance: bestPlane.center.z,
  };
}

/**
 * Reset detection state. Used for testing.
 */
export function resetDetection(): void {
  stopDetection();
  _state = 'initializing';
  _callbacks = {};
  _config = { ...DEFAULT_CONFIG };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _setState(state: DetectionState): void {
  _state = state;
  _callbacks.onStateChanged?.(state);
}

/**
 * Simulate progressive plane detection.
 *
 * In a real implementation, this would be replaced by native ARKit/ARCore
 * session delegates that fire plane detection callbacks. The simulation
 * models the typical detection progression:
 *   1. Scanning phase (1-2s): device looks for feature points
 *   2. Floor detected (2-3s): first horizontal plane found
 *   3. Plane refinement (3-5s): plane extent grows as more data arrives
 *   4. Wall detection (4-6s): vertical planes found if enabled
 *   5. Tracking state: stable tracking with periodic plane updates
 */
function _beginScanSimulation(): void {
  let tickCount = 0;

  _scanInterval = setInterval(() => {
    if (!_isRunning) return;
    tickCount++;

    // Phase 1: After ~1.5s scanning, detect the primary floor plane
    if (tickCount === 3 && _config.detectHorizontal) {
      const floor = _createPlane('floor', 'horizontal', {
        center: { x: 0.5, y: 0.65, z: 1.5 },
        extent: { width: 1.2, height: 0.8 },
        confidence: 0.7,
      });
      _addPlane(floor);
      _setState('detected');
    }

    // Phase 2: Refine floor plane — grows as ARKit/ARCore maps more area
    if (tickCount === 6 && _planes.size > 0) {
      const floor = Array.from(_planes.values()).find((p) => p.type === 'floor');
      if (floor) {
        const updated: DetectedPlane = {
          ...floor,
          extent: { width: 2.5, height: 1.8 },
          confidence: 0.85,
          lastUpdated: Date.now(),
        };
        _planes.set(floor.id, updated);
        _callbacks.onPlaneUpdated?.(updated);
      }
    }

    // Phase 3: Detect wall planes if enabled
    if (tickCount === 8 && _config.detectVertical && _planes.size < _config.maxPlanes) {
      const wall = _createPlane('wall', 'vertical', {
        center: { x: 0.5, y: 0.35, z: 2.0 },
        extent: { width: 2.0, height: 2.4 },
        confidence: 0.75,
      });
      _addPlane(wall);
    }

    // Phase 4: Enter stable tracking with high-confidence planes
    if (tickCount === 10) {
      const floor = Array.from(_planes.values()).find((p) => p.type === 'floor');
      if (floor) {
        const updated: DetectedPlane = {
          ...floor,
          extent: { width: 3.5, height: 2.5 },
          confidence: 0.95,
          lastUpdated: Date.now(),
        };
        _planes.set(floor.id, updated);
        _callbacks.onPlaneUpdated?.(updated);
      }
      _setState('tracking');
    }

    // Steady state: periodic minor updates to show tracking is active
    if (tickCount > 10 && tickCount % 4 === 0) {
      for (const plane of _planes.values()) {
        const jitter = (Math.random() - 0.5) * 0.02;
        const updated: DetectedPlane = {
          ...plane,
          confidence: Math.min(1, plane.confidence + jitter),
          lastUpdated: Date.now(),
        };
        _planes.set(plane.id, updated);
        _callbacks.onPlaneUpdated?.(updated);
      }
    }
  }, 500);
}

function _createPlane(
  type: PlaneType,
  alignment: PlaneAlignment,
  overrides: {
    center: { x: number; y: number; z: number };
    extent: { width: number; height: number };
    confidence: number;
  },
): DetectedPlane {
  _planeIdCounter++;
  return {
    id: `plane-${_planeIdCounter}`,
    type,
    alignment,
    center: overrides.center,
    extent: overrides.extent,
    rotation: 0,
    confidence: overrides.confidence,
    lastUpdated: Date.now(),
  };
}

function _addPlane(plane: DetectedPlane): void {
  if (_planes.size >= _config.maxPlanes) return;
  if (
    plane.extent.width < _config.minimumPlaneExtent &&
    plane.extent.height < _config.minimumPlaneExtent
  ) {
    return;
  }
  _planes.set(plane.id, plane);
  _callbacks.onPlaneDetected?.(plane);
}
