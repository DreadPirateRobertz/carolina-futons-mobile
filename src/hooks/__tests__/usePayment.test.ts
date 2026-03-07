import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { usePayment } from '../usePayment';
import { CartProvider, useCart } from '../useCart';
import { createPaymentIntent, confirmOrder, PaymentError } from '@/services/payment';

// Mock Stripe
const mockInitPaymentSheet = jest.fn();
const mockPresentPaymentSheet = jest.fn();
jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: () => ({
    initPaymentSheet: mockInitPaymentSheet,
    presentPaymentSheet: mockPresentPaymentSheet,
  }),
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

describe('usePayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitPaymentSheet.mockResolvedValue({ error: null });
    mockPresentPaymentSheet.mockResolvedValue({ error: null });
  });

  it('starts with idle status', () => {
    const { result } = renderHook(() => usePayment(), { wrapper });
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.order).toBeNull();
  });

  it('calculates totals from cart subtotal', () => {
    const { result } = renderHook(() => usePayment(), { wrapper });
    // Empty cart = $0 subtotal
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
    mockedCreatePaymentIntent.mockResolvedValue({
      clientSecret: 'pi_123_secret_abc',
      paymentIntentId: 'pi_123',
      ephemeralKey: 'ek_123',
      customerId: 'cus_123',
    });

    mockedConfirmOrder.mockResolvedValue({
      orderId: 'ord_123',
      orderNumber: 'CF-001',
      items: [],
      totals: { subtotal: 349, shipping: 49, tax: 24.43, total: 422.43 },
      paymentMethod: 'card',
      createdAt: '2026-03-01T12:00:00Z',
      estimatedDelivery: 'March 15-20, 2026',
    });

    const { result } = renderHook(
      () => {
        const cart = useCart();
        const payment = usePayment();
        return { cart, payment };
      },
      { wrapper },
    );

    await act(async () => {
      result.current.cart.addItem(
        { id: 'test-model', name: 'Test', basePrice: 349 } as any,
        { id: 'test-fabric', name: 'Test', color: '#000', price: 0 } as any,
        1,
      );
    });

    await act(async () => {
      await result.current.payment.processPayment('card');
    });

    // First arg should be the mock WixClient
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

    mockedCreatePaymentIntent.mockResolvedValue({
      clientSecret: 'pi_123_secret_abc',
      paymentIntentId: 'pi_123',
      ephemeralKey: 'ek_123',
      customerId: 'cus_123',
    });

    const { result } = renderHook(
      () => {
        const cart = useCart();
        const payment = usePayment();
        return { cart, payment };
      },
      { wrapper },
    );

    // Add an item to cart
    await act(async () => {
      result.current.cart.addItem(
        { id: 'test-model', name: 'Test', basePrice: 349 } as any,
        { id: 'test-fabric', name: 'Test', color: '#000', price: 0 } as any,
        1,
      );
    });

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
      () => {
        const cart = useCart();
        const payment = usePayment();
        return { cart, payment };
      },
      { wrapper },
    );

    await act(async () => {
      result.current.cart.addItem(
        { id: 'test-model', name: 'Test', basePrice: 349 } as any,
        { id: 'test-fabric', name: 'Test', color: '#000', price: 0 } as any,
        1,
      );
    });

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
      () =>
        new Promise((resolve) => {
          resolvePaymentIntent = resolve;
        }),
    );

    const { result } = renderHook(
      () => {
        const cart = useCart();
        const payment = usePayment();
        return { cart, payment };
      },
      { wrapper },
    );

    await act(async () => {
      result.current.cart.addItem(
        { id: 'test-model', name: 'Test', basePrice: 349 } as any,
        { id: 'test-fabric', name: 'Test', color: '#000', price: 0 } as any,
        1,
      );
    });

    // Fire two concurrent payment requests
    let order1: any;
    let order2: any;
    await act(async () => {
      const p1 = result.current.payment.processPayment('card');
      const p2 = result.current.payment.processPayment('card');

      // Resolve the first payment intent
      resolvePaymentIntent!({
        clientSecret: 'pi_123_secret_abc',
        paymentIntentId: 'pi_123',
        ephemeralKey: 'ek_123',
        customerId: 'cus_123',
      });

      mockedConfirmOrder.mockResolvedValue({
        orderId: 'ord_123',
        orderNumber: 'CF-001',
        items: [],
        totals: { subtotal: 349, shipping: 49, tax: 24.43, total: 422.43 },
        paymentMethod: 'card',
        createdAt: '2026-03-01T12:00:00Z',
        estimatedDelivery: 'March 15-20, 2026',
      });

      [order1, order2] = await Promise.all([p1, p2]);
    });

    // Second call should have returned null (blocked by processingRef)
    expect(order2).toBeNull();
    // createPaymentIntent should only be called once
    expect(mockedCreatePaymentIntent).toHaveBeenCalledTimes(1);
  });

  it('resets payment state', async () => {
    mockedCreatePaymentIntent.mockRejectedValue(
      new PaymentError('Failed', 'INTENT_FAILED'),
    );

    const { result } = renderHook(
      () => {
        const cart = useCart();
        const payment = usePayment();
        return { cart, payment };
      },
      { wrapper },
    );

    await act(async () => {
      result.current.cart.addItem(
        { id: 'test-model', name: 'Test', basePrice: 349 } as any,
        { id: 'test-fabric', name: 'Test', color: '#000', price: 0 } as any,
        1,
      );
    });

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
});
