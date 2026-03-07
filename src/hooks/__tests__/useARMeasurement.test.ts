import { renderHook, act } from '@testing-library/react-native';
import { useARMeasurement } from '../useARMeasurement';

describe('useARMeasurement', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useARMeasurement());
    expect(result.current.state).toBe('idle');
    expect(result.current.points).toHaveLength(0);
    expect(result.current.distanceMeters).toBe(0);
    expect(result.current.distanceDisplay).toBe('');
  });

  it('transitions to placing-first on activate', () => {
    const { result } = renderHook(() => useARMeasurement());
    act(() => result.current.activate());
    expect(result.current.state).toBe('placing-first');
  });

  it('places first endpoint on tap', () => {
    const { result } = renderHook(() => useARMeasurement());
    act(() => result.current.activate());
    act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
    expect(result.current.points).toHaveLength(1);
    expect(result.current.state).toBe('placing-second');
  });

  it('calculates distance after two points', () => {
    const { result } = renderHook(() => useARMeasurement());
    act(() => result.current.activate());
    act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
    act(() => result.current.placePoint({ x: 1, y: 0, z: 0 }));
    expect(result.current.state).toBe('measured');
    expect(result.current.distanceMeters).toBeCloseTo(1.0);
    // 1 meter = 39.37 inches = 3 feet 3.37 inches
    expect(result.current.distanceDisplay).toBe("3' 3\"");
  });

  it('calculates 3D diagonal distance', () => {
    const { result } = renderHook(() => useARMeasurement());
    act(() => result.current.activate());
    act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
    act(() => result.current.placePoint({ x: 3, y: 0, z: 4 })); // 3-4-5 triangle = 5m
    expect(result.current.distanceMeters).toBeCloseTo(5.0);
  });

  it('reports fit when model width is less than measured distance', () => {
    const { result } = renderHook(() => useARMeasurement());
    act(() => result.current.activate());
    act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
    act(() => result.current.placePoint({ x: 2, y: 0, z: 0 })); // 2m
    // A futon that's 1.6m wide should fit in 2m
    expect(result.current.checkFit({ width: 1.6, depth: 0.8, height: 0.4 })).toBe(true);
  });

  it('reports no fit when model width exceeds measured distance', () => {
    const { result } = renderHook(() => useARMeasurement());
    act(() => result.current.activate());
    act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
    act(() => result.current.placePoint({ x: 1, y: 0, z: 0 })); // 1m
    // A futon that's 1.6m wide should NOT fit in 1m
    expect(result.current.checkFit({ width: 1.6, depth: 0.8, height: 0.4 })).toBe(false);
  });

  it('returns null for checkFit when not measured', () => {
    const { result } = renderHook(() => useARMeasurement());
    expect(result.current.checkFit({ width: 1.6, depth: 0.8, height: 0.4 })).toBeNull();
  });

  it('resets on deactivate', () => {
    const { result } = renderHook(() => useARMeasurement());
    act(() => result.current.activate());
    act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
    act(() => result.current.deactivate());
    expect(result.current.state).toBe('idle');
    expect(result.current.points).toHaveLength(0);
    expect(result.current.distanceMeters).toBe(0);
  });

  it('allows re-measurement after reset', () => {
    const { result } = renderHook(() => useARMeasurement());
    act(() => result.current.activate());
    act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
    act(() => result.current.placePoint({ x: 1, y: 0, z: 0 }));
    expect(result.current.state).toBe('measured');

    act(() => result.current.reset());
    expect(result.current.state).toBe('placing-first');
    expect(result.current.points).toHaveLength(0);
  });

  it('ignores placePoint when idle', () => {
    const { result } = renderHook(() => useARMeasurement());
    act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
    expect(result.current.points).toHaveLength(0);
  });

  it('ignores placePoint when already measured', () => {
    const { result } = renderHook(() => useARMeasurement());
    act(() => result.current.activate());
    act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
    act(() => result.current.placePoint({ x: 1, y: 0, z: 0 }));
    act(() => result.current.placePoint({ x: 2, y: 0, z: 0 })); // ignored
    expect(result.current.points).toHaveLength(2);
  });

  // ===========================================================================
  // Accuracy Validation
  // ===========================================================================
  describe('measurement accuracy', () => {
    it('handles zero distance (identical points)', () => {
      const { result } = renderHook(() => useARMeasurement());
      act(() => result.current.activate());
      act(() => result.current.placePoint({ x: 1.5, y: 0.2, z: 3.0 }));
      act(() => result.current.placePoint({ x: 1.5, y: 0.2, z: 3.0 }));
      expect(result.current.distanceMeters).toBe(0);
      expect(result.current.distanceDisplay).toBe("0' 0\"");
    });

    it('handles very small distances (10cm = ~4 inches)', () => {
      const { result } = renderHook(() => useARMeasurement());
      act(() => result.current.activate());
      act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
      act(() => result.current.placePoint({ x: 0.1, y: 0, z: 0 }));
      expect(result.current.distanceMeters).toBeCloseTo(0.1);
      expect(result.current.distanceDisplay).toBe("0' 4\"");
    });

    it('handles large room distances (5m = ~16 feet)', () => {
      const { result } = renderHook(() => useARMeasurement());
      act(() => result.current.activate());
      act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
      act(() => result.current.placePoint({ x: 5, y: 0, z: 0 }));
      expect(result.current.distanceMeters).toBeCloseTo(5.0);
      // 5m = 196.85" = 16' 4.85" -> rounds to 16' 5"
      expect(result.current.distanceDisplay).toBe("16' 5\"");
    });

    // Real futon dimensions as meters for fit testing
    // Asheville Full: 54" W = 1.3716m
    it('correctly fits Asheville (54" = 1.3716m) in a 5-foot (1.524m) space', () => {
      const { result } = renderHook(() => useARMeasurement());
      act(() => result.current.activate());
      act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
      act(() => result.current.placePoint({ x: 1.524, y: 0, z: 0 })); // 5 feet
      const ashevilleWidth = 54 / 39.3701; // inches to meters
      expect(result.current.checkFit({ width: ashevilleWidth, depth: 0.8, height: 0.4 })).toBe(true);
    });

    // Blue Ridge Queen: 60" W = 1.524m
    it('correctly reports Blue Ridge (60" = 1.524m) fits exactly in 5-foot space', () => {
      const { result } = renderHook(() => useARMeasurement());
      act(() => result.current.activate());
      act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
      act(() => result.current.placePoint({ x: 1.524, y: 0, z: 0 })); // 5 feet
      const blueRidgeWidth = 60 / 39.3701;
      // Exact same size should still fit (<=)
      expect(result.current.checkFit({ width: blueRidgeWidth, depth: 0.9, height: 0.4 })).toBe(true);
    });

    // Blue Ridge should NOT fit in 4.5 feet
    it('correctly reports Blue Ridge does not fit in 4.5-foot space', () => {
      const { result } = renderHook(() => useARMeasurement());
      act(() => result.current.activate());
      act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
      act(() => result.current.placePoint({ x: 1.3716, y: 0, z: 0 })); // 4.5 feet = 54"
      const blueRidgeWidth = 60 / 39.3701; // 60" in meters
      expect(result.current.checkFit({ width: blueRidgeWidth, depth: 0.9, height: 0.4 })).toBe(false);
    });

    it('handles negative coordinates correctly', () => {
      const { result } = renderHook(() => useARMeasurement());
      act(() => result.current.activate());
      act(() => result.current.placePoint({ x: -2, y: 0, z: -1 }));
      act(() => result.current.placePoint({ x: 1, y: 0, z: 3 }));
      // distance = sqrt(9 + 0 + 16) = sqrt(25) = 5
      expect(result.current.distanceMeters).toBeCloseTo(5.0);
    });

    it('includes Y-axis in distance calculation (multi-height points)', () => {
      const { result } = renderHook(() => useARMeasurement());
      act(() => result.current.activate());
      act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
      act(() => result.current.placePoint({ x: 0, y: 2, z: 0 })); // purely vertical
      expect(result.current.distanceMeters).toBeCloseTo(2.0);
    });

    it('displays exact feet with no remaining inches', () => {
      const { result } = renderHook(() => useARMeasurement());
      act(() => result.current.activate());
      act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
      // 6 feet = 72 inches = 1.8288m
      act(() => result.current.placePoint({ x: 1.8288, y: 0, z: 0 }));
      expect(result.current.distanceDisplay).toBe("6' 0\"");
    });

    it('conversion precision: 2.54m = exactly 100 inches = 8 feet 4 inches', () => {
      const { result } = renderHook(() => useARMeasurement());
      act(() => result.current.activate());
      act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
      act(() => result.current.placePoint({ x: 2.54, y: 0, z: 0 }));
      // 2.54m = 100 inches = 8'4"
      expect(result.current.distanceDisplay).toBe("8' 4\"");
    });

    it('never displays 12 inches (rolls over to next foot)', () => {
      const { result } = renderHook(() => useARMeasurement());
      act(() => result.current.activate());
      act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
      // 0.293m ≈ 11.54 inches — remainder rounds to 12, must roll over to 1' 0"
      act(() => result.current.placePoint({ x: 0.293, y: 0, z: 0 }));
      expect(result.current.distanceDisplay).toBe("1' 0\"");
    });

    it('handles rounding at foot boundary (23.7 inches)', () => {
      const { result } = renderHook(() => useARMeasurement());
      act(() => result.current.activate());
      act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
      // 23.7 inches = 1' 11.7" → rounds to 2' 0"
      const meters = 23.7 / 39.3701;
      act(() => result.current.placePoint({ x: meters, y: 0, z: 0 }));
      expect(result.current.distanceDisplay).toBe("2' 0\"");
    });
  });
});
