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
});
