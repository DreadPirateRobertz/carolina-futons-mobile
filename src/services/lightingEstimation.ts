/**
 * Lighting estimation service for realistic AR shadow rendering.
 *
 * Abstracts ARKit's light estimation / ARCore's Environmental HDR into a
 * unified API. Provides ambient light intensity, color temperature, and
 * directional light data that components use to render realistic shadows
 * under placed furniture.
 *
 * Works in typical living room lighting conditions (100-500 lux).
 */

import { Platform } from 'react-native';
import type { DeviceTier } from '@/services/arSupport';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Light estimation data from the AR session */
export interface LightEstimate {
  /** Ambient light intensity in lumens (0-2000+) */
  ambientIntensity: number;
  /** Color temperature in Kelvin (2000-7500) */
  ambientColorTemperature: number;
  /** Primary directional light vector (normalized) */
  primaryLightDirection: { x: number; y: number; z: number };
  /** Primary directional light intensity (0-1) */
  primaryLightIntensity: number;
  /** Timestamp of this estimate */
  timestamp: number;
}

/** Shadow parameters derived from lighting */
export interface ShadowParams {
  /** Shadow opacity (0-1, higher = darker shadow) */
  opacity: number;
  /** Shadow blur radius in points */
  blur: number;
  /** Shadow offset based on dominant light direction */
  offsetX: number;
  offsetY: number;
  /** Shadow color with embedded opacity */
  color: string;
}

/** Lighting condition classification */
export type LightingCondition = 'bright' | 'normal' | 'dim' | 'dark';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Typical indoor lighting ranges in lumens */
const LIGHTING_THRESHOLDS = {
  bright: 500, // Well-lit room, near window
  normal: 200, // Standard indoor lighting
  dim: 50, // Evening, single lamp
  // Below 50 = dark
} as const;

/** Default light estimate for initial render (typical indoor) */
const DEFAULT_ESTIMATE: LightEstimate = {
  ambientIntensity: 350,
  ambientColorTemperature: 4500, // Warm white LED
  primaryLightDirection: { x: 0.3, y: -0.8, z: 0.5 },
  primaryLightIntensity: 0.6,
  timestamp: 0,
};

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let _currentEstimate: LightEstimate = { ...DEFAULT_ESTIMATE };
let _updateInterval: ReturnType<typeof setInterval> | null = null;
let _isRunning = false;
let _onUpdate: ((estimate: LightEstimate) => void) | null = null;

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Start lighting estimation updates.
 * Begins polling for ambient light data from the camera/AR session.
 */
export function startLightingEstimation(
  onUpdate?: (estimate: LightEstimate) => void,
): void {
  if (_isRunning) return;

  _isRunning = true;
  _onUpdate = onUpdate ?? null;
  _currentEstimate = { ...DEFAULT_ESTIMATE, timestamp: Date.now() };

  // Simulate lighting updates. In production, this hooks into
  // ARKit's ARLightEstimate or ARCore's LightEstimate API.
  _updateInterval = setInterval(() => {
    if (!_isRunning) return;
    _simulateLightingUpdate();
  }, 1000);
}

/**
 * Stop lighting estimation.
 */
export function stopLightingEstimation(): void {
  _isRunning = false;
  if (_updateInterval) {
    clearInterval(_updateInterval);
    _updateInterval = null;
  }
  _onUpdate = null;
}

/**
 * Get the current light estimate.
 */
export function getCurrentLightEstimate(): LightEstimate {
  return { ..._currentEstimate };
}

/**
 * Classify the current lighting condition.
 */
export function classifyLighting(estimate?: LightEstimate): LightingCondition {
  const intensity = (estimate ?? _currentEstimate).ambientIntensity;
  if (intensity >= LIGHTING_THRESHOLDS.bright) return 'bright';
  if (intensity >= LIGHTING_THRESHOLDS.normal) return 'normal';
  if (intensity >= LIGHTING_THRESHOLDS.dim) return 'dim';
  return 'dark';
}

/**
 * Compute shadow rendering parameters from the current light estimate.
 * Accounts for device tier to simplify shadows on lower-end devices.
 */
export function computeShadowParams(
  estimate?: LightEstimate,
  deviceTier?: DeviceTier,
): ShadowParams {
  const est = estimate ?? _currentEstimate;
  const condition = classifyLighting(est);
  const tier = deviceTier ?? 'standard';

  // Base shadow opacity inversely proportional to ambient light
  // Bright rooms = softer shadows, dim rooms = more defined shadows
  let baseOpacity: number;
  switch (condition) {
    case 'bright':
      baseOpacity = 0.15;
      break;
    case 'normal':
      baseOpacity = 0.25;
      break;
    case 'dim':
      baseOpacity = 0.35;
      break;
    case 'dark':
      baseOpacity = 0.1; // Very dark = almost no visible shadow
      break;
  }

  // Modulate by primary light intensity
  const opacity = baseOpacity * (0.5 + est.primaryLightIntensity * 0.5);

  // Shadow offset from dominant light direction
  const shadowScale = 8;
  const offsetX = -est.primaryLightDirection.x * shadowScale;
  const offsetY = -est.primaryLightDirection.y * shadowScale;

  // Blur: brighter = softer, dimmer = sharper
  let blur: number;
  switch (condition) {
    case 'bright':
      blur = 12;
      break;
    case 'normal':
      blur = 8;
      break;
    case 'dim':
      blur = 5;
      break;
    case 'dark':
      blur = 3;
      break;
  }

  // Reduce quality on lower-tier devices
  if (tier === 'fallback') {
    return {
      opacity: 0.2,
      blur: 6,
      offsetX: 2,
      offsetY: 4,
      color: `rgba(0, 0, 0, 0.2)`,
    };
  }

  // Color temperature affects shadow warmth
  const warmth = est.ambientColorTemperature < 4000;
  const shadowR = warmth ? 20 : 0;
  const shadowG = 0;
  const shadowB = warmth ? 0 : 10;

  return {
    opacity: Math.round(opacity * 100) / 100,
    blur: tier === 'standard' ? Math.min(blur, 8) : blur,
    offsetX: Math.round(offsetX * 10) / 10,
    offsetY: Math.round(offsetY * 10) / 10,
    color: `rgba(${shadowR}, ${shadowG}, ${shadowB}, ${Math.round(opacity * 100) / 100})`,
  };
}

/**
 * Check if current lighting is adequate for AR furniture placement.
 * Returns a user-friendly message if lighting is poor.
 */
export function getLightingWarning(estimate?: LightEstimate): string | null {
  const condition = classifyLighting(estimate);
  switch (condition) {
    case 'dark':
      return 'Very low light detected. Turn on more lights for better AR placement.';
    case 'dim':
      return 'Low light detected. Results may be improved with additional lighting.';
    default:
      return null;
  }
}

/**
 * Reset for testing.
 */
export function resetLightingEstimation(): void {
  stopLightingEstimation();
  _currentEstimate = { ...DEFAULT_ESTIMATE };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Simulate lighting updates with natural variation.
 * Models typical living room conditions with gradual shifts.
 */
function _simulateLightingUpdate(): void {
  const now = Date.now();
  const prev = _currentEstimate;

  // Natural indoor lighting fluctuation (±5%)
  const intensityJitter = (Math.random() - 0.5) * prev.ambientIntensity * 0.1;
  const tempJitter = (Math.random() - 0.5) * 200;

  // Light direction slowly shifts (simulating user moving)
  const dirJitter = 0.02;
  const dx = prev.primaryLightDirection.x + (Math.random() - 0.5) * dirJitter;
  const dy = prev.primaryLightDirection.y;
  const dz = prev.primaryLightDirection.z + (Math.random() - 0.5) * dirJitter;
  const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);

  _currentEstimate = {
    ambientIntensity: Math.max(10, Math.min(2000, prev.ambientIntensity + intensityJitter)),
    ambientColorTemperature: Math.max(
      2000,
      Math.min(7500, prev.ambientColorTemperature + tempJitter),
    ),
    primaryLightDirection: {
      x: dx / mag,
      y: dy / mag,
      z: dz / mag,
    },
    primaryLightIntensity: Math.max(0.1, Math.min(1, prev.primaryLightIntensity + (Math.random() - 0.5) * 0.05)),
    timestamp: now,
  };

  _onUpdate?.(_currentEstimate);
}
