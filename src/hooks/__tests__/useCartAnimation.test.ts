import { renderHook, act } from '@testing-library/react-native';
import { useCartAnimation } from '../useCartAnimation';

describe('useCartAnimation', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useCartAnimation());
    expect(result.current.isAnimating).toBe(false);
    expect(result.current.scale.value).toBe(1);
    expect(result.current.opacity.value).toBe(1);
  });

  it('triggers animation and sets isAnimating', async () => {
    const { result } = renderHook(() => useCartAnimation());
    await act(async () => result.current.trigger());
    expect(result.current.isAnimating).toBe(true);
  });

  it('calls onComplete callback after animation', async () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();
    const { result } = renderHook(() => useCartAnimation({ onComplete }));
    await act(async () => result.current.trigger());
    await act(async () => jest.advanceTimersByTime(600));
    expect(onComplete).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('resets to idle after animation completes', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useCartAnimation());
    await act(async () => result.current.trigger());
    expect(result.current.isAnimating).toBe(true);
    await act(async () => jest.advanceTimersByTime(600));
    expect(result.current.isAnimating).toBe(false);
    jest.useRealTimers();
  });

  it('ignores trigger while already animating', async () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();
    const { result } = renderHook(() => useCartAnimation({ onComplete }));
    await act(async () => result.current.trigger());
    await act(async () => result.current.trigger()); // second trigger ignored
    await act(async () => jest.advanceTimersByTime(600));
    expect(onComplete).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('accepts custom duration', async () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();
    const { result } = renderHook(() => useCartAnimation({ duration: 300, onComplete }));
    await act(async () => result.current.trigger());
    await act(async () => jest.advanceTimersByTime(250));
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(100));
    expect(onComplete).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('provides animated style object', () => {
    const { result } = renderHook(() => useCartAnimation());
    expect(result.current.animatedStyle).toBeDefined();
  });
});
