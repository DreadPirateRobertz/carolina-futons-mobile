/**
 * @module MiniCartDrawerHost.test
 *
 * Tests for MiniCartDrawerHost navigation integration — cm-jec.
 * Verifies that pressing Checkout calls close() then navigate('Checkout').
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MiniCartDrawerHost } from '../MiniCartDrawerHost';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useNavigationState: (selector: (state: unknown) => unknown) =>
    selector({ routes: [{ name: 'Home' }], index: 0 }),
}));

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

function renderHost() {
  return render(
    <ThemeProvider>
      <MiniCartDrawerHost />
    </ThemeProvider>,
  );
}

describe('MiniCartDrawerHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMiniCartDrawer.mockReturnValue({ isOpen: true, close: mockClose });
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
});
