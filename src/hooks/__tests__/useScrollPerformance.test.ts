import { renderHook, act } from '@testing-library/react-native';
import { useScrollPerformance } from '../useScrollPerformance';
import { perf } from '@/services/performance';

jest.mock('@/services/performance', () => ({
  perf: {
    startScrollSession: jest.fn(() => ({
      id: 'scroll_1',
      screenName: 'TestScreen',
      startTime: Date.now(),
      endTime: null,
      totalFrames: 0,
      droppedFrames: 0,
      worstFrameMs: 0,
      avgFps: 60,
      samples: [],
    })),
    recordFrame: jest.fn(),
    endScrollSession: jest.fn(),
  },
}));

// Mock requestAnimationFrame/cancelAnimationFrame
let rafCallbacks: Array<(time: number) => void> = [];
let rafId = 0;
(globalThis as Record<string, unknown>).requestAnimationFrame = (cb: (time: number) => void) => {
  rafCallbacks.push(cb);
  return ++rafId;
};
(globalThis as Record<string, unknown>).cancelAnimationFrame = () => {
  rafCallbacks = [];
};

// Mock performance.now
let mockNow = 0;
(globalThis as Record<string, unknown>).performance = { now: () => mockNow };

beforeEach(() => {
  jest.clearAllMocks();
  rafCallbacks = [];
  mockNow = 0;
});

describe('useScrollPerformance', () => {
  it('starts a scroll session on begin drag', () => {
    const { result } = renderHook(() => useScrollPerformance('ShopScreen'));

    act(() => {
      result.current.onScrollBeginDrag();
    });

    expect(perf.startScrollSession).toHaveBeenCalledWith('ShopScreen');
  });

  it('ends session on momentum scroll end', () => {
    const { result } = renderHook(() => useScrollPerformance('ShopScreen'));

    act(() => {
      result.current.onScrollBeginDrag();
    });

    act(() => {
      result.current.onMomentumScrollEnd();
    });

    expect(perf.endScrollSession).toHaveBeenCalled();
  });

  it('records frames during scrolling', () => {
    const { result } = renderHook(() => useScrollPerformance('ShopScreen'));

    act(() => {
      mockNow = 0;
      result.current.onScrollBeginDrag();
    });

    // Simulate a raf tick
    act(() => {
      mockNow = 16;
      if (rafCallbacks.length > 0) {
        rafCallbacks[0](mockNow);
      }
    });

    expect(perf.recordFrame).toHaveBeenCalled();
  });
});
