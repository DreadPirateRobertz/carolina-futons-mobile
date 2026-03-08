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

  it('warns on 3+ consecutive slow frames (below 55fps)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useScrollPerformance('ShopScreen'));

    act(() => {
      mockNow = 0;
      result.current.onScrollBeginDrag();
    });

    // Simulate 3 consecutive slow frames (~20ms each = 50fps < 55fps threshold)
    for (let i = 0; i < 3; i++) {
      act(() => {
        mockNow += 20; // 20ms per frame = 50fps
        if (rafCallbacks.length > 0) {
          const cb = rafCallbacks[rafCallbacks.length - 1];
          cb(mockNow);
        }
      });
    }

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('FPS below 55 for 3 consecutive frames'),
    );

    warnSpy.mockRestore();
  });

  it('resets slow frame counter on fast frame', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useScrollPerformance('ShopScreen'));

    act(() => {
      mockNow = 0;
      result.current.onScrollBeginDrag();
    });

    // 2 slow frames
    for (let i = 0; i < 2; i++) {
      act(() => {
        mockNow += 20;
        if (rafCallbacks.length > 0) {
          rafCallbacks[rafCallbacks.length - 1](mockNow);
        }
      });
    }

    // 1 fast frame resets counter
    act(() => {
      mockNow += 10; // 10ms = 100fps, well above threshold
      if (rafCallbacks.length > 0) {
        rafCallbacks[rafCallbacks.length - 1](mockNow);
      }
    });

    // 2 more slow frames — should NOT warn (counter was reset)
    for (let i = 0; i < 2; i++) {
      act(() => {
        mockNow += 20;
        if (rafCallbacks.length > 0) {
          rafCallbacks[rafCallbacks.length - 1](mockNow);
        }
      });
    }

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
