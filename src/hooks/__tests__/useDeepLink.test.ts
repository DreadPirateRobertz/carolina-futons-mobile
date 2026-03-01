import { renderHook, act } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import { useDeepLink } from '../useDeepLink';
import { consumePendingDeepLink } from '@/services/deepLink';

jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(),
  createURL: jest.fn((path: string) => `carolinafutons://${path}`),
}));

jest.mock('@/services/deepLink', () => {
  const actual = jest.requireActual('@/services/deepLink');
  return {
    ...actual,
    consumePendingDeepLink: jest.fn(),
    storePendingDeepLink: jest.fn(),
  };
});

const mockGetInitialURL = Linking.getInitialURL as jest.Mock;
const mockAddEventListener = Linking.addEventListener as jest.Mock;
const mockConsumePending = consumePendingDeepLink as jest.Mock;

describe('useDeepLink', () => {
  let removeListener: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    removeListener = jest.fn();
    mockAddEventListener.mockReturnValue({ remove: removeListener });
    mockGetInitialURL.mockResolvedValue(null);
    mockConsumePending.mockReturnValue(null);
  });

  describe('initial state', () => {
    it('returns null lastUrl initially', () => {
      const { result } = renderHook(() => useDeepLink());
      expect(result.current.lastUrl).toBeNull();
    });

    it('returns null lastRoute initially', () => {
      const { result } = renderHook(() => useDeepLink());
      expect(result.current.lastRoute).toBeNull();
    });

    it('returns null lastUtm initially', () => {
      const { result } = renderHook(() => useDeepLink());
      expect(result.current.lastUtm).toBeNull();
    });
  });

  describe('initial URL handling', () => {
    it('processes initial URL when app opens from deep link', async () => {
      mockGetInitialURL.mockResolvedValue('carolinafutons://product/asheville-full');
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      expect(result.current.lastUrl).toBe('carolinafutons://product/asheville-full');
      expect(result.current.lastRoute).toEqual({
        screen: 'ProductDetail',
        params: { slug: 'asheville-full' },
      });
    });

    it('processes universal link initial URL', async () => {
      mockGetInitialURL.mockResolvedValue('https://carolinafutons.com/category/frames');
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      expect(result.current.lastUrl).toBe('https://carolinafutons.com/category/frames');
      expect(result.current.lastRoute).toEqual({
        screen: 'Category',
        params: { slug: 'frames' },
      });
    });

    it('extracts UTM params from initial URL', async () => {
      mockGetInitialURL.mockResolvedValue(
        'https://carolinafutons.com/shop?utm_source=email&utm_medium=newsletter&utm_campaign=spring',
      );
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      expect(result.current.lastUtm).toEqual({
        source: 'email',
        medium: 'newsletter',
        campaign: 'spring',
        content: null,
        term: null,
      });
    });

    it('handles null initial URL gracefully', async () => {
      mockGetInitialURL.mockResolvedValue(null);
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      expect(result.current.lastUrl).toBeNull();
      expect(result.current.lastRoute).toBeNull();
    });

    it('handles getInitialURL error gracefully', async () => {
      mockGetInitialURL.mockRejectedValue(new Error('Native module error'));
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      expect(result.current.lastUrl).toBeNull();
    });
  });

  describe('foreground link handling', () => {
    it('registers URL event listener', () => {
      renderHook(() => useDeepLink());
      expect(mockAddEventListener).toHaveBeenCalledWith('url', expect.any(Function));
    });

    it('processes incoming links while app is in foreground', async () => {
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      const urlHandler = mockAddEventListener.mock.calls[0][1];
      act(() => {
        urlHandler({ url: 'carolinafutons://orders/ord-456' });
      });

      expect(result.current.lastUrl).toBe('carolinafutons://orders/ord-456');
      expect(result.current.lastRoute).toEqual({
        screen: 'OrderDetail',
        params: { orderId: 'ord-456' },
      });
    });

    it('updates state on each new link', async () => {
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      const urlHandler = mockAddEventListener.mock.calls[0][1];

      act(() => {
        urlHandler({ url: 'carolinafutons://cart' });
      });
      expect(result.current.lastRoute).toEqual({ screen: 'Cart' });

      act(() => {
        urlHandler({ url: 'carolinafutons://wishlist' });
      });
      expect(result.current.lastRoute).toEqual({ screen: 'Wishlist' });
    });

    it('removes event listener on unmount', () => {
      const { unmount } = renderHook(() => useDeepLink());
      unmount();
      expect(removeListener).toHaveBeenCalled();
    });
  });

  describe('deferred deep link handling', () => {
    it('processes pending deep link on mount', async () => {
      mockConsumePending.mockReturnValue('carolinafutons://product/test-product');
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      expect(result.current.lastUrl).toBe('carolinafutons://product/test-product');
      expect(result.current.lastRoute).toEqual({
        screen: 'ProductDetail',
        params: { slug: 'test-product' },
      });
    });

    it('prioritizes initial URL over deferred link', async () => {
      mockGetInitialURL.mockResolvedValue('carolinafutons://cart');
      mockConsumePending.mockReturnValue('carolinafutons://shop');
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      // Initial URL takes priority
      expect(result.current.lastUrl).toBe('carolinafutons://cart');
      expect(result.current.lastRoute).toEqual({ screen: 'Cart' });
    });

    it('falls back to deferred link when no initial URL', async () => {
      mockGetInitialURL.mockResolvedValue(null);
      mockConsumePending.mockReturnValue('carolinafutons://wishlist');
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      expect(result.current.lastUrl).toBe('carolinafutons://wishlist');
    });
  });

  describe('route resolution', () => {
    it('resolves product deep link', async () => {
      mockGetInitialURL.mockResolvedValue('carolinafutons://product/asheville-full');
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      expect(result.current.lastRoute).toEqual({
        screen: 'ProductDetail',
        params: { slug: 'asheville-full' },
      });
    });

    it('resolves category deep link', async () => {
      mockGetInitialURL.mockResolvedValue('carolinafutons://category/frames');
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      expect(result.current.lastRoute).toEqual({
        screen: 'Category',
        params: { slug: 'frames' },
      });
    });

    it('resolves order tracking deep link', async () => {
      mockGetInitialURL.mockResolvedValue('carolinafutons://orders/track-123');
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      expect(result.current.lastRoute).toEqual({
        screen: 'OrderDetail',
        params: { orderId: 'track-123' },
      });
    });

    it('resolves order history deep link', async () => {
      mockGetInitialURL.mockResolvedValue('carolinafutons://orders');
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      expect(result.current.lastRoute).toEqual({ screen: 'OrderHistory' });
    });

    it('resolves store deep link with ID', async () => {
      mockGetInitialURL.mockResolvedValue('carolinafutons://stores/charlotte');
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      expect(result.current.lastRoute).toEqual({
        screen: 'StoreDetail',
        params: { storeId: 'charlotte' },
      });
    });

    it('resolves unknown path to NotFound', async () => {
      mockGetInitialURL.mockResolvedValue('carolinafutons://invalid/route');
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      expect(result.current.lastRoute).toEqual({
        screen: 'NotFound',
        params: { path: 'invalid/route' },
      });
    });
  });

  describe('onDeepLink callback', () => {
    it('calls onDeepLink callback when initial URL is processed', async () => {
      const onDeepLink = jest.fn();
      mockGetInitialURL.mockResolvedValue('carolinafutons://product/test');

      renderHook(() => useDeepLink({ onDeepLink }));
      await act(async () => {});

      expect(onDeepLink).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'product/test',
          raw: 'carolinafutons://product/test',
        }),
        expect.objectContaining({
          screen: 'ProductDetail',
          params: { slug: 'test' },
        }),
      );
    });

    it('calls onDeepLink callback for foreground links', async () => {
      const onDeepLink = jest.fn();
      renderHook(() => useDeepLink({ onDeepLink }));
      await act(async () => {});

      const urlHandler = mockAddEventListener.mock.calls[0][1];
      act(() => {
        urlHandler({ url: 'carolinafutons://cart' });
      });

      expect(onDeepLink).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'cart' }),
        expect.objectContaining({ screen: 'Cart' }),
      );
    });

    it('does not call onDeepLink when no URL', async () => {
      const onDeepLink = jest.fn();
      mockGetInitialURL.mockResolvedValue(null);
      mockConsumePending.mockReturnValue(null);

      renderHook(() => useDeepLink({ onDeepLink }));
      await act(async () => {});

      expect(onDeepLink).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('ignores empty string URLs', async () => {
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      const urlHandler = mockAddEventListener.mock.calls[0][1];
      act(() => {
        urlHandler({ url: '' });
      });

      expect(result.current.lastUrl).toBeNull();
    });

    it('handles URL with special characters in slug', async () => {
      mockGetInitialURL.mockResolvedValue(
        'carolinafutons://product/asheville-full-frame%20special',
      );
      const { result } = renderHook(() => useDeepLink());
      await act(async () => {});

      expect(result.current.lastUrl).toBe(
        'carolinafutons://product/asheville-full-frame%20special',
      );
    });

    it('handles concurrent mount/unmount cycles', () => {
      const { unmount: u1 } = renderHook(() => useDeepLink());
      const { unmount: u2 } = renderHook(() => useDeepLink());
      u1();
      u2();
      // Should not throw — each listener is independently cleaned up
      expect(removeListener).toHaveBeenCalledTimes(2);
    });
  });
});
