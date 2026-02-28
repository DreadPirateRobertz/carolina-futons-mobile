import { renderHook, act } from '@testing-library/react-native';
import { useFutonModels } from '../useFutonModels';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

describe('useFutonModels', () => {
  // --- List all models ---

  it('returns all futon models', () => {
    const { result } = renderHook(() => useFutonModels());
    expect(result.current.models).toEqual(FUTON_MODELS);
  });

  it('returns all fabrics', () => {
    const { result } = renderHook(() => useFutonModels());
    expect(result.current.fabrics).toEqual(FABRICS);
  });

  it('returns isLoading=false when using static fallback', () => {
    const { result } = renderHook(() => useFutonModels());
    expect(result.current.isLoading).toBe(false);
  });

  it('returns error=null on success', () => {
    const { result } = renderHook(() => useFutonModels());
    expect(result.current.error).toBeNull();
  });

  // --- Single model by ID ---

  it('getModel returns a model by ID', () => {
    const { result } = renderHook(() => useFutonModels());
    const model = result.current.getModel(FUTON_MODELS[0].id);
    expect(model).toEqual(FUTON_MODELS[0]);
  });

  it('getModel returns undefined for unknown ID', () => {
    const { result } = renderHook(() => useFutonModels());
    const model = result.current.getModel('nonexistent-model');
    expect(model).toBeUndefined();
  });

  // --- Single fabric by ID ---

  it('getFabric returns a fabric by ID', () => {
    const { result } = renderHook(() => useFutonModels());
    const fabric = result.current.getFabric(FABRICS[0].id);
    expect(fabric).toEqual(FABRICS[0]);
  });

  it('getFabric returns undefined for unknown ID', () => {
    const { result } = renderHook(() => useFutonModels());
    const fabric = result.current.getFabric('nonexistent-fabric');
    expect(fabric).toBeUndefined();
  });

  // --- Refresh ---

  it('returns a refresh function', () => {
    const { result } = renderHook(() => useFutonModels());
    expect(typeof result.current.refresh).toBe('function');
  });

  it('refresh does not throw', () => {
    const { result } = renderHook(() => useFutonModels());
    expect(() => result.current.refresh()).not.toThrow();
  });

  // --- Edge cases ---

  it('models array is not empty', () => {
    const { result } = renderHook(() => useFutonModels());
    expect(result.current.models.length).toBeGreaterThan(0);
  });

  it('every model has fabrics array', () => {
    const { result } = renderHook(() => useFutonModels());
    for (const model of result.current.models) {
      expect(Array.isArray(model.fabrics)).toBe(true);
      expect(model.fabrics.length).toBeGreaterThan(0);
    }
  });

  it('every model has dimensions with all required fields', () => {
    const { result } = renderHook(() => useFutonModels());
    for (const model of result.current.models) {
      expect(model.dimensions).toHaveProperty('width');
      expect(model.dimensions).toHaveProperty('depth');
      expect(model.dimensions).toHaveProperty('height');
      expect(model.dimensions).toHaveProperty('seatHeight');
    }
  });
});
