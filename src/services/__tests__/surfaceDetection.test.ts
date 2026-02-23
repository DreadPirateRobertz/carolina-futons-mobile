/**
 * Surface detection service tests.
 * cm-beo: AR Camera room detection and surface plane mapping
 */

import * as SurfaceDetection from '../surfaceDetection';
import type { DetectionState } from '../surfaceDetection';

describe('surfaceDetection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    SurfaceDetection._resetAll();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // Initial state
  // --------------------------------------------------------------------------
  describe('initial state', () => {
    it('starts in idle phase', () => {
      const state = SurfaceDetection.getState();
      expect(state.phase).toBe('idle');
    });

    it('has no detected planes initially', () => {
      const state = SurfaceDetection.getState();
      expect(state.planes).toEqual([]);
      expect(state.primaryPlane).toBeNull();
    });

    it('has zero scan progress initially', () => {
      const state = SurfaceDetection.getState();
      expect(state.scanProgress).toBe(0);
    });

    it('provides an instruction for idle phase', () => {
      const state = SurfaceDetection.getState();
      expect(state.instruction).toBeTruthy();
      expect(typeof state.instruction).toBe('string');
    });
  });

  // --------------------------------------------------------------------------
  // subscribe
  // --------------------------------------------------------------------------
  describe('subscribe', () => {
    it('emits current state immediately on subscribe', () => {
      const listener = jest.fn();
      SurfaceDetection.subscribe(listener);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'idle' }),
      );
    });

    it('returns an unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = SurfaceDetection.subscribe(listener);
      expect(typeof unsubscribe).toBe('function');
      listener.mockClear();

      unsubscribe();
      SurfaceDetection.startScanning();
      jest.advanceTimersByTime(100);
      // Should NOT receive updates after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Scanning flow
  // --------------------------------------------------------------------------
  describe('startScanning', () => {
    it('transitions to scanning phase', () => {
      const states: DetectionState[] = [];
      SurfaceDetection.subscribe((s) => states.push(s));

      SurfaceDetection.startScanning();

      const scanningState = states.find((s) => s.phase === 'scanning');
      expect(scanningState).toBeDefined();
    });

    it('updates scan progress over time', () => {
      let lastState: DetectionState | null = null;
      SurfaceDetection.subscribe((s) => { lastState = s; });

      SurfaceDetection.startScanning();
      jest.advanceTimersByTime(1400); // ~50% through scan

      expect(lastState!.scanProgress).toBeGreaterThan(0);
      expect(lastState!.scanProgress).toBeLessThan(1);
    });

    it('transitions through detecting to ready', () => {
      const phases: string[] = [];
      SurfaceDetection.subscribe((s) => {
        if (!phases.length || phases[phases.length - 1] !== s.phase) {
          phases.push(s.phase);
        }
      });

      SurfaceDetection.startScanning();
      // Scanning duration + detection delay
      jest.advanceTimersByTime(4000);

      expect(phases).toContain('scanning');
      expect(phases).toContain('detecting');
      expect(phases).toContain('ready');
    });

    it('detects at least one plane when ready', () => {
      let lastState: DetectionState | null = null;
      SurfaceDetection.subscribe((s) => { lastState = s; });

      SurfaceDetection.startScanning();
      jest.advanceTimersByTime(4000);

      expect(lastState!.phase).toBe('ready');
      expect(lastState!.planes.length).toBeGreaterThanOrEqual(1);
    });

    it('sets a primary plane (horizontal floor)', () => {
      let lastState: DetectionState | null = null;
      SurfaceDetection.subscribe((s) => { lastState = s; });

      SurfaceDetection.startScanning();
      jest.advanceTimersByTime(4000);

      expect(lastState!.primaryPlane).not.toBeNull();
      expect(lastState!.primaryPlane!.type).toBe('horizontal');
      expect(lastState!.primaryPlane!.confidence).toBeGreaterThan(0.8);
    });

    it('does not start if not in idle phase', () => {
      SurfaceDetection.startScanning();
      const states: DetectionState[] = [];
      SurfaceDetection.subscribe((s) => states.push(s));
      states.length = 0;

      // Try starting again while scanning
      SurfaceDetection.startScanning();
      jest.advanceTimersByTime(100);

      // Should not reset — still in scanning
      const resetToIdle = states.find((s) => s.phase === 'idle');
      expect(resetToIdle).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Detected planes
  // --------------------------------------------------------------------------
  describe('detected planes', () => {
    it('planes have required fields', () => {
      let lastState: DetectionState | null = null;
      SurfaceDetection.subscribe((s) => { lastState = s; });

      SurfaceDetection.startScanning();
      jest.advanceTimersByTime(4000);

      for (const plane of lastState!.planes) {
        expect(plane.id).toBeTruthy();
        expect(['horizontal', 'vertical']).toContain(plane.type);
        expect(plane.confidence).toBeGreaterThanOrEqual(0);
        expect(plane.confidence).toBeLessThanOrEqual(1);
        expect(plane.center.x).toBeGreaterThanOrEqual(0);
        expect(plane.center.x).toBeLessThanOrEqual(1);
        expect(plane.center.y).toBeGreaterThanOrEqual(0);
        expect(plane.center.y).toBeLessThanOrEqual(1);
        expect(plane.extent.width).toBeGreaterThan(0);
        expect(plane.extent.depth).toBeGreaterThan(0);
        expect(plane.detectedAt).toBeGreaterThan(0);
      }
    });

    it('always detects at least one horizontal (floor) plane', () => {
      let lastState: DetectionState | null = null;
      SurfaceDetection.subscribe((s) => { lastState = s; });

      SurfaceDetection.startScanning();
      jest.advanceTimersByTime(4000);

      const horizontalPlanes = lastState!.planes.filter((p) => p.type === 'horizontal');
      expect(horizontalPlanes.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // Poor lighting
  // --------------------------------------------------------------------------
  describe('poor lighting simulation', () => {
    it('transitions to poor_lighting phase when simulated', () => {
      const phases: string[] = [];
      SurfaceDetection.subscribe((s) => {
        if (!phases.length || phases[phases.length - 1] !== s.phase) {
          phases.push(s.phase);
        }
      });

      SurfaceDetection._simulatePoorLighting(true);
      SurfaceDetection.startScanning();
      jest.advanceTimersByTime(3200); // Past scan duration

      expect(phases).toContain('poor_lighting');
    });

    it('auto-recovers from poor lighting and proceeds to ready', () => {
      let lastState: DetectionState | null = null;
      SurfaceDetection.subscribe((s) => { lastState = s; });

      SurfaceDetection._simulatePoorLighting(true);
      SurfaceDetection.startScanning();
      // Scan duration + poor light timeout + detect delay
      jest.advanceTimersByTime(8000);

      expect(lastState!.phase).toBe('ready');
    });
  });

  // --------------------------------------------------------------------------
  // Reset
  // --------------------------------------------------------------------------
  describe('reset', () => {
    it('returns to idle phase', () => {
      SurfaceDetection.startScanning();
      jest.advanceTimersByTime(4000);

      SurfaceDetection.reset();
      const state = SurfaceDetection.getState();

      expect(state.phase).toBe('idle');
      expect(state.planes).toEqual([]);
      expect(state.primaryPlane).toBeNull();
      expect(state.scanProgress).toBe(0);
    });

    it('notifies listeners of reset', () => {
      SurfaceDetection.startScanning();
      jest.advanceTimersByTime(4000);

      let lastState: DetectionState | null = null;
      SurfaceDetection.subscribe((s) => { lastState = s; });

      SurfaceDetection.reset();

      expect(lastState!.phase).toBe('idle');
    });
  });

  // --------------------------------------------------------------------------
  // stopScanning
  // --------------------------------------------------------------------------
  describe('stopScanning', () => {
    it('stops emitting progress updates', () => {
      let callCount = 0;
      SurfaceDetection.subscribe(() => { callCount++; });
      callCount = 0;

      SurfaceDetection.startScanning();
      jest.advanceTimersByTime(500);
      SurfaceDetection.stopScanning();
      const countAfterStop = callCount;

      jest.advanceTimersByTime(2000);
      // No more updates after stop
      expect(callCount).toBe(countAfterStop);
    });
  });
});
