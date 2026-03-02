import { renderHook, act } from '@testing-library/react-native';
import { useSpringPress } from '../useSpringPress';

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actual,
    useSharedValue: (init: number) => ({ value: init }),
    useAnimatedStyle: (fn: () => any) => fn(),
    withSpring: (toValue: number) => toValue,
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

import * as Haptics from 'expo-haptics';

describe('useSpringPress', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns animatedStyle, onPressIn, onPressOut', () => {
    const { result } = renderHook(() => useSpringPress());
    expect(result.current.animatedStyle).toBeDefined();
    expect(typeof result.current.onPressIn).toBe('function');
    expect(typeof result.current.onPressOut).toBe('function');
  });

  it('triggers haptic on pressIn (default: light)', () => {
    const { result } = renderHook(() => useSpringPress());
    act(() => result.current.onPressIn());
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('triggers selection haptic when configured', () => {
    const { result } = renderHook(() => useSpringPress({ haptic: 'selection' }));
    act(() => result.current.onPressIn());
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('does not trigger haptic when haptic is none', () => {
    const { result } = renderHook(() => useSpringPress({ haptic: 'none' }));
    act(() => result.current.onPressIn());
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
});
