import {
  startLightingEstimation,
  stopLightingEstimation,
  getCurrentLightEstimate,
  classifyLighting,
  computeShadowParams,
  getLightingWarning,
  resetLightingEstimation,
  type LightEstimate,
} from '@/services/lightingEstimation';

beforeEach(() => {
  jest.useFakeTimers();
  resetLightingEstimation();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('lightingEstimation', () => {
  describe('getCurrentLightEstimate', () => {
    it('returns default estimate before starting', () => {
      const estimate = getCurrentLightEstimate();
      expect(estimate.ambientIntensity).toBe(350);
      expect(estimate.ambientColorTemperature).toBe(4500);
      expect(estimate.primaryLightDirection).toEqual({ x: 0.3, y: -0.8, z: 0.5 });
      expect(estimate.primaryLightIntensity).toBe(0.6);
    });

    it('returns a copy, not a reference', () => {
      const a = getCurrentLightEstimate();
      const b = getCurrentLightEstimate();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  describe('startLightingEstimation / stopLightingEstimation', () => {
    it('calls onUpdate with lighting data', () => {
      const onUpdate = jest.fn();
      startLightingEstimation(onUpdate);

      jest.advanceTimersByTime(2000); // 2 updates at 1s interval

      expect(onUpdate).toHaveBeenCalled();
      const estimate: LightEstimate = onUpdate.mock.calls[0][0];
      expect(estimate).toHaveProperty('ambientIntensity');
      expect(estimate).toHaveProperty('ambientColorTemperature');
      expect(estimate).toHaveProperty('primaryLightDirection');
      expect(estimate).toHaveProperty('timestamp');

      stopLightingEstimation();
    });

    it('stops calling onUpdate after stop', () => {
      const onUpdate = jest.fn();
      startLightingEstimation(onUpdate);

      jest.advanceTimersByTime(1000);
      const callCount = onUpdate.mock.calls.length;

      stopLightingEstimation();
      jest.advanceTimersByTime(5000);

      expect(onUpdate.mock.calls.length).toBe(callCount);
    });

    it('ignores duplicate start calls', () => {
      const onUpdate1 = jest.fn();
      const onUpdate2 = jest.fn();
      startLightingEstimation(onUpdate1);
      startLightingEstimation(onUpdate2); // Should be no-op

      jest.advanceTimersByTime(2000);

      expect(onUpdate1).toHaveBeenCalled();
      expect(onUpdate2).not.toHaveBeenCalled();

      stopLightingEstimation();
    });
  });

  describe('classifyLighting', () => {
    it('classifies bright lighting (>= 500 lux)', () => {
      expect(classifyLighting({ ambientIntensity: 600 } as LightEstimate)).toBe('bright');
      expect(classifyLighting({ ambientIntensity: 500 } as LightEstimate)).toBe('bright');
    });

    it('classifies normal lighting (200-499 lux)', () => {
      expect(classifyLighting({ ambientIntensity: 350 } as LightEstimate)).toBe('normal');
      expect(classifyLighting({ ambientIntensity: 200 } as LightEstimate)).toBe('normal');
    });

    it('classifies dim lighting (50-199 lux)', () => {
      expect(classifyLighting({ ambientIntensity: 100 } as LightEstimate)).toBe('dim');
      expect(classifyLighting({ ambientIntensity: 50 } as LightEstimate)).toBe('dim');
    });

    it('classifies dark lighting (< 50 lux)', () => {
      expect(classifyLighting({ ambientIntensity: 30 } as LightEstimate)).toBe('dark');
      expect(classifyLighting({ ambientIntensity: 0 } as LightEstimate)).toBe('dark');
    });

    it('uses current estimate when no argument given', () => {
      // Default is 350 = normal
      expect(classifyLighting()).toBe('normal');
    });
  });

  describe('computeShadowParams', () => {
    const brightEstimate: LightEstimate = {
      ambientIntensity: 600,
      ambientColorTemperature: 5500,
      primaryLightDirection: { x: 0.3, y: -0.8, z: 0.5 },
      primaryLightIntensity: 0.8,
      timestamp: Date.now(),
    };

    const dimEstimate: LightEstimate = {
      ambientIntensity: 80,
      ambientColorTemperature: 3000,
      primaryLightDirection: { x: -0.2, y: -0.9, z: 0.3 },
      primaryLightIntensity: 0.3,
      timestamp: Date.now(),
    };

    it('returns lighter shadow in bright conditions', () => {
      const params = computeShadowParams(brightEstimate);
      expect(params.opacity).toBeLessThan(0.2);
      expect(params.blur).toBeGreaterThanOrEqual(8);
    });

    it('uses full blur on premium tier', () => {
      const params = computeShadowParams(brightEstimate, 'premium');
      expect(params.blur).toBe(12);
    });

    it('returns darker shadow in dim conditions', () => {
      const params = computeShadowParams(dimEstimate);
      expect(params.opacity).toBeGreaterThan(0.15);
    });

    it('offsets shadow based on light direction', () => {
      const params = computeShadowParams(brightEstimate);
      // Light from x=0.3 → shadow offset should be negative x
      expect(params.offsetX).toBeLessThan(0);
    });

    it('returns simplified shadow for fallback tier', () => {
      const params = computeShadowParams(brightEstimate, 'fallback');
      expect(params.opacity).toBe(0.2);
      expect(params.blur).toBe(6);
      expect(params.offsetX).toBe(2);
      expect(params.offsetY).toBe(4);
    });

    it('returns shadow color string', () => {
      const params = computeShadowParams(brightEstimate);
      expect(params.color).toMatch(/^rgba\(/);
    });

    it('limits blur on standard tier', () => {
      const params = computeShadowParams(brightEstimate, 'standard');
      expect(params.blur).toBeLessThanOrEqual(8);
    });
  });

  describe('getLightingWarning', () => {
    it('returns null for bright conditions', () => {
      expect(getLightingWarning({ ambientIntensity: 600 } as LightEstimate)).toBeNull();
    });

    it('returns null for normal conditions', () => {
      expect(getLightingWarning({ ambientIntensity: 300 } as LightEstimate)).toBeNull();
    });

    it('returns warning for dim conditions', () => {
      const warning = getLightingWarning({ ambientIntensity: 80 } as LightEstimate);
      expect(warning).not.toBeNull();
      expect(warning).toContain('Low light');
    });

    it('returns stronger warning for dark conditions', () => {
      const warning = getLightingWarning({ ambientIntensity: 20 } as LightEstimate);
      expect(warning).not.toBeNull();
      expect(warning).toContain('Very low light');
    });
  });
});
