/**
 * E2E Smoke Test Suite for Beta Launch
 *
 * Lightweight integration tests covering critical user flows:
 * 1. Browse → Product Detail → Add to Cart → Checkout
 * 2. Login → Account → Order History
 * 3. Search → Filter → Select Product
 * 4. Deep link routing for all major screens
 * 5. AR screen launch (mock camera)
 *
 * Uses @testing-library/react-native with mocked screens to validate
 * navigation flows, cart operations, deep link resolution, and auth gating.
 *
 * @bead cm-1hla
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CartProvider, useCart, type CartItem } from '@/hooks/useCart';
import { FUTON_MODELS, FABRICS } from '@/data/futons';
import { calculateTotals } from '@/services/payment';
import { parseDeepLink, resolveRoute, type DeepLinkRoute } from '@/services/deepLink';

// ── Global mock overrides ──────────────────────────────────────────

// Use real navigation (override jest.setup.js mock)
jest.mock('@react-navigation/native', () => jest.requireActual('@react-navigation/native'));

// Reanimated
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      ScrollView: RN.ScrollView,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: () => any) => fn(),
    useAnimatedScrollHandler: () => jest.fn(),
    withSpring: (v: any) => v,
    withTiming: (v: any) => v,
    withDelay: (_d: number, v: any) => v,
    withSequence: (...args: any[]) => args[args.length - 1],
    interpolate: (v: any) => v,
    Extrapolation: { CLAMP: 'clamp' },
    Easing: { in: jest.fn((e) => e), out: jest.fn((e) => e), bezier: jest.fn() },
    FadeIn: { duration: () => ({ delay: () => ({}) }) },
    FadeOut: { duration: () => ({}) },
    SlideInRight: { duration: () => ({}) },
    SlideOutLeft: { duration: () => ({}) },
  };
});

// Haptics
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'Medium', Light: 'Light' },
  NotificationFeedbackType: { Success: 'Success', Error: 'Error' },
}));

// Theme
jest.mock('@/theme', () => {
  const actual = jest.requireActual('@/theme/tokens');
  return {
    useTheme: () => ({
      colors: {
        sandBase: '#E8D5B7',
        sandLight: '#F5F0EB',
        espresso: '#3A2518',
        espressoLight: '#B8A99A',
        sunsetCoral: '#E8845C',
        cream: '#F5F0EB',
        mountainBlue: '#5B8FA8',
        white: '#FFFFFF',
        errorRed: '#D32F2F',
        successGreen: '#388E3C',
      },
      spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
      borderRadius: { button: 8, card: 12, sm: 4, md: 8, lg: 12 },
      shadows: { card: {}, button: {} },
      typography: actual.typography,
    }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// ScreenErrorBoundary passthrough
jest.mock('@/components/ScreenErrorBoundary', () => ({
  ScreenErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

// Analytics
const mockAnalytics = {
  viewProduct: jest.fn(),
  selectFabric: jest.fn(),
  addToCart: jest.fn(),
  beginCheckout: jest.fn(),
  purchase: jest.fn(),
  trackScreenView: jest.fn(),
};
jest.mock('@/services/analytics', () => ({
  events: mockAnalytics,
  trackEvent: jest.fn(),
  trackScreenView: jest.fn(),
}));

// Premium
jest.mock('@/hooks/usePremium', () => ({
  PremiumProvider: ({ children }: any) => children,
  usePremium: () => ({
    isPremium: false,
    isLoading: false,
    offerings: [],
    error: null,
    purchase: jest.fn(),
    restore: jest.fn(),
    refreshStatus: jest.fn(),
  }),
}));

// Connectivity
jest.mock('@/hooks/useConnectivity', () => ({
  useConnectivity: () => ({ isOnline: true, setOnline: jest.fn() }),
  ConnectivityProvider: ({ children }: any) => children,
}));

// AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Crash reporting
jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

// Offline sync
jest.mock('@/hooks/useOfflineSync', () => ({
  useOfflineSync: () => ({ queueAction: jest.fn(), pendingCount: 0 }),
}));

// Recently viewed
jest.mock('@/hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({ addItem: jest.fn(), items: [] }),
}));

// Stripe
jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: () => ({
    initPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
    presentPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
  }),
  usePlatformPay: () => ({
    isPlatformPaySupported: jest.fn().mockResolvedValue(false),
    confirmPlatformPayPayment: jest.fn().mockResolvedValue({ error: null }),
  }),
  PlatformPay: {
    PaymentType: { Immediate: 'Immediate' },
    ButtonType: { Pay: 'Pay' },
    ButtonStyle: { Black: 'Black' },
  },
  StripeProvider: ({ children }: { children: React.ReactNode }) => children,
  PlatformPayButton: () => null,
  CardField: () => null,
}));

// Wix
jest.mock('@/services/wix', () => ({
  useWixClient: () => ({
    createPaymentIntent: jest.fn().mockResolvedValue({
      clientSecret: 'pi_test',
      paymentIntentId: 'pi_123',
    }),
    confirmOrder: jest.fn().mockResolvedValue({
      orderId: 'order_smoke_1',
      orderNumber: 'CF-SMOKE',
    }),
  }),
  WixApiError: class extends Error {},
}));

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => null,
}));

jest.mock('@/services/wix/config', () => ({
  getWixConfig: () => ({ siteId: 'test', apiKey: 'test' }),
  isWixConfigured: () => false,
}));

// ── Test data ──────────────────────────────────────────────────────

const TEST_MODEL = FUTON_MODELS[0];
const TEST_FABRIC = FABRICS[0];

// ── Mock screens ───────────────────────────────────────────────────

function MockScreen({ testID, label }: { testID: string; label: string }) {
  return (
    <View testID={testID}>
      <Text>{label}</Text>
    </View>
  );
}

/** Cart-aware screen that simulates browse → add to cart → checkout */
function MockShopWithCart() {
  const cart = useCart();
  return (
    <View testID="shop-screen">
      <Text>Shop</Text>
      <Text testID="cart-count">{cart.itemCount}</Text>
      <Text testID="cart-subtotal">{cart.subtotal}</Text>
      <TouchableOpacity
        testID="add-to-cart-btn"
        onPress={() => cart.addItem(TEST_MODEL, TEST_FABRIC, 1)}
      >
        <Text>Add to Cart</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="add-premium-btn"
        onPress={() => cart.addItem(TEST_MODEL, FABRICS[2], 1)}
      >
        <Text>Add Premium</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="clear-cart-btn" onPress={cart.clearCart}>
        <Text>Clear</Text>
      </TouchableOpacity>
      {cart.items.map((item: CartItem) => (
        <View key={item.id} testID={`item-${item.id}`}>
          <Text testID={`item-name-${item.id}`}>{item.model.name}</Text>
          <Text testID={`item-qty-${item.id}`}>{item.quantity}</Text>
        </View>
      ))}
    </View>
  );
}

/** Mock login screen with auth simulation */
function MockLoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <View testID="login-screen">
      <Text>Login</Text>
      <TouchableOpacity testID="login-submit-btn" onPress={onLogin}>
        <Text>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

/** Mock account screen showing user state */
function MockAccountScreen({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <View testID="account-screen">
      <Text testID="auth-status">{isLoggedIn ? 'logged-in' : 'logged-out'}</Text>
      {isLoggedIn && (
        <TouchableOpacity testID="view-orders-btn">
          <Text>Order History</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Navigation harnesses ───────────────────────────────────────────

const Stack = createNativeStackNavigator();

/** Full app navigator with mock screens for smoke testing */
function SmokeTestNavigator({ initialRoute = 'Home' }: { initialRoute?: string }) {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  return (
    <CartProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
          <Stack.Screen name="Home">
            {() => <MockScreen testID="home-screen" label="Home" />}
          </Stack.Screen>
          <Stack.Screen name="Shop">{() => <MockShopWithCart />}</Stack.Screen>
          <Stack.Screen name="ProductDetail">
            {() => <MockScreen testID="product-detail-screen" label="ProductDetail" />}
          </Stack.Screen>
          <Stack.Screen name="Cart">{() => <MockShopWithCart />}</Stack.Screen>
          <Stack.Screen name="Checkout">
            {() => <MockScreen testID="checkout-screen" label="Checkout" />}
          </Stack.Screen>
          <Stack.Screen name="OrderConfirmation">
            {() => <MockScreen testID="order-confirmation-screen" label="OrderConfirmation" />}
          </Stack.Screen>
          <Stack.Screen name="Login">
            {() => <MockLoginScreen onLogin={() => setIsLoggedIn(true)} />}
          </Stack.Screen>
          <Stack.Screen name="Account">
            {() => <MockAccountScreen isLoggedIn={isLoggedIn} />}
          </Stack.Screen>
          <Stack.Screen name="OrderHistory">
            {() => <MockScreen testID="order-history-screen" label="OrderHistory" />}
          </Stack.Screen>
          <Stack.Screen name="OrderDetail">
            {() => <MockScreen testID="order-detail-screen" label="OrderDetail" />}
          </Stack.Screen>
          <Stack.Screen name="Category">
            {() => <MockScreen testID="category-screen" label="Category" />}
          </Stack.Screen>
          <Stack.Screen name="AR">
            {() => <MockScreen testID="ar-screen" label="AR" />}
          </Stack.Screen>
          <Stack.Screen name="Wishlist">
            {() => <MockScreen testID="wishlist-screen" label="Wishlist" />}
          </Stack.Screen>
          <Stack.Screen name="Collections">
            {() => <MockScreen testID="collections-screen" label="Collections" />}
          </Stack.Screen>
          <Stack.Screen name="CollectionDetail">
            {() => <MockScreen testID="collection-detail-screen" label="CollectionDetail" />}
          </Stack.Screen>
          <Stack.Screen name="StoreLocator">
            {() => <MockScreen testID="store-locator-screen" label="StoreLocator" />}
          </Stack.Screen>
          <Stack.Screen name="SignUp">
            {() => <MockScreen testID="signup-screen" label="SignUp" />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </CartProvider>
  );
}

// ── Tests ──────────────────────────────────────────────────────────

describe('E2E Smoke Tests — Beta Launch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================================================================
  // Flow 1: Browse → Product Detail → Add to Cart → Checkout
  // ================================================================

  describe('Flow 1: Browse → Cart → Checkout', () => {
    it('navigates from Home to Shop', async () => {
      const ref = React.createRef<any>();
      const { getByTestId } = render(
        <CartProvider>
          <NavigationContainer ref={ref}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Home">
                {() => <MockScreen testID="home-screen" label="Home" />}
              </Stack.Screen>
              <Stack.Screen name="Shop">{() => <MockShopWithCart />}</Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>,
      );

      expect(getByTestId('home-screen')).toBeTruthy();
      act(() => ref.current?.navigate('Shop'));
      await waitFor(() => expect(getByTestId('shop-screen')).toBeTruthy());
    });

    it('navigates from Shop to ProductDetail', async () => {
      const ref = React.createRef<any>();
      const { getByTestId } = render(
        <CartProvider>
          <NavigationContainer ref={ref}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Shop">{() => <MockShopWithCart />}</Stack.Screen>
              <Stack.Screen name="ProductDetail">
                {() => <MockScreen testID="product-detail-screen" label="ProductDetail" />}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>,
      );

      expect(getByTestId('shop-screen')).toBeTruthy();
      act(() => ref.current?.navigate('ProductDetail', { slug: 'asheville-full' }));
      await waitFor(() => expect(getByTestId('product-detail-screen')).toBeTruthy());
    });

    it('adds item to cart and navigates to checkout', async () => {
      const ref = React.createRef<any>();
      const { getByTestId } = render(
        <CartProvider>
          <NavigationContainer ref={ref}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Shop">{() => <MockShopWithCart />}</Stack.Screen>
              <Stack.Screen name="Checkout">
                {() => <MockScreen testID="checkout-screen" label="Checkout" />}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>,
      );

      await act(async () => {});
      expect(getByTestId('cart-count').props.children).toBe(0);

      await act(async () => {
        fireEvent.press(getByTestId('add-to-cart-btn'));
      });
      expect(getByTestId('cart-count').props.children).toBe(1);
      expect(getByTestId('cart-subtotal').props.children).toBe(TEST_MODEL.basePrice);

      act(() => ref.current?.navigate('Checkout'));
      await waitFor(() => expect(getByTestId('checkout-screen')).toBeTruthy());
    });

    it('calculates correct totals with shipping and tax', () => {
      const totals = calculateTotals(TEST_MODEL.basePrice);
      expect(totals.shipping).toBe(49); // Below $499 threshold
      expect(totals.tax).toBeCloseTo(TEST_MODEL.basePrice * 0.07, 2);
      expect(totals.total).toBeCloseTo(TEST_MODEL.basePrice + 49 + TEST_MODEL.basePrice * 0.07, 2);
    });

    it('applies free shipping at $499+ threshold', () => {
      const totals = calculateTotals(500);
      expect(totals.shipping).toBe(0);
    });

    it('adds premium fabric upcharge to cart subtotal', async () => {
      const { getByTestId } = render(
        <CartProvider>
          <MockShopWithCart />
        </CartProvider>,
      );

      await act(async () => {});
      await act(async () => {
        fireEvent.press(getByTestId('add-premium-btn'));
      });

      const expectedPrice = TEST_MODEL.basePrice + FABRICS[2].price;
      expect(getByTestId('cart-subtotal').props.children).toBe(expectedPrice);
    });

    it('clears cart completely', async () => {
      const { getByTestId } = render(
        <CartProvider>
          <MockShopWithCart />
        </CartProvider>,
      );

      await act(async () => {});
      await act(async () => {
        fireEvent.press(getByTestId('add-to-cart-btn'));
      });
      expect(getByTestId('cart-count').props.children).toBe(1);

      await act(async () => {
        fireEvent.press(getByTestId('clear-cart-btn'));
      });
      expect(getByTestId('cart-count').props.children).toBe(0);
    });

    it('increments quantity when same item added twice', async () => {
      const { getByTestId } = render(
        <CartProvider>
          <MockShopWithCart />
        </CartProvider>,
      );

      await act(async () => {});
      await act(async () => {
        fireEvent.press(getByTestId('add-to-cart-btn'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('add-to-cart-btn'));
      });
      expect(getByTestId('cart-count').props.children).toBe(2);
    });
  });

  // ================================================================
  // Flow 2: Login → Account → Order History
  // ================================================================

  describe('Flow 2: Login → Account → Order History', () => {
    it('shows logged-out state on Account screen', async () => {
      const ref = React.createRef<any>();
      const { getByTestId } = render(<SmokeTestNavigator initialRoute="Account" />);

      await waitFor(() => {
        expect(getByTestId('account-screen')).toBeTruthy();
        expect(getByTestId('auth-status').props.children).toBe('logged-out');
      });
    });

    it('navigates to Login from Account', async () => {
      const ref = React.createRef<any>();
      const { getByTestId } = render(
        <CartProvider>
          <NavigationContainer ref={ref}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Account">
                {() => <MockAccountScreen isLoggedIn={false} />}
              </Stack.Screen>
              <Stack.Screen name="Login">
                {() => <MockScreen testID="login-screen" label="Login" />}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>,
      );

      expect(getByTestId('account-screen')).toBeTruthy();
      act(() => ref.current?.navigate('Login'));
      await waitFor(() => expect(getByTestId('login-screen')).toBeTruthy());
    });

    it('navigates Account → OrderHistory', async () => {
      const ref = React.createRef<any>();
      const { getByTestId } = render(
        <CartProvider>
          <NavigationContainer ref={ref}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Account">
                {() => <MockAccountScreen isLoggedIn={true} />}
              </Stack.Screen>
              <Stack.Screen name="OrderHistory">
                {() => <MockScreen testID="order-history-screen" label="OrderHistory" />}
              </Stack.Screen>
              <Stack.Screen name="OrderDetail">
                {() => <MockScreen testID="order-detail-screen" label="OrderDetail" />}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>,
      );

      expect(getByTestId('account-screen')).toBeTruthy();
      expect(getByTestId('view-orders-btn')).toBeTruthy();

      act(() => ref.current?.navigate('OrderHistory'));
      await waitFor(() => expect(getByTestId('order-history-screen')).toBeTruthy());
    });

    it('navigates OrderHistory → OrderDetail', async () => {
      const ref = React.createRef<any>();
      const { getByTestId } = render(
        <CartProvider>
          <NavigationContainer ref={ref}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="OrderHistory">
                {() => <MockScreen testID="order-history-screen" label="OrderHistory" />}
              </Stack.Screen>
              <Stack.Screen name="OrderDetail">
                {() => <MockScreen testID="order-detail-screen" label="OrderDetail" />}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>,
      );

      expect(getByTestId('order-history-screen')).toBeTruthy();
      act(() => ref.current?.navigate('OrderDetail', { orderId: 'ord-123' }));
      await waitFor(() => expect(getByTestId('order-detail-screen')).toBeTruthy());
    });
  });

  // ================================================================
  // Flow 3: Search → Filter → Select Product
  // ================================================================

  describe('Flow 3: Category filter → Product selection', () => {
    it('navigates Shop → Category (filter)', async () => {
      const ref = React.createRef<any>();
      const { getByTestId } = render(
        <CartProvider>
          <NavigationContainer ref={ref}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Shop">{() => <MockShopWithCart />}</Stack.Screen>
              <Stack.Screen name="Category">
                {() => <MockScreen testID="category-screen" label="Category" />}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>,
      );

      expect(getByTestId('shop-screen')).toBeTruthy();
      act(() => ref.current?.navigate('Category', { slug: 'living-room' }));
      await waitFor(() => expect(getByTestId('category-screen')).toBeTruthy());
    });

    it('navigates Category → ProductDetail', async () => {
      const ref = React.createRef<any>();
      const { getByTestId } = render(
        <CartProvider>
          <NavigationContainer ref={ref}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Category">
                {() => <MockScreen testID="category-screen" label="Category" />}
              </Stack.Screen>
              <Stack.Screen name="ProductDetail">
                {() => <MockScreen testID="product-detail-screen" label="ProductDetail" />}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>,
      );

      expect(getByTestId('category-screen')).toBeTruthy();
      act(() => ref.current?.navigate('ProductDetail', { slug: 'asheville-full' }));
      await waitFor(() => expect(getByTestId('product-detail-screen')).toBeTruthy());
    });

    it('navigates through Collections → CollectionDetail', async () => {
      const ref = React.createRef<any>();
      const { getByTestId } = render(
        <CartProvider>
          <NavigationContainer ref={ref}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Collections">
                {() => <MockScreen testID="collections-screen" label="Collections" />}
              </Stack.Screen>
              <Stack.Screen name="CollectionDetail">
                {() => <MockScreen testID="collection-detail-screen" label="CollectionDetail" />}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>,
      );

      expect(getByTestId('collections-screen')).toBeTruthy();
      act(() => ref.current?.navigate('CollectionDetail', { slug: 'bestsellers' }));
      await waitFor(() => expect(getByTestId('collection-detail-screen')).toBeTruthy());
    });
  });

  // ================================================================
  // Flow 4: Deep Link Routing
  // ================================================================

  describe('Flow 4: Deep link routing for all major screens', () => {
    const deepLinkCases: Array<{
      url: string;
      expectedScreen: string;
      expectedParams?: Record<string, string>;
    }> = [
      { url: 'carolinafutons://home', expectedScreen: 'Home' },
      { url: 'carolinafutons://shop', expectedScreen: 'Shop' },
      { url: 'carolinafutons://cart', expectedScreen: 'Cart' },
      { url: 'carolinafutons://account', expectedScreen: 'Account' },
      { url: 'carolinafutons://checkout', expectedScreen: 'Checkout' },
      { url: 'carolinafutons://login', expectedScreen: 'Login' },
      { url: 'carolinafutons://signup', expectedScreen: 'SignUp' },
      { url: 'carolinafutons://ar', expectedScreen: 'AR' },
      { url: 'carolinafutons://wishlist', expectedScreen: 'Wishlist' },
      { url: 'carolinafutons://orders', expectedScreen: 'OrderHistory' },
      { url: 'carolinafutons://stores', expectedScreen: 'StoreLocator' },
      { url: 'carolinafutons://collections', expectedScreen: 'Collections' },
      { url: 'carolinafutons://notifications', expectedScreen: 'NotificationPreferences' },
      {
        url: 'carolinafutons://product/asheville-full',
        expectedScreen: 'ProductDetail',
        expectedParams: { slug: 'asheville-full' },
      },
      {
        url: 'carolinafutons://category/living-room',
        expectedScreen: 'Category',
        expectedParams: { slug: 'living-room' },
      },
      {
        url: 'carolinafutons://orders/ord-abc-123',
        expectedScreen: 'OrderDetail',
        expectedParams: { orderId: 'ord-abc-123' },
      },
      {
        url: 'carolinafutons://collections/bestsellers',
        expectedScreen: 'CollectionDetail',
        expectedParams: { slug: 'bestsellers' },
      },
      {
        url: 'carolinafutons://stores/store-001',
        expectedScreen: 'StoreDetail',
        expectedParams: { storeId: 'store-001' },
      },
    ];

    it.each(deepLinkCases)(
      'resolves $url → $expectedScreen',
      ({ url, expectedScreen, expectedParams }) => {
        const parsed = parseDeepLink(url);
        const route = resolveRoute(parsed);
        expect(route.screen).toBe(expectedScreen);
        if (expectedParams) {
          expect((route as any).params).toEqual(expectedParams);
        }
      },
    );

    it('normalizes /products/ alias to ProductDetail', () => {
      const parsed = parseDeepLink('carolinafutons://products/blue-ridge-queen');
      const route = resolveRoute(parsed);
      expect(route.screen).toBe('ProductDetail');
      expect((route as any).params.slug).toBe('blue-ridge-queen');
    });

    it('handles universal link format', () => {
      const parsed = parseDeepLink('https://carolinafutons.com/product/asheville-full');
      const route = resolveRoute(parsed);
      expect(route.screen).toBe('ProductDetail');
      expect((route as any).params.slug).toBe('asheville-full');
    });

    it('handles universal link with www prefix', () => {
      const parsed = parseDeepLink('https://www.carolinafutons.com/shop');
      const route = resolveRoute(parsed);
      expect(route.screen).toBe('Shop');
    });

    it('preserves UTM params through deep link', () => {
      const parsed = parseDeepLink(
        'carolinafutons://product/asheville-full?utm_source=email&utm_campaign=spring',
      );
      expect(parsed.utm).not.toBeNull();
      expect(parsed.utm!.source).toBe('email');
      expect(parsed.utm!.campaign).toBe('spring');
    });

    it('returns NotFound for unknown deep link paths', () => {
      const parsed = parseDeepLink('carolinafutons://unknown/path');
      const route = resolveRoute(parsed);
      expect(route.screen).toBe('NotFound');
    });

    it('falls back to Shop when /product/ has no slug', () => {
      const parsed = parseDeepLink('carolinafutons://product');
      const route = resolveRoute(parsed);
      expect(route.screen).toBe('Shop');
    });

    it('falls back to Shop when /category/ has no slug', () => {
      const parsed = parseDeepLink('carolinafutons://category');
      const route = resolveRoute(parsed);
      expect(route.screen).toBe('Shop');
    });

    it('renders correct screen via NavigationContainer initialState', async () => {
      const { getByTestId } = render(
        <CartProvider>
          <NavigationContainer
            initialState={{
              routes: [
                { name: 'Home' },
                { name: 'ProductDetail', params: { slug: 'asheville-full' } },
              ],
              index: 1,
            }}
          >
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Home">
                {() => <MockScreen testID="home-screen" label="Home" />}
              </Stack.Screen>
              <Stack.Screen name="ProductDetail">
                {() => <MockScreen testID="product-detail-screen" label="ProductDetail" />}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>,
      );

      await waitFor(() => expect(getByTestId('product-detail-screen')).toBeTruthy());
    });
  });

  // ================================================================
  // Flow 5: AR Screen Launch
  // ================================================================

  describe('Flow 5: AR screen launch', () => {
    it('navigates from Home to AR screen', async () => {
      const ref = React.createRef<any>();
      const { getByTestId } = render(
        <CartProvider>
          <NavigationContainer ref={ref}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Home">
                {() => <MockScreen testID="home-screen" label="Home" />}
              </Stack.Screen>
              <Stack.Screen name="AR">
                {() => <MockScreen testID="ar-screen" label="AR" />}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>,
      );

      expect(getByTestId('home-screen')).toBeTruthy();
      act(() => ref.current?.navigate('AR'));
      await waitFor(() => expect(getByTestId('ar-screen')).toBeTruthy());
    });

    it('navigates from ProductDetail to AR', async () => {
      const ref = React.createRef<any>();
      const { getByTestId } = render(
        <CartProvider>
          <NavigationContainer ref={ref}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="ProductDetail">
                {() => <MockScreen testID="product-detail-screen" label="ProductDetail" />}
              </Stack.Screen>
              <Stack.Screen name="AR">
                {() => <MockScreen testID="ar-screen" label="AR" />}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>,
      );

      expect(getByTestId('product-detail-screen')).toBeTruthy();
      act(() => ref.current?.navigate('AR'));
      await waitFor(() => expect(getByTestId('ar-screen')).toBeTruthy());
    });

    it('can navigate back from AR to previous screen', async () => {
      const ref = React.createRef<any>();
      const { getByTestId } = render(
        <CartProvider>
          <NavigationContainer ref={ref}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Home">
                {() => <MockScreen testID="home-screen" label="Home" />}
              </Stack.Screen>
              <Stack.Screen name="AR">
                {() => <MockScreen testID="ar-screen" label="AR" />}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>,
      );

      act(() => ref.current?.navigate('AR'));
      await waitFor(() => expect(getByTestId('ar-screen')).toBeTruthy());

      act(() => ref.current?.goBack());
      await waitFor(() => expect(getByTestId('home-screen')).toBeTruthy());
    });

    it('resolves AR deep link correctly', () => {
      const parsed = parseDeepLink('carolinafutons://ar');
      const route = resolveRoute(parsed);
      expect(route.screen).toBe('AR');
    });
  });
});
