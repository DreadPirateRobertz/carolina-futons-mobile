import { calculateTotals, createPaymentIntent, confirmOrder, PaymentError } from '../payment';
import type { CartItem } from '@/hooks/useCart';
import { WixClient, type WixClientConfig } from '@/services/wix';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

const TEST_CONFIG: WixClientConfig = {
  apiKey: 'test-api-key',
  siteId: 'test-site-id',
};

function mockJsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    headers: new Headers(),
  });
}

const mockCartItem: CartItem = {
  id: 'model-1:fabric-1',
  model: { id: 'model-1', name: 'Test Futon', basePrice: 349 } as CartItem['model'],
  fabric: { id: 'fabric-1', name: 'Natural Linen', color: '#ccc', price: 0 } as CartItem['fabric'],
  quantity: 1,
  unitPrice: 349,
};

describe('payment service', () => {
  let client: WixClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new WixClient(TEST_CONFIG);
  });

  describe('calculateTotals', () => {
    it('calculates totals with shipping for orders under threshold', () => {
      const totals = calculateTotals(349);
      expect(totals.subtotal).toBe(349);
      expect(totals.shipping).toBe(49);
      expect(totals.tax).toBe(24.43);
      expect(totals.total).toBe(422.43);
    });

    it('calculates free shipping for orders at or above threshold', () => {
      const totals = calculateTotals(499);
      expect(totals.subtotal).toBe(499);
      expect(totals.shipping).toBe(0);
      expect(totals.tax).toBe(34.93);
      expect(totals.total).toBe(533.93);
    });

    it('handles zero subtotal', () => {
      const totals = calculateTotals(0);
      expect(totals.subtotal).toBe(0);
      expect(totals.shipping).toBe(49);
      expect(totals.tax).toBe(0);
      expect(totals.total).toBe(49);
    });

    it('rounds tax to two decimal places', () => {
      const totals = calculateTotals(123);
      expect(totals.tax).toBe(8.61);
    });

    it('gives free shipping for premium users regardless of subtotal', () => {
      const totals = calculateTotals(100, true);
      expect(totals.shipping).toBe(0);
      expect(totals.total).toBe(107);
    });

    it('gives free shipping for premium users even at zero subtotal', () => {
      const totals = calculateTotals(0, true);
      expect(totals.shipping).toBe(0);
      expect(totals.total).toBe(0);
    });
  });

  describe('createPaymentIntent', () => {
    it('calls WixClient with mapped line items and totals', async () => {
      const mockResponse = {
        clientSecret: 'pi_123_secret_abc',
        paymentIntentId: 'pi_123',
        ephemeralKey: 'ek_123',
        customerId: 'cus_123',
      };
      mockFetch.mockReturnValue(mockJsonResponse(mockResponse));

      const totals = calculateTotals(349);
      const result = await createPaymentIntent(client, [mockCartItem], totals);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ecom/v1/payments/create-intent'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'test-api-key',
            'wix-site-id': 'test-site-id',
          }),
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.lineItems).toEqual([
        {
          id: 'model-1:fabric-1',
          name: 'Test Futon',
          fabric: 'Natural Linen',
          quantity: 1,
          unitPrice: 349,
        },
      ]);
      expect(body.totals).toEqual(totals);
      expect(result).toEqual(mockResponse);
    });

    it('throws PaymentError with INTENT_FAILED code on API failure', async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ message: 'Card declined' }, 400));

      const totals = calculateTotals(349);
      try {
        await createPaymentIntent(client, [mockCartItem], totals);
        fail('Expected PaymentError');
      } catch (err) {
        expect(err).toBeInstanceOf(PaymentError);
        expect((err as PaymentError).code).toBe('INTENT_FAILED');
        expect((err as PaymentError).message).toBe('Card declined');
      }
    });

    it('throws PaymentError with default message on non-JSON error', async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ message: 'HTTP 503' }, 503));

      const totals = calculateTotals(349);
      await expect(createPaymentIntent(client, [mockCartItem], totals)).rejects.toThrow(
        PaymentError,
      );
    });
  });

  describe('confirmOrder', () => {
    it('calls WixClient with order details', async () => {
      const mockConfirmation = {
        orderId: 'ord_123',
        orderNumber: 'CF-20260301-001',
        items: [mockCartItem],
        totals: calculateTotals(349),
        paymentMethod: 'card' as const,
        createdAt: '2026-03-01T12:00:00Z',
        estimatedDelivery: 'March 15-20, 2026',
      };
      mockFetch.mockReturnValue(mockJsonResponse(mockConfirmation));

      const totals = calculateTotals(349);
      const result = await confirmOrder(client, 'pi_123', [mockCartItem], totals, 'card');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ecom/v1/orders/confirm'),
        expect.objectContaining({ method: 'POST' }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.paymentIntentId).toBe('pi_123');
      expect(body.lineItems[0]).toMatchObject({
        id: 'model-1:fabric-1',
        modelId: 'model-1',
        modelName: 'Test Futon',
        fabricId: 'fabric-1',
        fabricName: 'Natural Linen',
      });

      expect(result.orderId).toBe('ord_123');
      expect(result.orderNumber).toBe('CF-20260301-001');
    });

    it('throws PaymentError with CONFIRM_FAILED code on failure', async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ message: 'Order already exists' }, 400));

      const totals = calculateTotals(349);
      try {
        await confirmOrder(client, 'pi_123', [mockCartItem], totals, 'card');
        fail('Expected PaymentError');
      } catch (err) {
        expect(err).toBeInstanceOf(PaymentError);
        expect((err as PaymentError).code).toBe('CONFIRM_FAILED');
      }
    });
  });

  describe('PaymentError', () => {
    it('has correct name and code', () => {
      const err = new PaymentError('test error', 'INTENT_FAILED');
      expect(err.name).toBe('PaymentError');
      expect(err.code).toBe('INTENT_FAILED');
      expect(err.message).toBe('test error');
    });
  });
});
