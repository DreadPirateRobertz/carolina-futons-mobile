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

  // --- Boundary conditions ---

  it('every model has a valid basePrice > 0', () => {
    const { result } = renderHook(() => useFutonModels());
    for (const model of result.current.models) {
      expect(model.basePrice).toBeGreaterThan(0);
    }
  });

  it('every fabric has a color hex string', () => {
    const { result } = renderHook(() => useFutonModels());
    for (const fabric of result.current.fabrics) {
      expect(fabric.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('every fabric has a non-negative price', () => {
    const { result } = renderHook(() => useFutonModels());
    for (const fabric of result.current.fabrics) {
      expect(fabric.price).toBeGreaterThanOrEqual(0);
    }
  });

  it('getModel with empty string returns undefined', () => {
    const { result } = renderHook(() => useFutonModels());
    expect(result.current.getModel('')).toBeUndefined();
  });

  it('getFabric with empty string returns undefined', () => {
    const { result } = renderHook(() => useFutonModels());
    expect(result.current.getFabric('')).toBeUndefined();
  });

  it('all model IDs are unique', () => {
    const { result } = renderHook(() => useFutonModels());
    const ids = result.current.models.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all fabric IDs are unique', () => {
    const { result } = renderHook(() => useFutonModels());
    const ids = result.current.fabrics.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('model dimensions are positive numbers', () => {
    const { result } = renderHook(() => useFutonModels());
    for (const model of result.current.models) {
      expect(model.dimensions.width).toBeGreaterThan(0);
      expect(model.dimensions.depth).toBeGreaterThan(0);
      expect(model.dimensions.height).toBeGreaterThan(0);
      expect(model.dimensions.seatHeight).toBeGreaterThan(0);
    }
  });
});
