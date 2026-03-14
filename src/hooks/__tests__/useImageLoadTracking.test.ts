/**
 * Tests for the useImageLoadTracking hook that measures image load performance.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useImageLoadTracking } from '../useImageLoadTracking';
import { perf } from '@/services/performance';

// Mock performance service
jest.mock('@/services/performance', () => ({
  perf: {
    recordRender: jest.fn(),
  },
}));

describe('useImageLoadTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns onLoadStart and onLoad callbacks', () => {
    const { result } = renderHook(() => useImageLoadTracking('ProductCard'));
    expect(typeof result.current.onLoadStart).toBe('function');
    expect(typeof result.current.onLoad).toBe('function');
  });

  it('tracks load duration when onLoadStart then onLoad are called', () => {
    const { result } = renderHook(() => useImageLoadTracking('ProductCard'));

    act(() => {
      (Date.now as jest.Mock).mockReturnValue(1000);
      result.current.onLoadStart();
    });

    act(() => {
      (Date.now as jest.Mock).mockReturnValue(1250);
      result.current.onLoad();
    });

    expect(perf.recordRender).toHaveBeenCalledWith('image_load:ProductCard', 250);
  });

  it('does not report if onLoad called without onLoadStart', () => {
    const { result } = renderHook(() => useImageLoadTracking('ProductCard'));

    act(() => {
      result.current.onLoad();
    });

    expect(perf.recordRender).not.toHaveBeenCalled();
  });

  it('returns isLoading state', () => {
    const { result } = renderHook(() => useImageLoadTracking('ProductCard'));

    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.onLoadStart();
    });
    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.onLoad();
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('handles multiple load cycles', () => {
    const { result } = renderHook(() => useImageLoadTracking('GridImage'));

    // First cycle
    act(() => {
      (Date.now as jest.Mock).mockReturnValue(1000);
      result.current.onLoadStart();
    });
    act(() => {
      (Date.now as jest.Mock).mockReturnValue(1100);
      result.current.onLoad();
    });

    // Second cycle
    act(() => {
      (Date.now as jest.Mock).mockReturnValue(2000);
      result.current.onLoadStart();
    });
    act(() => {
      (Date.now as jest.Mock).mockReturnValue(2050);
      result.current.onLoad();
    });

    expect(perf.recordRender).toHaveBeenCalledTimes(2);
    expect(perf.recordRender).toHaveBeenCalledWith('image_load:GridImage', 100);
    expect(perf.recordRender).toHaveBeenCalledWith('image_load:GridImage', 50);
  });

  it('returns loadDurationMs after load completes', () => {
    const { result } = renderHook(() => useImageLoadTracking('TestImage'));

    expect(result.current.loadDurationMs).toBeNull();

    act(() => {
      (Date.now as jest.Mock).mockReturnValue(1000);
      result.current.onLoadStart();
    });

    act(() => {
      (Date.now as jest.Mock).mockReturnValue(1300);
      result.current.onLoad();
    });

    expect(result.current.loadDurationMs).toBe(300);
  });
});
