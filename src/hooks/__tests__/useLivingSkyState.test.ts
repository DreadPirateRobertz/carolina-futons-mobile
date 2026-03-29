// src/hooks/__tests__/useLivingSkyState.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useLivingSkyState } from '../useLivingSkyState';

jest.useFakeTimers();

describe('useLivingSkyState', () => {
  it('returns a LivingSkyState with all required fields', () => {
    const { result } = renderHook(() => useLivingSkyState());
    const state = result.current;
    expect(state.skyColors).toHaveLength(4);
    expect(state.ridgeColors).toHaveProperty('r1');
    expect(typeof state.weatherLabel).toBe('string');
    expect(typeof state.sunPos.opacity).toBe('number');
  });

  it('refreshes state when a minute elapses', () => {
    const { result } = renderHook(() => useLivingSkyState());
    const initial = result.current.weatherLabel;
    // Advance 60 s — should re-compute (even if the label is identical it re-runs)
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    // Hook should not throw and state should be a valid object
    expect(result.current.skyColors).toHaveLength(4);
    expect(result.current.weatherLabel).toBeTruthy();
  });

  it('cleans up interval on unmount', () => {
    const clearSpy = jest.spyOn(global, 'clearInterval');
    const { unmount } = renderHook(() => useLivingSkyState());
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('accepts isCFPlus option', () => {
    const regular = renderHook(() => useLivingSkyState({ isCFPlus: false }));
    const premium = renderHook(() => useLivingSkyState({ isCFPlus: true }));
    // Both should return valid state objects
    expect(regular.result.current.skyColors).toHaveLength(4);
    expect(premium.result.current.skyColors).toHaveLength(4);
  });
});
