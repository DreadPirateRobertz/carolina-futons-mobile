/**
 * Tests for gamification_order_placed wiring in usePayment — cfutons_mobile-r2o
 * TDD: tests written before implementation.
 *
 * Verifies orderPlaced fires after checkout completion and NOT on failure or
 * empty cart. Also confirms payment success is never blocked by gamification errors.
 */
import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { usePayment } from '../usePayment';
import { CartProvider, useCart } from '../useCart';
import { ConnectivityProvider } from '../useConnectivity';
import { createPaymentIntent, confirmOrder } from '@/services/payment';

// ── Gamification spy ─────────────────────────────────────────────────────────
const mockOrderPlaced = jest.fn();
jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    addToCart: jest.fn(),
    submitReview: jest.fn(),
    referralShared: jest.fn(),
    arUsed: jest.fn(),
    wishlistAdd: jest.fn(),
    orderPlaced: (...args: unknown[]) => mockOrderPlaced(...args),
  }),
}));

// ── Sentry mock ──────────────────────────────────────────────────────────────
jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

// ── Stripe mock ──────────────────────────────────────────────────────────────
jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: () => ({
    initPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
    presentPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
  }),
  usePlatformPay: () => ({
    isPlatformPaySupported: jest.fn().mockResolvedValue(false),
    confirmPlatformPayPayment: jest.fn(),
  }),
  PlatformPay: { PaymentType: { Immediate: 'Immediate' } },
  StripeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── Wix mock ─────────────────────────────────────────────────────────────────
jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => ({ callFunction: jest.fn() }),
}));

jest.mock('../usePremium', () => ({
  usePremium: () => ({ isPremium: false }),
}));

// ── Payment service mock ─────────────────────────────────────────────────────
jest.mock('@/services/payment', () => {
  const actual = jest.requireActual('@/services/payment');
  return { ...actual, createPaymentIntent: jest.fn(), confirmOrder: jest.fn() };
});

const mockedCreatePaymentIntent = createPaymentIntent as jest.MockedFunction<
  typeof createPaymentIntent
>;
const mockedConfirmOrder = confirmOrder as jest.MockedFunction<typeof confirmOrder>;

const INTENT_RESPONSE = {
  clientSecret: 'pi_r2o_secret',
  paymentIntentId: 'pi_r2o',
  ephemeralKey: 'ek_r2o',
  customerId: 'cus_r2o',
};

const ORDER_CONFIRMATION = {
  orderId: 'ord-r2o-test',
  orderNumber: 'CF-R2O',
  items: [],
  totals: { subtotal: 349, shipping: 49, tax: 24.43, total: 422.43 },
  paymentMethod: 'card' as const,
  createdAt: '2026-03-24T10:00:00Z',
  estimatedDelivery: 'April 1-5, 2026',
};

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ConnectivityProvider, {
    initialOnline: true,
    skipNetInfo: true,
    children: React.createElement(CartProvider, null, children),
  });
}

async function addCartItem(result: ReturnType<typeof renderHook<{ cart: ReturnType<typeof useCart>; payment: ReturnType<typeof usePayment> }, typeof wrapper>>['result']) {
  return act(async () => {
    result.current.cart.addItem(
      { id: 'test-model', name: 'Test Futon', basePrice: 349 } as any,
      { id: 'test-fabric', name: 'Natural', color: '#f5f0e8', price: 0 } as any,
      1,
    );
  });
}

describe('usePayment — gamification_order_placed wiring (cfutons_mobile-r2o)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderPlaced.mockResolvedValue({ success: true, newTotal: 350 });
    mockedCreatePaymentIntent.mockResolvedValue(INTENT_RESPONSE);
    mockedConfirmOrder.mockResolvedValue(ORDER_CONFIRMATION);
  });

  it('fires orderPlaced after successful card payment', async () => {
    const { result } = renderHook(
      () => ({ cart: useCart(), payment: usePayment() }),
      { wrapper },
    );
    await addCartItem(result);
    await act(async () => {
      await result.current.payment.processPayment('card');
    });

    expect(mockOrderPlaced).toHaveBeenCalledTimes(1);
    expect(mockOrderPlaced).toHaveBeenCalledWith('ord-r2o-test', 422.43);
  });

  it('passes correct orderId and orderTotal to orderPlaced', async () => {
    const custom = {
      ...ORDER_CONFIRMATION,
      orderId: 'ord-custom-99',
      totals: { ...ORDER_CONFIRMATION.totals, total: 599.0 },
    };
    mockedConfirmOrder.mockResolvedValue(custom);

    const { result } = renderHook(
      () => ({ cart: useCart(), payment: usePayment() }),
      { wrapper },
    );
    await addCartItem(result);
    await act(async () => {
      await result.current.payment.processPayment('card');
    });

    expect(mockOrderPlaced).toHaveBeenCalledWith('ord-custom-99', 599.0);
  });

  it('does NOT fire orderPlaced when cart is empty', async () => {
    const { result } = renderHook(() => usePayment(), { wrapper });
    await act(async () => {
      await result.current.processPayment('card');
    });
    expect(mockOrderPlaced).not.toHaveBeenCalled();
  });

  it('does NOT fire orderPlaced when confirmOrder throws', async () => {
    mockedConfirmOrder.mockRejectedValue(new Error('Order creation failed'));

    const { result } = renderHook(
      () => ({ cart: useCart(), payment: usePayment() }),
      { wrapper },
    );
    await addCartItem(result);
    await act(async () => {
      await result.current.payment.processPayment('card');
    });

    expect(mockOrderPlaced).not.toHaveBeenCalled();
    expect(result.current.payment.status).toBe('error');
  });

  it('does NOT block payment success if orderPlaced rejects', async () => {
    mockOrderPlaced.mockRejectedValue(new Error('gamification service down'));

    const { result } = renderHook(
      () => ({ cart: useCart(), payment: usePayment() }),
      { wrapper },
    );
    await addCartItem(result);
    let order: unknown;
    await act(async () => {
      order = await result.current.payment.processPayment('card');
    });

    // Payment should still succeed; gamification is fire-and-forget
    expect(order).not.toBeNull();
    expect(result.current.payment.status).toBe('success');
  });
});
