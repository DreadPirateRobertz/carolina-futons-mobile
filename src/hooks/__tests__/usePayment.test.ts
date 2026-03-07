import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { usePayment } from '../usePayment';
import { CartProvider, useCart } from '../useCart';
import { createPaymentIntent, confirmOrder, PaymentError } from '@/services/payment';

// Mock Stripe
const mockInitPaymentSheet = jest.fn();
const mockPresentPaymentSheet = jest.fn();
const mockIsPlatformPaySupported = jest.fn();
const mockConfirmPlatformPayPayment = jest.fn();
jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: () => ({
    initPaymentSheet: mockInitPaymentSheet,
    presentPaymentSheet: mockPresentPaymentSheet,
  }),
  usePlatformPay: () => ({
    isPlatformPaySupported: mockIsPlatformPaySupported,
    confirmPlatformPayPayment: mockConfirmPlatformPayPayment,
  }),
  PlatformPay: {
    PaymentType: { Immediate: 'Immediate' },
  },
  StripeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock WixClient via useWixClient
const mockWixClient = { createPaymentIntent: jest.fn(), confirmOrder: jest.fn() };
jest.mock('@/services/wix', () => ({
  useWixClient: () => mockWixClient,
}));

// Mock payment service
jest.mock('@/services/payment', () => {
  const actual = jest.requireActual('@/services/payment');
  return {
    ...actual,
    createPaymentIntent: jest.fn(),
    confirmOrder: jest.fn(),
  };
});

const mockedCreatePaymentIntent = createPaymentIntent as jest.MockedFunction<
  typeof createPaymentIntent
>;
const mockedConfirmOrder = confirmOrder as jest.MockedFunction<typeof confirmOrder>;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(CartProvider, null, children);
}

const INTENT_RESPONSE = {
  clientSecret: 'pi_123_secret_abc',
  paymentIntentId: 'pi_123',
  ephemeralKey: 'ek_123',
  customerId: 'cus_123',
};

const ORDER_CONFIRMATION = {
  orderId: 'ord_123',
  orderNumber: 'CF-001',
  items: [],
  totals: { subtotal: 349, shipping: 49, tax: 24.43, total: 422.43 },
  paymentMethod: 'card' as const,
  createdAt: '2026-03-01T12:00:00Z',
  estimatedDelivery: 'March 15-20, 2026',
};

function addCartItem(result: any) {
  return act(async () => {
    result.current.cart.addItem(
      { id: 'test-model', name: 'Test', basePrice: 349 } as any,
      { id: 'test-fabric', name: 'Test', color: '#000', price: 0 } as any,
      1,
    );
  });
}

describe('usePayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitPaymentSheet.mockResolvedValue({ error: null });
    mockPresentPaymentSheet.mockResolvedValue({ error: null });
    mockIsPlatformPaySupported.mockResolvedValue(true);
    mockConfirmPlatformPayPayment.mockResolvedValue({ error: null, paymentIntent: {} });
  });

  it('starts with idle status', () => {
    const { result } = renderHook(() => usePayment(), { wrapper });
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.order).toBeNull();
  });

  it('calculates totals from cart subtotal', () => {
    const { result } = renderHook(() => usePayment(), { wrapper });
    expect(result.current.totals.subtotal).toBe(0);
    expect(result.current.totals.shipping).toBe(49);
    expect(result.current.totals.total).toBe(49);
  });

  it('returns null if cart is empty', async () => {
    const { result } = renderHook(() => usePayment(), { wrapper });
    let order: any;
    await act(async () => {
      order = await result.current.processPayment('card');
    });
    expect(order).toBeNull();
    expect(mockedCreatePaymentIntent).not.toHaveBeenCalled();
  });

  it('passes wixClient to createPaymentIntent', async () => {
    mockedCreatePaymentIntent.mockResolvedValue(INTENT_RESPONSE);
    mockedConfirmOrder.mockResolvedValue(ORDER_CONFIRMATION);

    const { result } = renderHook(
      () => ({ cart: useCart(), payment: usePayment() }),
      { wrapper },
    );

    await addCartItem(result);

    await act(async () => {
      await result.current.payment.processPayment('card');
    });

    expect(mockedCreatePaymentIntent).toHaveBeenCalledWith(
      mockWixClient,
      expect.any(Array),
      expect.any(Object),
    );
    expect(mockedConfirmOrder).toHaveBeenCalledWith(
      mockWixClient,
      'pi_123',
      expect.any(Array),
      expect.any(Object),
      'card',
    );
  });

  it('handles payment cancellation gracefully', async () => {
    mockPresentPaymentSheet.mockResolvedValue({
      error: { code: 'Canceled', message: 'User cancelled' },
    });
    mockedCreatePaymentIntent.mockResolvedValue(INTENT_RESPONSE);

    const { result } = renderHook(
      () => ({ cart: useCart(), payment: usePayment() }),
      { wrapper },
    );

    await addCartItem(result);

    let order: any;
    await act(async () => {
      order = await result.current.payment.processPayment('card');
    });

    expect(order).toBeNull();
    expect(result.current.payment.status).toBe('idle');
    expect(result.current.payment.error).toBeNull();
  });

  it('handles payment intent failure', async () => {
    mockedCreatePaymentIntent.mockRejectedValue(
      new PaymentError('Card declined', 'INTENT_FAILED'),
    );

    const { result } = renderHook(
      () => ({ cart: useCart(), payment: usePayment() }),
      { wrapper },
    );

    await addCartItem(result);

    let order: any;
    await act(async () => {
      order = await result.current.payment.processPayment('card');
    });

    expect(order).toBeNull();
    expect(result.current.payment.status).toBe('error');
    expect(result.current.payment.error).toBe('Card declined');
  });

  it('prevents concurrent double-submit', async () => {
    let resolvePaymentIntent: (value: any) => void;
    mockedCreatePaymentIntent.mockImplementation(
      () => new Promise((resolve) => { resolvePaymentIntent = resolve; }),
    );

    const { result } = renderHook(
      () => ({ cart: useCart(), payment: usePayment() }),
      { wrapper },
    );

    await addCartItem(result);

    let order1: any;
    let order2: any;
    await act(async () => {
      const p1 = result.current.payment.processPayment('card');
      const p2 = result.current.payment.processPayment('card');

      resolvePaymentIntent!(INTENT_RESPONSE);
      mockedConfirmOrder.mockResolvedValue(ORDER_CONFIRMATION);

      [order1, order2] = await Promise.all([p1, p2]);
    });

    expect(order2).toBeNull();
    expect(mockedCreatePaymentIntent).toHaveBeenCalledTimes(1);
  });

  it('resets payment state', async () => {
    mockedCreatePaymentIntent.mockRejectedValue(
      new PaymentError('Failed', 'INTENT_FAILED'),
    );

    const { result } = renderHook(
      () => ({ cart: useCart(), payment: usePayment() }),
      { wrapper },
    );

    await addCartItem(result);

    await act(async () => {
      await result.current.payment.processPayment('card');
    });

    expect(result.current.payment.status).toBe('error');

    act(() => {
      result.current.payment.resetPayment();
    });

    expect(result.current.payment.status).toBe('idle');
    expect(result.current.payment.error).toBeNull();
  });

  describe('Apple Pay via usePlatformPay', () => {
    it('exposes isApplePaySupported after checking', async () => {
      mockIsPlatformPaySupported.mockResolvedValue(true);

      const { result } = renderHook(() => usePayment(), { wrapper });

      // Wait for the async isPlatformPaySupported check
      await act(async () => {});

      expect(result.current.isApplePaySupported).toBe(true);
      expect(mockIsPlatformPaySupported).toHaveBeenCalled();
    });

    it('sets isApplePaySupported false when not supported', async () => {
      mockIsPlatformPaySupported.mockResolvedValue(false);

      const { result } = renderHook(() => usePayment(), { wrapper });
      await act(async () => {});

      expect(result.current.isApplePaySupported).toBe(false);
    });

    it('uses confirmPlatformPayPayment for apple-pay method', async () => {
      mockedCreatePaymentIntent.mockResolvedValue(INTENT_RESPONSE);
      mockedConfirmOrder.mockResolvedValue({
        ...ORDER_CONFIRMATION,
        paymentMethod: 'apple-pay' as const,
      });
      mockConfirmPlatformPayPayment.mockResolvedValue({
        error: null,
        paymentIntent: { id: 'pi_123' },
      });

      const { result } = renderHook(
        () => ({ cart: useCart(), payment: usePayment() }),
        { wrapper },
      );

      await addCartItem(result);

      let order: any;
      await act(async () => {
        order = await result.current.payment.processPayment('apple-pay');
      });

      // Should NOT use initPaymentSheet/presentPaymentSheet
      expect(mockInitPaymentSheet).not.toHaveBeenCalled();
      expect(mockPresentPaymentSheet).not.toHaveBeenCalled();

      // Should use confirmPlatformPayPayment
      expect(mockConfirmPlatformPayPayment).toHaveBeenCalledWith(
        'pi_123_secret_abc',
        expect.objectContaining({
          applePay: expect.objectContaining({
            merchantCountryCode: 'US',
            currencyCode: 'USD',
            cartItems: expect.arrayContaining([
              expect.objectContaining({ label: 'Carolina Futons' }),
            ]),
          }),
        }),
      );

      // Should confirm order
      expect(mockedConfirmOrder).toHaveBeenCalledWith(
        mockWixClient,
        'pi_123',
        expect.any(Array),
        expect.any(Object),
        'apple-pay',
      );

      expect(order).toBeTruthy();
      expect(order.orderId).toBe('ord_123');
    });

    it('handles Apple Pay cancellation', async () => {
      mockedCreatePaymentIntent.mockResolvedValue(INTENT_RESPONSE);
      mockConfirmPlatformPayPayment.mockResolvedValue({
        error: { code: 'Canceled', message: 'User cancelled' },
      });

      const { result } = renderHook(
        () => ({ cart: useCart(), payment: usePayment() }),
        { wrapper },
      );

      await addCartItem(result);

      let order: any;
      await act(async () => {
        order = await result.current.payment.processPayment('apple-pay');
      });

      expect(order).toBeNull();
      expect(result.current.payment.status).toBe('idle');
    });

    it('handles Apple Pay failure', async () => {
      mockedCreatePaymentIntent.mockResolvedValue(INTENT_RESPONSE);
      mockConfirmPlatformPayPayment.mockResolvedValue({
        error: { code: 'Failed', message: 'Apple Pay authorization failed' },
      });

      const { result } = renderHook(
        () => ({ cart: useCart(), payment: usePayment() }),
        { wrapper },
      );

      await addCartItem(result);

      await act(async () => {
        await result.current.payment.processPayment('apple-pay');
      });

      expect(result.current.payment.status).toBe('error');
      expect(result.current.payment.error).toBe('Apple Pay authorization failed');
    });

    it('still uses payment sheet for card method', async () => {
      mockedCreatePaymentIntent.mockResolvedValue(INTENT_RESPONSE);
      mockedConfirmOrder.mockResolvedValue(ORDER_CONFIRMATION);

      const { result } = renderHook(
        () => ({ cart: useCart(), payment: usePayment() }),
        { wrapper },
      );

      await addCartItem(result);

      await act(async () => {
        await result.current.payment.processPayment('card');
      });

      // Card should use the payment sheet flow
      expect(mockInitPaymentSheet).toHaveBeenCalled();
      expect(mockPresentPaymentSheet).toHaveBeenCalled();
      expect(mockConfirmPlatformPayPayment).not.toHaveBeenCalled();
    });
  });
});
