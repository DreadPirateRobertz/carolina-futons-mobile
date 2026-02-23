/**
 * Lighting estimation service for AR shadow realism.
 *
 * Provides ambient light intensity and color temperature estimates
 * for adjusting futon shadow opacity and color in the AR overlay.
 * In Expo managed builds, simulates estimation based on time-of-day
 * and device brightness. In production with ARKit/ARCore, would use
 * native environmental HDR data.
 *
 * cm-beo: AR Camera room detection and surface plane mapping
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LightEstimate {
  /** Ambient intensity 0–1 (0 = dark, 1 = bright) */
  ambientIntensity: number;
  /** Color temperature in Kelvin (2700 = warm, 6500 = daylight) */
  colorTemperature: number;
  /** Recommended shadow opacity based on lighting (0–0.4) */
  shadowOpacity: number;
  /** Shadow tint color (warm or cool based on temperature) */
  shadowTint: string;
}

export type LightingCondition = 'low' | 'normal' | 'bright';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_ESTIMATE: LightEstimate = {
  ambientIntensity: 0.7,
  colorTemperature: 5000,
  shadowOpacity: 0.2,
  shadowTint: 'rgba(0, 0, 0, 0.2)',
};

// Shadow opacity mapping: brighter = sharper shadow
const SHADOW_OPACITY_MIN = 0.08;
const SHADOW_OPACITY_MAX = 0.35;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let _currentEstimate: LightEstimate = { ...DEFAULT_ESTIMATE };
let _updateInterval: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function intensityToShadowOpacity(intensity: number): number {
  // More light → sharper, more visible shadow
  return SHADOW_OPACITY_MIN + intensity * (SHADOW_OPACITY_MAX - SHADOW_OPACITY_MIN);
}

function temperatureToTint(temperature: number, opacity: number): string {
  // Warm light (< 4000K) → slightly warm shadow
  // Cool light (> 5500K) → slightly cool shadow
  if (temperature < 4000) {
    return `rgba(30, 15, 0, ${opacity})`;
  }
  if (temperature > 5500) {
    return `rgba(0, 5, 20, ${opacity})`;
  }
  return `rgba(0, 0, 0, ${opacity})`;
}

function computeEstimate(intensity: number, temperature: number): LightEstimate {
  const shadowOpacity = intensityToShadowOpacity(intensity);
  return {
    ambientIntensity: intensity,
    colorTemperature: temperature,
    shadowOpacity,
    shadowTint: temperatureToTint(temperature, shadowOpacity),
  };
}

/**
 * Simulate ambient light from time of day.
 * In production, ARKit/ARCore provides real `ambientIntensity` values.
 */
function simulateFromTimeOfDay(): { intensity: number; temperature: number } {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 9) {
    // Morning — warm, moderate
    return { intensity: 0.6, temperature: 3500 };
  }
  if (hour >= 9 && hour < 17) {
    // Daytime — bright, neutral
    return { intensity: 0.85, temperature: 5500 };
  }
  if (hour >= 17 && hour < 20) {
    // Evening — warm, dimming
    return { intensity: 0.55, temperature: 3200 };
  }
  // Night — low, warm indoor
  return { intensity: 0.4, temperature: 2800 };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get current lighting estimate. */
export function getEstimate(): LightEstimate {
  return { ..._currentEstimate };
}

/** Classify current lighting condition. */
export function getCondition(): LightingCondition {
  if (_currentEstimate.ambientIntensity < 0.3) return 'low';
  if (_currentEstimate.ambientIntensity > 0.75) return 'bright';
  return 'normal';
}

/**
 * Start periodic lighting estimation updates.
 * In Expo managed, uses time-based simulation.
 * Call stop() when AR session ends.
 */
export function start(): void {
  // Initial estimate
  const sim = simulateFromTimeOfDay();
  _currentEstimate = computeEstimate(sim.intensity, sim.temperature);

  // Periodic re-evaluation (every 5s — light doesn't change fast)
  _updateInterval = setInterval(() => {
    const sim = simulateFromTimeOfDay();
    // Add slight variation to simulate natural fluctuation
    const jitter = (Math.random() - 0.5) * 0.08;
    const intensity = Math.max(0, Math.min(1, sim.intensity + jitter));
    _currentEstimate = computeEstimate(intensity, sim.temperature);
  }, 5000);
}

/** Stop periodic updates. */
export function stop(): void {
  if (_updateInterval) {
    clearInterval(_updateInterval);
    _updateInterval = null;
  }
}

/** Update estimate from external source (e.g., native ARKit light probe). */
export function updateFromNative(ambientIntensity: number, colorTemperature: number): void {
  _currentEstimate = computeEstimate(
    Math.max(0, Math.min(1, ambientIntensity)),
    Math.max(1800, Math.min(8000, colorTemperature)),
  );
}

/** Reset to defaults. Used by tests. */
export function _reset(): void {
  stop();
  _currentEstimate = { ...DEFAULT_ESTIMATE };
}
