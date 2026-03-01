import { renderHook, act } from '@testing-library/react-native';
import { useScreenTracking } from '../useScreenTracking';
import { getEventBuffer, clearEventBuffer, setEnabled } from '@/services/analytics';

beforeEach(() => {
  clearEventBuffer();
  setEnabled(true);
});

describe('useScreenTracking', () => {
  function createMockNavRef(routeName: string) {
    return {
      current: {
        getCurrentRoute: () => ({ name: routeName, params: {} }),
      },
    } as never;
  }

  it('tracks screen view on onReady', () => {
    const navRef = createMockNavRef('Home');
    const { result } = renderHook(() => useScreenTracking(navRef));

    act(() => {
      result.current.onReady();
    });

    const buffer = getEventBuffer();
    expect(buffer).toHaveLength(1);
    expect(buffer[0].name).toBe('screen_view');
    expect(buffer[0].properties).toMatchObject({ screen_name: 'Home' });
  });

  it('tracks screen view on state change', () => {
    const navRef = {
      current: {
        getCurrentRoute: jest.fn()
          .mockReturnValueOnce({ name: 'Home', params: {} })
          .mockReturnValueOnce({ name: 'ProductDetail', params: { slug: 'asheville' } }),
      },
    } as never;

    const { result } = renderHook(() => useScreenTracking(navRef));

    act(() => {
      result.current.onReady();
    });

    act(() => {
      result.current.onStateChange();
    });

    const buffer = getEventBuffer();
    expect(buffer).toHaveLength(2);
    expect(buffer[1].properties).toMatchObject({ screen_name: 'ProductDetail' });
  });

  it('does not track duplicate consecutive screen views', () => {
    const navRef = createMockNavRef('Home');
    const { result } = renderHook(() => useScreenTracking(navRef));

    act(() => {
      result.current.onReady();
    });

    act(() => {
      result.current.onStateChange();
    });

    expect(getEventBuffer()).toHaveLength(1);
  });
});
