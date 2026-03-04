import { renderHook, act } from '@testing-library/react-native';

const mockGetCurrentRoute = jest.fn();
const mockNavigationRef = { getCurrentRoute: mockGetCurrentRoute };

jest.mock('@react-navigation/native', () => ({
  useNavigationContainerRef: () => mockNavigationRef,
}));

jest.mock('@/services/analytics', () => ({
  trackScreenView: jest.fn(),
}));

import { useScreenTracking } from '../useScreenTracking';
import { trackScreenView } from '@/services/analytics';

describe('useScreenTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns navigationRef, onStateChange, and onReady', () => {
    const { result } = renderHook(() => useScreenTracking());
    expect(result.current.navigationRef).toBeDefined();
    expect(typeof result.current.onStateChange).toBe('function');
    expect(typeof result.current.onReady).toBe('function');
  });

  it('sets initial route name on onReady', () => {
    mockGetCurrentRoute.mockReturnValue({ name: 'Home' });
    const { result } = renderHook(() => useScreenTracking());
    act(() => result.current.onReady());
    // No tracking on ready — just stores the initial route
    expect(trackScreenView).not.toHaveBeenCalled();
  });

  it('tracks screen view when route changes', () => {
    mockGetCurrentRoute.mockReturnValue({ name: 'Home' });
    const { result } = renderHook(() => useScreenTracking());

    act(() => result.current.onReady());

    mockGetCurrentRoute.mockReturnValue({ name: 'ProductDetail', params: { slug: 'asheville' } });
    act(() => result.current.onStateChange());

    expect(trackScreenView).toHaveBeenCalledWith('ProductDetail', { slug: 'asheville' });
  });

  it('does not track when route stays the same', () => {
    mockGetCurrentRoute.mockReturnValue({ name: 'Home' });
    const { result } = renderHook(() => useScreenTracking());

    act(() => result.current.onReady());
    act(() => result.current.onStateChange());

    expect(trackScreenView).not.toHaveBeenCalled();
  });

  it('tracks multiple route changes', () => {
    mockGetCurrentRoute.mockReturnValue({ name: 'Home' });
    const { result } = renderHook(() => useScreenTracking());

    act(() => result.current.onReady());

    mockGetCurrentRoute.mockReturnValue({ name: 'Category' });
    act(() => result.current.onStateChange());

    mockGetCurrentRoute.mockReturnValue({ name: 'ProductDetail' });
    act(() => result.current.onStateChange());

    expect(trackScreenView).toHaveBeenCalledTimes(2);
    expect(trackScreenView).toHaveBeenCalledWith('Category', undefined);
    expect(trackScreenView).toHaveBeenCalledWith('ProductDetail', undefined);
  });
});
