import React from 'react';
import { View, Text } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

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


// --- Hook mocks ---

const mockCartState = { itemCount: 0, items: [], subtotal: 0, addItem: jest.fn(), removeItem: jest.fn(), updateQuantity: jest.fn(), clearCart: jest.fn() };
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

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from '../TabNavigator';

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
      act(() => {
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
      act(() => {
        ref.current?.navigate('ProductDetail', { slug: 'futon-001' });
      });
      await waitFor(() => {
        expect(getByTestId('product-detail-screen')).toBeTruthy();
      });
      // Navigate back
      act(() => {
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
      act(() => {
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
