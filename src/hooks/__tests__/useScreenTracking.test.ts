import { renderHook, act } from '@testing-library/react-native';

import { useScreenTracking } from '../useScreenTracking';
import { trackScreenView } from '@/services/analytics';

const mockGetCurrentRoute = jest.fn();
const mockNavigationRef = { getCurrentRoute: mockGetCurrentRoute };

jest.mock('@react-navigation/native', () => ({
  useNavigationContainerRef: () => mockNavigationRef,
}));

jest.mock('@/services/analytics', () => ({
  trackScreenView: jest.fn(),
}));

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

  it('sets initial route name on onReady', async () => {
    mockGetCurrentRoute.mockReturnValue({ name: 'Home' });
    const { result } = renderHook(() => useScreenTracking());
    await act(async () => result.current.onReady());
    // No tracking on ready — just stores the initial route
    expect(trackScreenView).not.toHaveBeenCalled();
  });

  it('tracks screen view when route changes', async () => {
    mockGetCurrentRoute.mockReturnValue({ name: 'Home' });
    const { result } = renderHook(() => useScreenTracking());

    await act(async () => result.current.onReady());

    mockGetCurrentRoute.mockReturnValue({ name: 'ProductDetail', params: { slug: 'asheville' } });
    await act(async () => result.current.onStateChange());

    expect(trackScreenView).toHaveBeenCalledWith('ProductDetail', { slug: 'asheville' });
  });

  it('does not track when route stays the same', async () => {
    mockGetCurrentRoute.mockReturnValue({ name: 'Home' });
    const { result } = renderHook(() => useScreenTracking());

    await act(async () => result.current.onReady());
    await act(async () => result.current.onStateChange());

    expect(trackScreenView).not.toHaveBeenCalled();
  });

  it('tracks multiple route changes', async () => {
    mockGetCurrentRoute.mockReturnValue({ name: 'Home' });
    const { result } = renderHook(() => useScreenTracking());

    await act(async () => result.current.onReady());

    mockGetCurrentRoute.mockReturnValue({ name: 'Category' });
    await act(async () => result.current.onStateChange());

    mockGetCurrentRoute.mockReturnValue({ name: 'ProductDetail' });
    await act(async () => result.current.onStateChange());

    expect(trackScreenView).toHaveBeenCalledTimes(2);
    expect(trackScreenView).toHaveBeenCalledWith('Category', undefined);
    expect(trackScreenView).toHaveBeenCalledWith('ProductDetail', undefined);
  });

  // ── cfutons_mobile-5t8: Verify every screen fires screen_view ──────────

  /**
   * All screen names from AppNavigator + TabNavigator.
   * Each one must fire a screen_view event when navigated to.
   * If a screen is added to the navigator but not here, this test
   * should be updated — it IS the analytics coverage contract.
   */
  const ALL_SCREENS = [
    // Tab screens
    'Home',
    'Shop',
    'Cart',
    'Account',
    // Stack screens
    'Onboarding',
    'Category',
    'Checkout',
    'PaymentConfirmation',
    'OrderSuccess',
    'OrderConfirmation',
    'OrderHistory',
    'OrderDetail',
    'Login',
    'SignUp',
    'ForgotPassword',
    'NotificationPreferences',
    'Wishlist',
    'StoreLocator',
    'StoreDetail',
    'Collections',
    'Premium',
    'StyleQuiz',
    'Search',
    'ProductDetail',
    'AR',
    'Compare',
    'Challenges',
    'Loyalty',
    'PointsHistory',
    'Rewards',
  ];

  it.each(ALL_SCREENS)('fires screen_view for %s screen', async (screenName) => {
    jest.clearAllMocks();
    mockGetCurrentRoute.mockReturnValue({ name: 'Home' });
    const { result } = renderHook(() => useScreenTracking());

    await act(async () => result.current.onReady());

    mockGetCurrentRoute.mockReturnValue({ name: screenName });
    await act(async () => result.current.onStateChange());

    if (screenName === 'Home') {
      // Home is the initial route — onReady sets it, so onStateChange
      // with the same name doesn't fire a new event.
      expect(trackScreenView).not.toHaveBeenCalled();
    } else {
      expect(trackScreenView).toHaveBeenCalledTimes(1);
      expect(trackScreenView).toHaveBeenCalledWith(screenName, undefined);
    }
  });

  it('tracks the complete navigation funnel: Home → Shop → ProductDetail → Cart → Checkout', async () => {
    mockGetCurrentRoute.mockReturnValue({ name: 'Home' });
    const { result } = renderHook(() => useScreenTracking());
    await act(async () => result.current.onReady());

    const funnel = ['Shop', 'ProductDetail', 'Cart', 'Checkout'];
    for (const screen of funnel) {
      mockGetCurrentRoute.mockReturnValue({ name: screen });
      await act(async () => result.current.onStateChange());
    }

    expect(trackScreenView).toHaveBeenCalledTimes(4);
    expect(trackScreenView).toHaveBeenNthCalledWith(1, 'Shop', undefined);
    expect(trackScreenView).toHaveBeenNthCalledWith(2, 'ProductDetail', undefined);
    expect(trackScreenView).toHaveBeenNthCalledWith(3, 'Cart', undefined);
    expect(trackScreenView).toHaveBeenNthCalledWith(4, 'Checkout', undefined);
  });

  it('includes route params in screen_view events', async () => {
    mockGetCurrentRoute.mockReturnValue({ name: 'Home' });
    const { result } = renderHook(() => useScreenTracking());
    await act(async () => result.current.onReady());

    mockGetCurrentRoute.mockReturnValue({
      name: 'ProductDetail',
      params: { slug: 'asheville-futon', sku: 'AF-001' },
    });
    await act(async () => result.current.onStateChange());

    expect(trackScreenView).toHaveBeenCalledWith('ProductDetail', {
      slug: 'asheville-futon',
      sku: 'AF-001',
    });
  });
});
