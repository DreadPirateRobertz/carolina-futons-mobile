import { renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from '../useReducedMotion';

describe('useReducedMotion', () => {
  let addListenerSpy: jest.SpyInstance;
  let isReduceMotionEnabledSpy: jest.SpyInstance;

  beforeEach(() => {
    addListenerSpy = jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({
      remove: jest.fn(),
    } as any);
    isReduceMotionEnabledSpy = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('defaults to false', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('reads system preference on mount', () => {
    renderHook(() => useReducedMotion());
    expect(isReduceMotionEnabledSpy).toHaveBeenCalled();
  });

  it('subscribes to reduceMotionChanged events', () => {
    renderHook(() => useReducedMotion());
    expect(addListenerSpy).toHaveBeenCalledWith(
      'reduceMotionChanged',
      expect.any(Function),
    );
  });

  it('cleans up listener on unmount', () => {
    const removeMock = jest.fn();
    addListenerSpy.mockReturnValue({ remove: removeMock });

    const { unmount } = renderHook(() => useReducedMotion());
    unmount();

    expect(removeMock).toHaveBeenCalled();
  });
});
