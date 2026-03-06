import { calculateTotals, createPaymentIntent, confirmOrder, PaymentError } from '../payment';
import type { CartItem } from '@/hooks/useCart';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockCartItem: CartItem = {
  id: 'model-1:fabric-1',
  model: { id: 'model-1', name: 'Test Futon', basePrice: 349 } as CartItem['model'],
  fabric: { id: 'fabric-1', name: 'Natural Linen', color: '#ccc', price: 0 } as CartItem['fabric'],
  quantity: 1,
  unitPrice: 349,
};

describe('payment service', () => {
  beforeEach(() => {
    mockFetch.mockReset();
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
      // 123 * 0.07 = 8.61
      const totals = calculateTotals(123);
      expect(totals.tax).toBe(8.61);
    });
  });

  describe('createPaymentIntent', () => {
    it('calls the payment API with correct body', async () => {
      const mockResponse = {
        clientSecret: 'pi_123_secret_abc',
        paymentIntentId: 'pi_123',
        ephemeralKey: 'ek_123',
        customerId: 'cus_123',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const totals = calculateTotals(349);
      const result = await createPaymentIntent([mockCartItem], totals);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/payments/create-intent'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('throws PaymentError on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Card declined' }),
      });

      const totals = calculateTotals(349);
      await expect(createPaymentIntent([mockCartItem], totals)).rejects.toThrow(PaymentError);
      await expect(createPaymentIntent([mockCartItem], totals)).rejects.toThrow('Card declined');
    });

    it('throws with default message when API returns non-JSON error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('parse error')),
      });

      const totals = calculateTotals(349);
      await expect(createPaymentIntent([mockCartItem], totals)).rejects.toThrow(
        'Payment service unavailable',
      );
    });

    it('throws on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

      const totals = calculateTotals(349);
      await expect(createPaymentIntent([mockCartItem], totals)).rejects.toThrow(
        'Network request failed',
      );
    });
  });

  describe('confirmOrder', () => {
    it('calls the order confirmation API', async () => {
      const mockConfirmation = {
        orderId: 'ord_123',
        orderNumber: 'CF-20260301-001',
        items: [mockCartItem],
        totals: calculateTotals(349),
        paymentMethod: 'card' as const,
        createdAt: '2026-03-01T12:00:00Z',
        estimatedDelivery: 'March 15-20, 2026',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfirmation),
      });

      const totals = calculateTotals(349);
      const result = await confirmOrder('pi_123', [mockCartItem], totals, 'card');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/orders/confirm'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result.orderId).toBe('ord_123');
      expect(result.orderNumber).toBe('CF-20260301-001');
    });

    it('throws PaymentError on confirmation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Order already exists' }),
      });

      const totals = calculateTotals(349);
      await expect(confirmOrder('pi_123', [mockCartItem], totals, 'card')).rejects.toThrow(
        PaymentError,
      );
    });

    it('throws on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

      const totals = calculateTotals(349);
      await expect(confirmOrder('pi_123', [mockCartItem], totals, 'card')).rejects.toThrow(
        'Network request failed',
      );
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
