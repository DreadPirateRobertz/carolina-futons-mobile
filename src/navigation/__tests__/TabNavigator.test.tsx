/**
 * Tests for TabNavigator — CartFAB integration (cm-486).
 *
 * Verifies CartFAB is present in the tab navigator so it's accessible
 * from any tab screen when the cart has items.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { TabNavigator } from '../TabNavigator';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@react-navigation/bottom-tabs', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  const createBottomTabNavigator = () => ({
    Navigator: ({ children, screenOptions: _so, tabBar: _tb }: any) => (
      <View testID="tab-navigator">{children}</View>
    ),
    Screen: ({ name, component: Comp }: any) => (
      <View testID={`tab-screen-${name}`} />
    ),
  });
  return { createBottomTabNavigator };
});

jest.mock('../AnimatedTabBar', () => ({ AnimatedTabBar: () => null }));
jest.mock('../withScreenErrorBoundary', () => ({
  withScreenErrorBoundary: (C: any) => C,
}));
jest.mock('@/screens/HomeScreen', () => ({ HomeScreen: () => null }));
jest.mock('@/screens/ShopScreen', () => ({ ShopScreen: () => null }));
jest.mock('@/screens/CartScreen', () => ({ CartScreen: () => null }));
jest.mock('@/screens/AccountScreen', () => ({ AccountScreen: () => null }));
jest.mock('@/contexts/CompareContext', () => ({
  useCompareContext: () => ({ compareList: [], count: 0 }),
  CompareProvider: ({ children }: any) => children,
}));

const mockOpen = jest.fn();
jest.mock('@/hooks/useMiniCartDrawer', () => ({
  useMiniCartDrawer: () => ({ open: mockOpen, close: jest.fn(), toggle: jest.fn(), isOpen: false }),
  MiniCartDrawerProvider: ({ children }: any) => children,
}));

const mockUseCart = jest.fn();
jest.mock('@/hooks/useCart', () => ({
  useCart: () => mockUseCart(),
  CartProvider: ({ children }: any) => children,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

function renderTabs() {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCart.mockReturnValue({ itemCount: 2, items: [], subtotal: 0, itemCount: 2 });
});

describe('TabNavigator — CartFAB integration', () => {
  it('renders CartFAB when cart has items', () => {
    const { getByTestId } = renderTabs();
    expect(getByTestId('cart-fab')).toBeTruthy();
  });

  it('does not render CartFAB when cart is empty', () => {
    mockUseCart.mockReturnValue({ itemCount: 0, items: [], subtotal: 0 });
    const { queryByTestId } = renderTabs();
    expect(queryByTestId('cart-fab')).toBeNull();
  });
});
