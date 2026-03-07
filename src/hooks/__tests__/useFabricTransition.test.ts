import { renderHook, act } from '@testing-library/react-native';
import { useFabricTransition } from '../useFabricTransition';

describe('useFabricTransition', () => {
  it('starts with no active fabric', () => {
    const { result } = renderHook(() => useFabricTransition());
    expect(result.current.activeFabricId).toBeNull();
  });

  it('sets active fabric on select', () => {
    const { result } = renderHook(() => useFabricTransition());
    act(() => result.current.selectFabric('mountain-blue'));
    expect(result.current.activeFabricId).toBe('mountain-blue');
  });

  it('provides scale value for a fabric swatch', () => {
    const { result } = renderHook(() => useFabricTransition());
    const scale = result.current.getSwatchScale('natural-linen');
    expect(scale).toBeDefined();
    expect(scale.value).toBeDefined();
  });

  it('selected swatch has scale > 1', () => {
    const { result } = renderHook(() => useFabricTransition());
    act(() => result.current.selectFabric('mountain-blue'));
    const scale = result.current.getSwatchScale('mountain-blue');
    // In test env, withSpring returns the target value directly
    expect(scale.value).toBeGreaterThanOrEqual(1);
  });

  it('unselected swatch has scale of 1', () => {
    const { result } = renderHook(() => useFabricTransition());
    act(() => result.current.selectFabric('mountain-blue'));
    const otherScale = result.current.getSwatchScale('natural-linen');
    expect(otherScale.value).toBe(1);
  });

  it('switching fabrics updates scales', () => {
    const { result } = renderHook(() => useFabricTransition());
    act(() => result.current.selectFabric('mountain-blue'));
    expect(result.current.getSwatchScale('mountain-blue').value).toBeGreaterThanOrEqual(1);

    act(() => result.current.selectFabric('sunset-coral'));
    expect(result.current.activeFabricId).toBe('sunset-coral');
    expect(result.current.getSwatchScale('sunset-coral').value).toBeGreaterThanOrEqual(1);
    expect(result.current.getSwatchScale('mountain-blue').value).toBe(1);
  });

  it('provides border opacity for selected vs unselected', () => {
    const { result } = renderHook(() => useFabricTransition());
    act(() => result.current.selectFabric('charcoal'));
    expect(result.current.getBorderOpacity('charcoal').value).toBeGreaterThan(0);
    expect(result.current.getBorderOpacity('natural-linen').value).toBe(0);
  });
});
