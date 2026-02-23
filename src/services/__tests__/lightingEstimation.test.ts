/**
 * Lighting estimation service tests.
 * cm-beo: AR Camera room detection and surface plane mapping
 */

import * as LightingEstimation from '../lightingEstimation';

describe('lightingEstimation', () => {
  beforeEach(() => {
    LightingEstimation._reset();
  });

  afterEach(() => {
    LightingEstimation.stop();
  });

  // --------------------------------------------------------------------------
  // Default estimate
  // --------------------------------------------------------------------------
  describe('getEstimate', () => {
    it('returns a valid estimate with all required fields', () => {
      const estimate = LightingEstimation.getEstimate();
      expect(typeof estimate.ambientIntensity).toBe('number');
      expect(typeof estimate.colorTemperature).toBe('number');
      expect(typeof estimate.shadowOpacity).toBe('number');
      expect(typeof estimate.shadowTint).toBe('string');
    });

    it('has intensity between 0 and 1', () => {
      const estimate = LightingEstimation.getEstimate();
      expect(estimate.ambientIntensity).toBeGreaterThanOrEqual(0);
      expect(estimate.ambientIntensity).toBeLessThanOrEqual(1);
    });

    it('has reasonable color temperature', () => {
      const estimate = LightingEstimation.getEstimate();
      expect(estimate.colorTemperature).toBeGreaterThanOrEqual(1800);
      expect(estimate.colorTemperature).toBeLessThanOrEqual(8000);
    });

    it('has shadow opacity between 0 and 0.4', () => {
      const estimate = LightingEstimation.getEstimate();
      expect(estimate.shadowOpacity).toBeGreaterThanOrEqual(0);
      expect(estimate.shadowOpacity).toBeLessThanOrEqual(0.4);
    });

    it('returns a new object each call (no shared reference)', () => {
      const a = LightingEstimation.getEstimate();
      const b = LightingEstimation.getEstimate();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  // --------------------------------------------------------------------------
  // Lighting condition
  // --------------------------------------------------------------------------
  describe('getCondition', () => {
    it('returns a valid condition string', () => {
      const condition = LightingEstimation.getCondition();
      expect(['low', 'normal', 'bright']).toContain(condition);
    });

    it('returns "low" when intensity is very low', () => {
      LightingEstimation.updateFromNative(0.1, 3000);
      expect(LightingEstimation.getCondition()).toBe('low');
    });

    it('returns "normal" for mid-range intensity', () => {
      LightingEstimation.updateFromNative(0.5, 5000);
      expect(LightingEstimation.getCondition()).toBe('normal');
    });

    it('returns "bright" for high intensity', () => {
      LightingEstimation.updateFromNative(0.9, 5500);
      expect(LightingEstimation.getCondition()).toBe('bright');
    });
  });

  // --------------------------------------------------------------------------
  // updateFromNative
  // --------------------------------------------------------------------------
  describe('updateFromNative', () => {
    it('updates the estimate with provided values', () => {
      LightingEstimation.updateFromNative(0.9, 6000);
      const estimate = LightingEstimation.getEstimate();
      expect(estimate.ambientIntensity).toBe(0.9);
      expect(estimate.colorTemperature).toBe(6000);
    });

    it('clamps intensity to 0–1', () => {
      LightingEstimation.updateFromNative(1.5, 5000);
      expect(LightingEstimation.getEstimate().ambientIntensity).toBe(1);

      LightingEstimation.updateFromNative(-0.5, 5000);
      expect(LightingEstimation.getEstimate().ambientIntensity).toBe(0);
    });

    it('clamps temperature to 1800–8000', () => {
      LightingEstimation.updateFromNative(0.7, 500);
      expect(LightingEstimation.getEstimate().colorTemperature).toBe(1800);

      LightingEstimation.updateFromNative(0.7, 12000);
      expect(LightingEstimation.getEstimate().colorTemperature).toBe(8000);
    });

    it('adjusts shadow opacity based on intensity', () => {
      LightingEstimation.updateFromNative(0.1, 5000);
      const lowEstimate = LightingEstimation.getEstimate();

      LightingEstimation.updateFromNative(0.95, 5000);
      const highEstimate = LightingEstimation.getEstimate();

      expect(highEstimate.shadowOpacity).toBeGreaterThan(lowEstimate.shadowOpacity);
    });

    it('adjusts shadow tint based on color temperature', () => {
      LightingEstimation.updateFromNative(0.7, 2800); // Warm
      const warm = LightingEstimation.getEstimate();

      LightingEstimation.updateFromNative(0.7, 6500); // Cool
      const cool = LightingEstimation.getEstimate();

      // Tints should differ based on temperature
      expect(warm.shadowTint).not.toBe(cool.shadowTint);
    });
  });

  // --------------------------------------------------------------------------
  // start / stop
  // --------------------------------------------------------------------------
  describe('start / stop', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('start() updates the estimate from time of day', () => {
      LightingEstimation.start();
      const estimate = LightingEstimation.getEstimate();
      // After start, estimate should reflect simulated time-of-day
      expect(estimate.ambientIntensity).toBeGreaterThan(0);
    });

    it('stop() halts periodic updates', () => {
      LightingEstimation.start();
      LightingEstimation.stop();

      // Force a native update
      LightingEstimation.updateFromNative(0.3, 3000);
      const afterManual = LightingEstimation.getEstimate();

      // Advance time — should NOT auto-update back
      jest.advanceTimersByTime(10000);
      const afterTime = LightingEstimation.getEstimate();

      expect(afterTime.ambientIntensity).toBe(afterManual.ambientIntensity);
    });
  });

  // --------------------------------------------------------------------------
  // _reset
  // --------------------------------------------------------------------------
  describe('_reset', () => {
    it('restores default estimate', () => {
      LightingEstimation.updateFromNative(0.1, 2000);
      LightingEstimation._reset();

      const estimate = LightingEstimation.getEstimate();
      expect(estimate.ambientIntensity).toBe(0.7);
      expect(estimate.colorTemperature).toBe(5000);
    });
  });
});
