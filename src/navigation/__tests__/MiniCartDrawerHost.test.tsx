/**
 * @module MiniCartDrawerHost.test
 *
 * Tests for MiniCartDrawerHost navigation integration — cm-3jz.
 * Verifies checkout navigation, close ordering, and Checkout-screen suppression.
 * Uses navigationRef prop instead of useNavigation/useNavigationState hooks
 * to avoid the NavigationStateListenerContext crash outside a navigator (RN v7).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MiniCartDrawerHost } from '../MiniCartDrawerHost';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { NavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../AppNavigator';

const mockNavigate = jest.fn();

function makeNavRef(
  overrides?: Partial<NavigationContainerRef<RootStackParamList>>,
): NavigationContainerRef<RootStackParamList> {
  return {
    navigate: mockNavigate,
    goBack: jest.fn(),
    reset: jest.fn(),
    dispatch: jest.fn(),
    setParams: jest.fn(),
    canGoBack: jest.fn(() => false),
    getState: jest.fn(),
    getCurrentRoute: jest.fn(() => ({ key: 'Home-1', name: 'Tabs' as const })),
    getCurrentOptions: jest.fn(),
    isReady: jest.fn(() => true),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    ...overrides,
  } as unknown as NavigationContainerRef<RootStackParamList>;
}

const mockClose = jest.fn();
const mockUseMiniCartDrawer = jest.fn();
jest.mock('@/hooks/useMiniCartDrawer', () => ({
  useMiniCartDrawer: () => mockUseMiniCartDrawer(),
}));

jest.mock('@/components/MiniCartDrawer', () => ({
  MiniCartDrawer: ({ onCheckout, onClose }: { onCheckout: () => void; onClose: () => void }) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View testID="mock-mini-cart-drawer">
        <TouchableOpacity testID="mock-checkout-btn" onPress={onCheckout}>
          <Text>Checkout</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="mock-close-btn" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

const mockUseCart = jest.fn();
jest.mock('@/hooks/useCart', () => ({
  useCart: () => mockUseCart(),
}));

function renderHost(
  navRef: NavigationContainerRef<RootStackParamList> = makeNavRef(),
  currentRoute?: string,
) {
  return render(
    <ThemeProvider>
      <MiniCartDrawerHost navigationRef={navRef} currentRoute={currentRoute} />
    </ThemeProvider>,
  );
}

describe('MiniCartDrawerHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMiniCartDrawer.mockReturnValue({ isOpen: true, close: mockClose });
    mockUseCart.mockReturnValue({ itemCount: 2, items: [], subtotal: 0 });
  });

  describe('checkout press', () => {
    it('calls close() when checkout button is pressed', () => {
      const { getByTestId } = renderHost();
      fireEvent.press(getByTestId('mock-checkout-btn'));
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it("navigates to 'Checkout' when checkout button is pressed", () => {
      const { getByTestId } = renderHost();
      fireEvent.press(getByTestId('mock-checkout-btn'));
      expect(mockNavigate).toHaveBeenCalledWith('Checkout');
    });

    it('calls close() before navigate() — order matters for UX', () => {
      const callOrder: string[] = [];
      mockClose.mockImplementation(() => callOrder.push('close'));
      mockNavigate.mockImplementation(() => callOrder.push('navigate'));
      const { getByTestId } = renderHost();
      fireEvent.press(getByTestId('mock-checkout-btn'));
      expect(callOrder).toEqual(['close', 'navigate']);
    });
  });

  describe('Checkout screen suppression', () => {
    it('does not render drawer when currentRoute is Checkout', () => {
      const { queryByTestId } = renderHost(makeNavRef(), 'Checkout');
      expect(queryByTestId('mock-mini-cart-drawer')).toBeNull();
    });

    it('renders drawer when currentRoute is not Checkout', () => {
      const { getByTestId } = renderHost(makeNavRef(), 'Tabs');
      expect(getByTestId('mock-mini-cart-drawer')).toBeTruthy();
    });

    it('renders drawer when currentRoute is undefined', () => {
      const { getByTestId } = renderHost(makeNavRef(), undefined);
      expect(getByTestId('mock-mini-cart-drawer')).toBeTruthy();
    });
  });

  describe('CartFAB global trigger', () => {
    it('renders CartFAB when cart has items', () => {
      mockUseCart.mockReturnValue({ itemCount: 3, items: [], subtotal: 0 });
      const { getByTestId } = renderHost(makeNavRef(), 'Tabs');
      expect(getByTestId('cart-fab')).toBeTruthy();
    });

    it('does not render CartFAB when cart is empty', () => {
      mockUseCart.mockReturnValue({ itemCount: 0, items: [], subtotal: 0 });
      const { queryByTestId } = renderHost(makeNavRef(), 'Tabs');
      expect(queryByTestId('cart-fab')).toBeNull();
    });

    it('does not render CartFAB on Checkout screen', () => {
      mockUseCart.mockReturnValue({ itemCount: 2, items: [], subtotal: 0 });
      const { queryByTestId } = renderHost(makeNavRef(), 'Checkout');
      expect(queryByTestId('cart-fab')).toBeNull();
    });

    it('does not render CartFAB on Cart screen', () => {
      mockUseCart.mockReturnValue({ itemCount: 2, items: [], subtotal: 0 });
      const { queryByTestId } = renderHost(makeNavRef(), 'Cart');
      expect(queryByTestId('cart-fab')).toBeNull();
    });
  });

  describe('no navigation hook dependency', () => {
    it('renders without useNavigation or useNavigationState context (no navigator wrapper needed)', () => {
      // This test verifies the fix for cm-3jz: the component must render
      // without NavigationStateListenerContext (i.e., outside a navigator).
      // The previous implementation crashed here because useNavigationState
      // threw "Couldn't get the navigation state."
      expect(() => renderHost()).not.toThrow();
    });
  });
});
