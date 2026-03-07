import { renderHook, act } from '@testing-library/react-native';
import { useCartAnimation } from '../useCartAnimation';

describe('useCartAnimation', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useCartAnimation());
    expect(result.current.isAnimating).toBe(false);
    expect(result.current.scale.value).toBe(1);
    expect(result.current.opacity.value).toBe(1);
  });

  it('triggers animation and sets isAnimating', () => {
    const { result } = renderHook(() => useCartAnimation());
    act(() => result.current.trigger());
    expect(result.current.isAnimating).toBe(true);
  });

  it('calls onComplete callback after animation', () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();
    const { result } = renderHook(() => useCartAnimation({ onComplete }));
    act(() => result.current.trigger());
    act(() => jest.advanceTimersByTime(600));
    expect(onComplete).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('resets to idle after animation completes', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useCartAnimation());
    act(() => result.current.trigger());
    expect(result.current.isAnimating).toBe(true);
    act(() => jest.advanceTimersByTime(600));
    expect(result.current.isAnimating).toBe(false);
    jest.useRealTimers();
  });

  it('ignores trigger while already animating', () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();
    const { result } = renderHook(() => useCartAnimation({ onComplete }));
    act(() => result.current.trigger());
    act(() => result.current.trigger()); // second trigger ignored
    act(() => jest.advanceTimersByTime(600));
    expect(onComplete).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('accepts custom duration', () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();
    const { result } = renderHook(() =>
      useCartAnimation({ duration: 300, onComplete }),
    );
    act(() => result.current.trigger());
    act(() => jest.advanceTimersByTime(250));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(100));
    expect(onComplete).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('provides animated style object', () => {
    const { result } = renderHook(() => useCartAnimation());
    expect(result.current.animatedStyle).toBeDefined();
  });
});
