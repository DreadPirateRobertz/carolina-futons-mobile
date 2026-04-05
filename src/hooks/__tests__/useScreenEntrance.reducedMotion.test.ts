/**
 * useScreenEntrance — reduced motion path
 * Separate file so jest.mock can override useReducedMotion at module level.
 */
import { renderHook } from '@testing-library/react-native';

jest.mock('../useReducedMotion', () => ({ useReducedMotion: () => true }));

describe('useScreenEntrance — reduced motion', () => {
  it('isComplete is true immediately when reduced motion is enabled', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useScreenEntrance } = require('../useScreenEntrance');
    const { result } = renderHook(() => useScreenEntrance());
    expect(result.current.isComplete).toBe(true);
  });

  it('animatedStyle is defined when reduced motion is enabled', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useScreenEntrance } = require('../useScreenEntrance');
    const { result } = renderHook(() => useScreenEntrance());
    expect(result.current.animatedStyle).toBeDefined();
  });

  it('does not start an animation timer when reduced motion is enabled', () => {
    jest.useFakeTimers();
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useScreenEntrance } = require('../useScreenEntrance');
    renderHook(() => useScreenEntrance({ delay: 100, duration: 400 }));
    // With reduced motion the useEffect returns early without calling setTimeout
    const timerCallCounts = setTimeoutSpy.mock.calls.filter(
      ([, delay]) => typeof delay === 'number' && delay >= 100,
    ).length;
    expect(timerCallCounts).toBe(0);
    setTimeoutSpy.mockRestore();
    jest.useRealTimers();
  });
});
