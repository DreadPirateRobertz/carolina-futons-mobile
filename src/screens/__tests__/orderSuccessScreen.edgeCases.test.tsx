/**
 * OrderSuccessScreen edge-case tests — cm-vw0
 *
 * Covers gaps in orderSuccessScreen.test.tsx:
 *  - Haptics fired on mount (iOS and Android) but NOT on web
 *  - Haptics rejection silently swallowed (no throw)
 *  - view-orders-btn absent when onViewOrders is undefined
 *  - Button accessibility roles and labels
 *  - Custom testID prop overrides root testID
 *  - Static text content (subheading, order-number label)
 *  - Order number display edge cases (empty, numeric-only, special chars)
 *  - Multiple rapid presses — no call throttle
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { OrderSuccessScreen } from '../OrderSuccessScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNotificationAsync = jest.fn();

jest.mock('expo-haptics', () => ({
  notificationAsync: (...args: unknown[]) => mockNotificationAsync(...args),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderScreen(props: Partial<React.ComponentProps<typeof OrderSuccessScreen>> = {}) {
  return render(
    <ThemeProvider>
      <OrderSuccessScreen
        orderNumber="CF-20260320-042"
        onContinueShopping={jest.fn()}
        onViewOrders={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockNotificationAsync.mockResolvedValue(undefined);
});

// ─── Haptics on mount ─────────────────────────────────────────────────────────

describe('haptics on mount', () => {
  it('fires notificationAsync on iOS', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    renderScreen();
    expect(mockNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mockNotificationAsync).toHaveBeenCalledWith('success');
    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      writable: true,
      configurable: true,
    });
  });

  it('fires notificationAsync on Android', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      writable: true,
      configurable: true,
    });
    renderScreen();
    expect(mockNotificationAsync).toHaveBeenCalledTimes(1);
    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      writable: true,
      configurable: true,
    });
  });

  it('does NOT fire notificationAsync on web', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', writable: true, configurable: true });
    renderScreen();
    expect(mockNotificationAsync).not.toHaveBeenCalled();
    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      writable: true,
      configurable: true,
    });
  });

  it('silently swallows haptics rejection — does not throw', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    mockNotificationAsync.mockRejectedValue(new Error('haptics unavailable'));
    expect(() => renderScreen()).not.toThrow();
    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      writable: true,
      configurable: true,
    });
  });
});

// ─── View-orders button conditional rendering ─────────────────────────────────

describe('view-orders button conditional rendering', () => {
  it('view-orders-btn is absent when onViewOrders is undefined', () => {
    const { queryByTestId } = renderScreen({ onViewOrders: undefined });
    expect(queryByTestId('view-orders-btn')).toBeNull();
  });

  it('view-orders-btn is present when onViewOrders is provided', () => {
    const { getByTestId } = renderScreen({ onViewOrders: jest.fn() });
    expect(getByTestId('view-orders-btn')).toBeTruthy();
  });

  it('continue-shopping-btn remains present when onViewOrders is undefined', () => {
    const { getByTestId } = renderScreen({ onViewOrders: undefined });
    expect(getByTestId('continue-shopping-btn')).toBeTruthy();
  });

  it('pressing view-orders-btn calls the handler once', () => {
    const onViewOrders = jest.fn();
    const { getByTestId } = renderScreen({ onViewOrders });
    fireEvent.press(getByTestId('view-orders-btn'));
    expect(onViewOrders).toHaveBeenCalledTimes(1);
  });
});

// ─── Button accessibility props ───────────────────────────────────────────────

describe('button accessibility props', () => {
  it('continue-shopping-btn has accessibilityRole of button', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('continue-shopping-btn').props.accessibilityRole).toBe('button');
  });

  it('continue-shopping-btn has accessibilityLabel "Continue shopping"', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('continue-shopping-btn').props.accessibilityLabel).toBe('Continue shopping');
  });

  it('view-orders-btn has accessibilityRole of button', () => {
    const { getByTestId } = renderScreen({ onViewOrders: jest.fn() });
    expect(getByTestId('view-orders-btn').props.accessibilityRole).toBe('button');
  });

  it('view-orders-btn has accessibilityLabel "View your orders"', () => {
    const { getByTestId } = renderScreen({ onViewOrders: jest.fn() });
    expect(getByTestId('view-orders-btn').props.accessibilityLabel).toBe('View your orders');
  });
});

// ─── Custom testID prop ───────────────────────────────────────────────────────

describe('custom testID prop', () => {
  it('root uses default testID "order-success-screen" when testID is not provided', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('order-success-screen')).toBeTruthy();
  });

  it('root uses custom testID when provided', () => {
    const { queryByTestId, getByTestId } = renderScreen({ testID: 'my-custom-id' });
    expect(getByTestId('my-custom-id')).toBeTruthy();
    expect(queryByTestId('order-success-screen')).toBeNull();
  });
});

// ─── Static text content ─────────────────────────────────────────────────────

describe('static text content', () => {
  it('shows "Thank you for your purchase." subheading', () => {
    const { getByText } = renderScreen();
    expect(getByText('Thank you for your purchase.')).toBeTruthy();
  });

  it('shows "Order Number" label above the order number', () => {
    const { getByText } = renderScreen();
    expect(getByText('Order Number')).toBeTruthy();
  });

  it('shows "Continue Shopping" button text', () => {
    const { getByText } = renderScreen();
    expect(getByText('Continue Shopping')).toBeTruthy();
  });

  it('shows "View My Orders" button text when onViewOrders provided', () => {
    const { getByText } = renderScreen({ onViewOrders: jest.fn() });
    expect(getByText('View My Orders')).toBeTruthy();
  });
});

// ─── Order number display edge cases ─────────────────────────────────────────

describe('order number display edge cases', () => {
  it('renders empty string order number without crashing', () => {
    const { getByTestId } = renderScreen({ orderNumber: '' });
    expect(getByTestId('order-success-screen')).toBeTruthy();
  });

  it('renders numeric-only order number', () => {
    const { getByText } = renderScreen({ orderNumber: '1234567890' });
    expect(getByText('1234567890')).toBeTruthy();
  });

  it('renders order number with special characters without crashing', () => {
    const { getByTestId } = renderScreen({ orderNumber: 'CF-#2026/03-<042>' });
    expect(getByTestId('order-success-screen')).toBeTruthy();
  });

  it('renders exactly the order number string that was passed in', () => {
    const { getByText } = renderScreen({ orderNumber: 'CF-20260320-042' });
    expect(getByText('CF-20260320-042')).toBeTruthy();
  });
});

// ─── Multiple rapid presses — no throttle ────────────────────────────────────

describe('multiple rapid presses', () => {
  it('pressing continue-shopping-btn three times fires callback three times', () => {
    const onContinueShopping = jest.fn();
    const { getByTestId } = renderScreen({ onContinueShopping });
    fireEvent.press(getByTestId('continue-shopping-btn'));
    fireEvent.press(getByTestId('continue-shopping-btn'));
    fireEvent.press(getByTestId('continue-shopping-btn'));
    expect(onContinueShopping).toHaveBeenCalledTimes(3);
  });

  it('pressing view-orders-btn twice fires callback twice', () => {
    const onViewOrders = jest.fn();
    const { getByTestId } = renderScreen({ onViewOrders });
    fireEvent.press(getByTestId('view-orders-btn'));
    fireEvent.press(getByTestId('view-orders-btn'));
    expect(onViewOrders).toHaveBeenCalledTimes(2);
  });
});
