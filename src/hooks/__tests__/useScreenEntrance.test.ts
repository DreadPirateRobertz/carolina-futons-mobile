import { renderHook } from '@testing-library/react-native';
import { useScreenEntrance } from '../useScreenEntrance';

describe('useScreenEntrance', () => {
  it('returns an animated style object', () => {
    const { result } = renderHook(() => useScreenEntrance());
    expect(result.current.animatedStyle).toBeDefined();
  });

  it('provides opacity and transform in style', () => {
    const { result } = renderHook(() => useScreenEntrance());
    const style = result.current.animatedStyle;
    expect(style).toHaveProperty('opacity');
    expect(style).toHaveProperty('transform');
  });

  it('accepts custom delay and duration', () => {
    const { result } = renderHook(() => useScreenEntrance({ delay: 200, duration: 600 }));
    expect(result.current.animatedStyle).toBeDefined();
  });

  it('accepts custom translateY distance', () => {
    const { result } = renderHook(() => useScreenEntrance({ translateY: 30 }));
    expect(result.current.animatedStyle).toBeDefined();
  });

  it('returns isComplete flag', () => {
    const { result } = renderHook(() => useScreenEntrance());
    expect(typeof result.current.isComplete).toBe('boolean');
  });
});
