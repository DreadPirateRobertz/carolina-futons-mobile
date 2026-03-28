import React from 'react';
import { View, Text } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from '../TabNavigator';

// Use real @react-navigation/native (override jest.setup.js mock)
jest.mock('@react-navigation/native', () => jest.requireActual('@react-navigation/native'));

// Mock reanimated (needed by AnimatedTabBar)
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => fn(),
    withSpring: (val: any) => val,
  };
});

// Mock expo-haptics (needed by AnimatedTabBar)
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

// Mock ScreenErrorBoundary to pass through children
jest.mock('@/components/ScreenErrorBoundary', () => ({
  ScreenErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

// --- Screen mocks (simple Views with testIDs) ---

jest.mock('@/screens/HomeScreen', () => ({
  HomeScreen: () => <MockScreen testID="home-screen" label="HomeContent" />,
}));

jest.mock('@/screens/ShopScreen', () => ({
  ShopScreen: () => <MockScreen testID="shop-screen" label="ShopContent" />,
}));

jest.mock('@/screens/CartScreen', () => ({
  CartScreen: () => <MockScreen testID="cart-screen" label="CartContent" />,
}));

jest.mock('@/screens/AccountScreen', () => ({
  AccountScreen: () => <MockScreen testID="account-screen" label="AccountContent" />,
}));

jest.mock('@/screens/PaymentConfirmationScreen', () => {
  const React = require('react');
  const { View, TouchableOpacity } = require('react-native');
  return {
    PaymentConfirmationScreen: ({
      onRetry,
      onSuccess,
    }: {
      onRetry?: () => void;
      onSuccess: () => void;
    }) =>
      React.createElement(
        View,
        { testID: 'payment-confirmation-screen' },
        React.createElement(TouchableOpacity, { testID: 'retry-btn', onPress: onRetry }),
        React.createElement(TouchableOpacity, { testID: 'continue-btn', onPress: onSuccess }),
      ),
  };
});

jest.mock('@/screens/OrderSuccessScreen', () => ({
  OrderSuccessScreen: () => <MockScreen testID="order-success-screen" label="OrderSuccess" />,
}));

// --- Hook mocks ---

const mockCartState = {
  itemCount: 0,
  items: [],
  subtotal: 0,
  addItem: jest.fn(),
  removeItem: jest.fn(),
  updateQuantity: jest.fn(),
  clearCart: jest.fn(),
};
jest.mock('@/components/CompareFAB', () => ({
  CompareFAB: () => null,
}));
jest.mock('@/components/CartFAB', () => ({
  CartFAB: () => null,
}));

jest.mock('@/hooks/useCart', () => ({
  useCart: () => mockCartState,
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sunsetCoral: '#E8845C',
      espressoLight: '#B8A99A',
      espresso: '#4A3728',
      cream: '#F5F0EB',
    },
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function MockScreen({ testID, label }: { testID: string; label: string }) {
  return (
    <View testID={testID}>
      <Text>{label}</Text>
    </View>
  );
}

// Test-only stack navigator — mirrors AppNavigator's route structure without
// React.lazy (which requires --experimental-vm-modules in Jest).
const Stack = createNativeStackNavigator();

function TestAppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Tabs">
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="ProductDetail">
        {() => <MockScreen testID="product-detail-screen" label="ProductDetail" />}
      </Stack.Screen>
      <Stack.Screen name="Category">
        {() => <MockScreen testID="category-screen" label="Category" />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

describe('Tab Navigation', () => {
  beforeEach(() => {
    mockCartState.itemCount = 0;
  });

  describe('tab bar rendering', () => {
    it('renders Home tab', () => {
      const { getByText } = render(
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>,
      );
      expect(getByText('Home')).toBeTruthy();
    });

    it('renders Shop tab', () => {
      const { getByText } = render(
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>,
      );
      expect(getByText('Shop')).toBeTruthy();
    });

    it('renders Cart tab', () => {
      const { getByText } = render(
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>,
      );
      expect(getByText('Cart')).toBeTruthy();
    });

    it('renders Account tab', () => {
      const { getByText } = render(
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>,
      );
      expect(getByText('Account')).toBeTruthy();
    });
  });

  describe('tab navigation', () => {
    it('starts on Home tab by default', () => {
      const { getByTestId } = render(
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>,
      );
      expect(getByTestId('home-screen')).toBeTruthy();
    });

    it('navigates to Shop tab when tapped', async () => {
      const { getByTestId } = render(
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>,
      );
      fireEvent.press(getByTestId('tab-Shop'));
      await waitFor(() => {
        expect(getByTestId('shop-screen')).toBeTruthy();
      });
    });

    it('navigates to Cart tab when tapped', async () => {
      const { getByTestId } = render(
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>,
      );
      fireEvent.press(getByTestId('tab-Cart'));
      await waitFor(() => {
        expect(getByTestId('cart-screen')).toBeTruthy();
      });
    });

    it('navigates to Account tab when tapped', async () => {
      const { getByTestId } = render(
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>,
      );
      fireEvent.press(getByTestId('tab-Account'));
      await waitFor(() => {
        expect(getByTestId('account-screen')).toBeTruthy();
      });
    });
  });

  describe('cart badge in tab bar', () => {
    it('shows cart item count badge when cart has items', () => {
      mockCartState.itemCount = 3;
      const { getByText } = render(
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>,
      );
      // AnimatedTabBar renders the badge count as text
      expect(getByText('3')).toBeTruthy();
    });

    it('hides badge when cart is empty', () => {
      mockCartState.itemCount = 0;
      const { queryByText } = render(
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>,
      );
      // No badge text should render
      expect(queryByText('0')).toBeFalsy();
    });
  });
});

describe('Stack Navigation', () => {
  describe('product detail navigation', () => {
    it('navigates to product detail screen', async () => {
      const ref = React.createRef<any>();
      const { getByTestId } = render(
        <NavigationContainer ref={ref}>
          <TestAppNavigator />
        </NavigationContainer>,
      );
      // Verify we start on the tabs/home screen
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
      // Navigate to ProductDetail programmatically
      await act(async () => {
        ref.current?.navigate('ProductDetail', { slug: 'futon-001' });
      });
      await waitFor(() => {
        expect(getByTestId('product-detail-screen')).toBeTruthy();
      });
    });

    it('can navigate back from product detail to tabs', async () => {
      const ref = React.createRef<any>();
      const { getByTestId, queryByTestId } = render(
        <NavigationContainer ref={ref}>
          <TestAppNavigator />
        </NavigationContainer>,
      );
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
      await act(async () => {
        ref.current?.navigate('ProductDetail', { slug: 'futon-001' });
      });
      await waitFor(() => {
        expect(getByTestId('product-detail-screen')).toBeTruthy();
      });
      // Navigate back
      await act(async () => {
        ref.current?.goBack();
      });
      await waitFor(() => {
        expect(queryByTestId('product-detail-screen')).toBeFalsy();
        expect(getByTestId('home-screen')).toBeTruthy();
      });
    });
  });

  describe('category navigation', () => {
    it('navigates to category screen', async () => {
      const ref = React.createRef<any>();
      const { getByTestId } = render(
        <NavigationContainer ref={ref}>
          <TestAppNavigator />
        </NavigationContainer>,
      );
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
      await act(async () => {
        ref.current?.navigate('Category', { slug: 'cat-001' });
      });
      await waitFor(() => {
        expect(getByTestId('category-screen')).toBeTruthy();
      });
    });
  });
});

describe('Deep Linking', () => {
  it('opens product detail from deep link initial state', async () => {
    const { getByTestId } = render(
      <NavigationContainer
        initialState={{
          routes: [
            { name: 'Tabs' },
            {
              name: 'ProductDetail',
              params: { slug: 'futon-001' },
            },
          ],
          index: 1,
        }}
      >
        <TestAppNavigator />
      </NavigationContainer>,
    );
    await waitFor(() => {
      expect(getByTestId('product-detail-screen')).toBeTruthy();
    });
  });

  it('opens category screen from deep link initial state', async () => {
    const { getByTestId } = render(
      <NavigationContainer
        initialState={{
          routes: [
            { name: 'Tabs' },
            {
              name: 'Category',
              params: { slug: 'living-room' },
            },
          ],
          index: 1,
        }}
      >
        <TestAppNavigator />
      </NavigationContainer>,
    );
    await waitFor(() => {
      expect(getByTestId('category-screen')).toBeTruthy();
    });
  });

  it('defaults to tabs/home when no deep link', async () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <TestAppNavigator />
      </NavigationContainer>,
    );
    await waitFor(() => {
      expect(getByTestId('home-screen')).toBeTruthy();
    });
  });
});

// --- Screen mocks for new nav-wired screens ---

jest.mock('@/screens/AchievementBadgesScreen', () => ({
  AchievementBadgesScreen: () => <MockScreen testID="achievement-badges-screen" label="AchievementBadges" />,
}));

jest.mock('@/screens/NotificationsScreen', () => ({
  NotificationsScreen: () => <MockScreen testID="notifications-screen" label="Notifications" />,
}));

// Test navigator that includes the new screens
function TestNavWithNewScreens() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Tabs">
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="AchievementBadges">
        {() => <MockScreen testID="achievement-badges-screen" label="AchievementBadges" />}
      </Stack.Screen>
      <Stack.Screen name="Notifications">
        {() => <MockScreen testID="notifications-screen" label="Notifications" />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

describe('AchievementBadges + Notifications navigation wiring', () => {
  it('navigates to AchievementBadges screen', async () => {
    const ref = React.createRef<any>();
    const { getByTestId } = render(
      <NavigationContainer ref={ref}>
        <TestNavWithNewScreens />
      </NavigationContainer>,
    );
    await waitFor(() => expect(getByTestId('home-screen')).toBeTruthy());
    act(() => {
      ref.current?.navigate('AchievementBadges');
    });
    await waitFor(() => {
      expect(getByTestId('achievement-badges-screen')).toBeTruthy();
    });
  });

  it('navigates back from AchievementBadges to tabs', async () => {
    const ref = React.createRef<any>();
    const { getByTestId, queryByTestId } = render(
      <NavigationContainer ref={ref}>
        <TestNavWithNewScreens />
      </NavigationContainer>,
    );
    await waitFor(() => expect(getByTestId('home-screen')).toBeTruthy());
    act(() => {
      ref.current?.navigate('AchievementBadges');
    });
    await waitFor(() => expect(getByTestId('achievement-badges-screen')).toBeTruthy());
    act(() => {
      ref.current?.goBack();
    });
    await waitFor(() => {
      expect(queryByTestId('achievement-badges-screen')).toBeFalsy();
      expect(getByTestId('home-screen')).toBeTruthy();
    });
  });

  it('navigates to Notifications screen', async () => {
    const ref = React.createRef<any>();
    const { getByTestId } = render(
      <NavigationContainer ref={ref}>
        <TestNavWithNewScreens />
      </NavigationContainer>,
    );
    await waitFor(() => expect(getByTestId('home-screen')).toBeTruthy());
    act(() => {
      ref.current?.navigate('Notifications');
    });
    await waitFor(() => {
      expect(getByTestId('notifications-screen')).toBeTruthy();
    });
  });

  it('navigates back from Notifications to tabs', async () => {
    const ref = React.createRef<any>();
    const { getByTestId, queryByTestId } = render(
      <NavigationContainer ref={ref}>
        <TestNavWithNewScreens />
      </NavigationContainer>,
    );
    await waitFor(() => expect(getByTestId('home-screen')).toBeTruthy());
    act(() => {
      ref.current?.navigate('Notifications');
    });
    await waitFor(() => expect(getByTestId('notifications-screen')).toBeTruthy());
    act(() => {
      ref.current?.goBack();
    });
    await waitFor(() => {
      expect(queryByTestId('notifications-screen')).toBeFalsy();
      expect(getByTestId('home-screen')).toBeTruthy();
    });
  });

  it('opens AchievementBadges from deep link initial state', async () => {
    const { getByTestId } = render(
      <NavigationContainer
        initialState={{
          routes: [{ name: 'Tabs' }, { name: 'AchievementBadges' }],
          index: 1,
        }}
      >
        <TestNavWithNewScreens />
      </NavigationContainer>,
    );
    await waitFor(() => {
      expect(getByTestId('achievement-badges-screen')).toBeTruthy();
    });
  });

  it('opens Notifications from deep link initial state', async () => {
    const { getByTestId } = render(
      <NavigationContainer
        initialState={{
          routes: [{ name: 'Tabs' }, { name: 'Notifications' }],
          index: 1,
        }}
      >
        <TestNavWithNewScreens />
      </NavigationContainer>,
    );
    await waitFor(() => {
      expect(getByTestId('notifications-screen')).toBeTruthy();
    });
  });
});

// Mirror the AppNavigator PaymentConfirmation screen wiring so we can test
// that onRetry is actually passed (the prop was missing in production — PR #120 issue #1).
const mockOrder = {
  orderId: 'ord-001',
  orderNumber: 'CF-20260320-001',
  items: [],
  totals: { subtotal: 349, shipping: 0, tax: 24.43, total: 373.43 },
  paymentMethod: 'card' as const,
  createdAt: '2026-03-20T22:00:00Z',
  estimatedDelivery: 'Mar 25–28, 2026',
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PaymentConfirmationScreen } = require('@/screens/PaymentConfirmationScreen');

function TestCheckoutNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Tabs">
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="PaymentConfirmation">
        {({ route, navigation: nav }: any) => {
          const { order } = route.params as { order: typeof mockOrder };
          return (
            <PaymentConfirmationScreen
              order={order}
              onSuccess={() =>
                nav.replace('OrderSuccess', {
                  orderId: order.orderId,
                  orderNumber: order.orderNumber,
                })
              }
              onRetry={() => nav.goBack()}
            />
          );
        }}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

describe('PaymentConfirmation navigator wiring', () => {
  it('passes onRetry wired to nav.goBack() so retry returns to previous screen', async () => {
    const ref = React.createRef<any>();
    const { getByTestId, queryByTestId } = render(
      <NavigationContainer ref={ref}>
        <TestCheckoutNavigator />
      </NavigationContainer>,
    );

    // Start on tabs
    await waitFor(() => expect(getByTestId('home-screen')).toBeTruthy());

    // Navigate to PaymentConfirmation (simulating Checkout handing off after payment)
    await act(async () => {
      ref.current?.navigate('PaymentConfirmation', { order: mockOrder });
    });
    await waitFor(() => expect(getByTestId('payment-confirmation-screen')).toBeTruthy());

    // Pressing retry must call nav.goBack() — screen should disappear and home returns
    fireEvent.press(getByTestId('retry-btn'));
    await waitFor(() => {
      expect(queryByTestId('payment-confirmation-screen')).toBeFalsy();
      expect(getByTestId('home-screen')).toBeTruthy();
    });
  });

  it('onSuccess navigates to OrderSuccess (replace, not goBack)', async () => {
    const ref = React.createRef<any>();
    const { getByTestId } = render(
      <NavigationContainer ref={ref}>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Tabs">
          <Stack.Screen name="Tabs" component={TabNavigator} />
          <Stack.Screen name="PaymentConfirmation">
            {({ route, navigation: nav }: any) => {
              const { order } = route.params as { order: typeof mockOrder };
              return (
                <PaymentConfirmationScreen
                  order={order}
                  onSuccess={() =>
                    nav.replace('OrderSuccess', {
                      orderId: order.orderId,
                      orderNumber: order.orderNumber,
                    })
                  }
                  onRetry={() => nav.goBack()}
                />
              );
            }}
          </Stack.Screen>
          <Stack.Screen
            name="OrderSuccess"
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            component={require('@/screens/OrderSuccessScreen').OrderSuccessScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>,
    );

    await waitFor(() => expect(getByTestId('home-screen')).toBeTruthy());
    await act(async () => {
      ref.current?.navigate('PaymentConfirmation', { order: mockOrder });
    });
    await waitFor(() => expect(getByTestId('payment-confirmation-screen')).toBeTruthy());

    fireEvent.press(getByTestId('continue-btn'));
    await waitFor(() => expect(getByTestId('order-success-screen')).toBeTruthy());
  });
});
