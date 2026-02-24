import {
  isSurfaceDetectionAvailable,
  startDetection,
  stopDetection,
  getDetectedPlanes,
  getDetectionState,
  hitTest,
  resetDetection,
  DEFAULT_CONFIG,
  type DetectedPlane,
  type DetectionState,
} from '@/services/surfaceDetection';
import { Platform } from 'react-native';

// Helper to advance timers and flush callbacks
function advanceTimers(ms: number) {
  jest.advanceTimersByTime(ms);
}

beforeEach(() => {
  jest.useFakeTimers();
  resetDetection();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('surfaceDetection', () => {
  describe('isSurfaceDetectionAvailable', () => {
    it('returns true on iOS', () => {
      Platform.OS = 'ios';
      expect(isSurfaceDetectionAvailable()).toBe(true);
    });

    it('returns true on Android', () => {
      Platform.OS = 'android';
      expect(isSurfaceDetectionAvailable()).toBe(true);
    });

    it('returns false on web', () => {
      Platform.OS = 'web' as typeof Platform.OS;
      expect(isSurfaceDetectionAvailable()).toBe(false);
    });
  });

  describe('startDetection / stopDetection', () => {
    it('begins in initializing state', () => {
      expect(getDetectionState()).toBe('initializing');
    });

    it('transitions to scanning on start', () => {
      const onStateChanged = jest.fn();
      startDetection(undefined, { onStateChanged });
      expect(getDetectionState()).toBe('scanning');
      expect(onStateChanged).toHaveBeenCalledWith('scanning');
      stopDetection();
    });

    it('resets to initializing on stop', () => {
      startDetection();
      expect(getDetectionState()).toBe('scanning');
      stopDetection();
      expect(getDetectionState()).toBe('initializing');
    });

    it('clears planes on stop', () => {
      startDetection();
      advanceTimers(2000); // Let some planes detect
      stopDetection();
      expect(getDetectedPlanes()).toHaveLength(0);
    });

    it('ignores duplicate start calls', () => {
      const onStateChanged = jest.fn();
      startDetection(undefined, { onStateChanged });
      startDetection(undefined, { onStateChanged }); // Should be no-op
      expect(onStateChanged).toHaveBeenCalledTimes(1);
      stopDetection();
    });
  });

  describe('plane detection simulation', () => {
    it('detects a floor plane after ~1.5s', () => {
      const onPlaneDetected = jest.fn();
      startDetection(undefined, { onPlaneDetected });

      // At 1.5s (tick 3), first floor plane should appear
      advanceTimers(1500);

      expect(onPlaneDetected).toHaveBeenCalledTimes(1);
      const plane: DetectedPlane = onPlaneDetected.mock.calls[0][0];
      expect(plane.type).toBe('floor');
      expect(plane.alignment).toBe('horizontal');
      expect(plane.confidence).toBeGreaterThanOrEqual(0.6);
      expect(plane.id).toMatch(/^plane-/);
      stopDetection();
    });

    it('transitions to detected state when plane found', () => {
      const states: DetectionState[] = [];
      startDetection(undefined, { onStateChanged: (s) => states.push(s) });

      advanceTimers(1500);

      expect(states).toContain('scanning');
      expect(states).toContain('detected');
      stopDetection();
    });

    it('refines floor plane extent over time', () => {
      const onPlaneUpdated = jest.fn();
      startDetection(undefined, { onPlaneUpdated });

      advanceTimers(3000); // Floor detected + first refinement
      expect(onPlaneUpdated).toHaveBeenCalled();

      const updated: DetectedPlane = onPlaneUpdated.mock.calls[0][0];
      expect(updated.type).toBe('floor');
      expect(updated.extent.width).toBeGreaterThan(1);
      stopDetection();
    });

    it('detects wall planes when vertical detection enabled', () => {
      const onPlaneDetected = jest.fn();
      startDetection({ detectVertical: true }, { onPlaneDetected });

      advanceTimers(4000); // Wall detection at tick 8

      const wallDetections = onPlaneDetected.mock.calls
        .map((c) => c[0] as DetectedPlane)
        .filter((p) => p.type === 'wall');
      expect(wallDetections.length).toBeGreaterThanOrEqual(1);
      stopDetection();
    });

    it('skips wall detection when disabled', () => {
      const onPlaneDetected = jest.fn();
      startDetection({ detectVertical: false }, { onPlaneDetected });

      advanceTimers(5000);

      const planes = onPlaneDetected.mock.calls
        .map((c) => c[0] as DetectedPlane);
      expect(planes.every((p) => p.type !== 'wall')).toBe(true);
      stopDetection();
    });

    it('enters tracking state with high-confidence planes', () => {
      const states: DetectionState[] = [];
      startDetection(undefined, { onStateChanged: (s) => states.push(s) });

      advanceTimers(5000); // Tracking at tick 10

      expect(states).toContain('tracking');
      stopDetection();
    });

    it('respects maxPlanes config', () => {
      startDetection({ maxPlanes: 1 });

      advanceTimers(5000);

      expect(getDetectedPlanes().length).toBeLessThanOrEqual(1);
      stopDetection();
    });
  });

  describe('getDetectedPlanes', () => {
    it('returns empty array before detection', () => {
      expect(getDetectedPlanes()).toEqual([]);
    });

    it('returns detected planes', () => {
      startDetection();
      advanceTimers(2000);

      const planes = getDetectedPlanes();
      expect(planes.length).toBeGreaterThan(0);
      expect(planes[0]).toHaveProperty('id');
      expect(planes[0]).toHaveProperty('type');
      expect(planes[0]).toHaveProperty('center');
      expect(planes[0]).toHaveProperty('extent');
      expect(planes[0]).toHaveProperty('confidence');
      stopDetection();
    });
  });

  describe('hitTest', () => {
    it('returns null when no planes detected', () => {
      startDetection();
      const result = hitTest(0.5, 0.5);
      expect(result).toBeNull();
      stopDetection();
    });

    it('returns a placement anchor when floor is detected', () => {
      startDetection();
      advanceTimers(2000); // Floor detected

      const result = hitTest(0.5, 0.65);
      expect(result).not.toBeNull();
      expect(result!.planeId).toMatch(/^plane-/);
      expect(result!.position).toEqual({ x: 0.5, y: 0.65 });
      expect(result!.isValid).toBe(true);
      stopDetection();
    });

    it('returns invalid anchor for points outside plane extent', () => {
      startDetection();
      advanceTimers(2000);

      // Far outside any plane
      const result = hitTest(0.01, 0.01);
      expect(result).not.toBeNull();
      expect(result!.isValid).toBe(false);
      stopDetection();
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('has sensible defaults', () => {
      expect(DEFAULT_CONFIG.detectHorizontal).toBe(true);
      expect(DEFAULT_CONFIG.detectVertical).toBe(true);
      expect(DEFAULT_CONFIG.minimumPlaneExtent).toBe(0.3);
      expect(DEFAULT_CONFIG.maxPlanes).toBe(8);
      expect(DEFAULT_CONFIG.confidenceThreshold).toBe(0.6);
    });
  });
});
