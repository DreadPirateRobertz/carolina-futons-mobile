import { renderHook } from '@testing-library/react-native';
import { useRenderTracking } from '../useRenderTracking';
import { perf } from '@/services/performance';

jest.mock('@/services/performance', () => ({
  perf: {
    recordRender: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useRenderTracking', () => {
  it('returns a Profiler onRender callback', () => {
    const { result } = renderHook(() => useRenderTracking('ProductCard'));
    expect(typeof result.current).toBe('function');
  });

  it('calls perf.recordRender with component name and duration', () => {
    const { result } = renderHook(() => useRenderTracking('ProductCard'));

    // Simulate a Profiler callback
    result.current('ProductCard', 'mount', 12.5, 15, 100, 112.5);

    expect(perf.recordRender).toHaveBeenCalledWith('ProductCard', 12.5);
  });

  it('returns stable callback reference', () => {
    const { result, rerender } = renderHook(() => useRenderTracking('ProductCard'));
    const first = result.current;
    rerender({});
    expect(result.current).toBe(first);
  });
});
