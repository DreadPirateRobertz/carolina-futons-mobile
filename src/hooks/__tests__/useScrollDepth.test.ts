import { renderHook, act } from '@testing-library/react-native';
import { useScrollDepth } from '../useScrollDepth';
import { getScrollBuffer, resetHeatmap, setHeatmapEnabled } from '@/services/heatmap';
import { clearEventBuffer } from '@/services/analytics';

beforeEach(() => {
  resetHeatmap();
  clearEventBuffer();
  setHeatmapEnabled(true);
});

describe('useScrollDepth', () => {
  function createScrollEvent(contentOffsetY: number, contentHeight: number, layoutHeight: number) {
    return {
      nativeEvent: {
        contentOffset: { y: contentOffsetY, x: 0 },
        contentSize: { height: contentHeight, width: 375 },
        layoutMeasurement: { height: layoutHeight, width: 375 },
      },
    } as any;
  }

  it('returns a scroll handler function', () => {
    const { result } = renderHook(() => useScrollDepth('TestScreen'));
    expect(typeof result.current).toBe('function');
  });

  it('tracks scroll depth when scrolled', () => {
    const { result } = renderHook(() => useScrollDepth('TestScreen'));

    act(() => {
      // Content is 2000px tall, viewport is 800px, scrolled to 600px
      // Depth = 600 / (2000 - 800) = 0.5
      result.current(createScrollEvent(600, 2000, 800));
    });

    const buffer = getScrollBuffer();
    expect(buffer.length).toBeGreaterThanOrEqual(1);
    const entry = buffer.find((e) => e.screen === 'TestScreen');
    expect(entry).toBeDefined();
    expect(entry!.maxDepth).toBe(0.5);
  });

  it('ignores non-scrollable content', () => {
    const { result } = renderHook(() => useScrollDepth('TestScreen'));

    act(() => {
      // Content fits in viewport — no scrollable height
      result.current(createScrollEvent(0, 800, 800));
    });

    const buffer = getScrollBuffer();
    expect(buffer.find((e) => e.screen === 'TestScreen')).toBeUndefined();
  });
});
