import { WixClient, type WixClientConfig, WixApiError } from '../wixClient';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const TEST_CONFIG: WixClientConfig = {
  apiKey: 'test-api-key-12345',
  siteId: 'test-site-id-67890',
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

beforeEach(() => {
  mockFetch.mockReset();
});

describe('WixClient — Payment', () => {
  describe('createPaymentIntent', () => {
    const lineItems = [
      { id: 'item-1', name: 'Asheville Full', fabric: 'Natural Linen', quantity: 1, unitPrice: 349 },
    ];
    const totals = { subtotal: 349, shipping: 49, tax: 24.43, total: 422.43 };

    it('calls the correct endpoint with line items and totals', async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({
          clientSecret: 'pi_abc_secret_xyz',
          paymentIntentId: 'pi_abc',
          ephemeralKey: 'ek_123',
          customerId: 'cus_456',
        }),
      );

      const client = new WixClient(TEST_CONFIG);
      await client.createPaymentIntent(lineItems, totals);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.wixapis.com/ecom/v1/payments/create-intent',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'test-api-key-12345',
            'wix-site-id': 'test-site-id-67890',
            'Content-Type': 'application/json',
          }),
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.lineItems).toEqual(lineItems);
      expect(body.totals).toEqual(totals);
    });

    it('returns clientSecret, paymentIntentId, ephemeralKey, and customerId', async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({
          clientSecret: 'pi_abc_secret_xyz',
          paymentIntentId: 'pi_abc',
          ephemeralKey: 'ek_123',
          customerId: 'cus_456',
        }),
      );

      const client = new WixClient(TEST_CONFIG);
      const result = await client.createPaymentIntent(lineItems, totals);

      expect(result).toEqual({
        clientSecret: 'pi_abc_secret_xyz',
        paymentIntentId: 'pi_abc',
        ephemeralKey: 'ek_123',
        customerId: 'cus_456',
      });
    });

    it('throws WixApiError on HTTP failure', async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({ message: 'Payment service unavailable' }, 503),
      );

      const client = new WixClient(TEST_CONFIG);
      await expect(client.createPaymentIntent(lineItems, totals)).rejects.toThrow(WixApiError);
    });

    it('throws WixApiError on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network request failed'));

      const client = new WixClient(TEST_CONFIG);
      await expect(client.createPaymentIntent(lineItems, totals)).rejects.toThrow(WixApiError);
    });

    it('retries on 5xx errors', async () => {
      mockFetch
        .mockReturnValueOnce(mockJsonResponse({ message: 'Internal error' }, 500))
        .mockReturnValueOnce(
          mockJsonResponse({
            clientSecret: 'pi_abc_secret_xyz',
            paymentIntentId: 'pi_abc',
            ephemeralKey: 'ek_123',
            customerId: 'cus_456',
          }),
        );

      const client = new WixClient(TEST_CONFIG);
      const result = await client.createPaymentIntent(lineItems, totals);

      expect(result.clientSecret).toBe('pi_abc_secret_xyz');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('confirmOrder', () => {
    const confirmPayload = {
      paymentIntentId: 'pi_abc',
      lineItems: [
        {
          id: 'item-1',
          modelId: 'model-1',
          modelName: 'Asheville Full',
          fabricId: 'fabric-1',
          fabricName: 'Natural Linen',
          quantity: 1,
          unitPrice: 349,
        },
      ],
      totals: { subtotal: 349, shipping: 49, tax: 24.43, total: 422.43 },
      paymentMethod: 'card' as const,
    };

    it('calls the correct endpoint with order details', async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({
          orderId: 'ord_123',
          orderNumber: 'CF-001',
          items: [],
          totals: confirmPayload.totals,
          paymentMethod: 'card',
          createdAt: '2026-03-07T12:00:00Z',
          estimatedDelivery: 'March 15-20, 2026',
        }),
      );

      const client = new WixClient(TEST_CONFIG);
      await client.confirmOrder(
        confirmPayload.paymentIntentId,
        confirmPayload.lineItems,
        confirmPayload.totals,
        confirmPayload.paymentMethod,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.wixapis.com/ecom/v1/orders/confirm',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'test-api-key-12345',
          }),
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.paymentIntentId).toBe('pi_abc');
      expect(body.lineItems).toEqual(confirmPayload.lineItems);
      expect(body.totals).toEqual(confirmPayload.totals);
      expect(body.paymentMethod).toBe('card');
    });

    it('returns order confirmation', async () => {
      const confirmation = {
        orderId: 'ord_123',
        orderNumber: 'CF-001',
        items: [],
        totals: confirmPayload.totals,
        paymentMethod: 'card',
        createdAt: '2026-03-07T12:00:00Z',
        estimatedDelivery: 'March 15-20, 2026',
      };

      mockFetch.mockReturnValue(mockJsonResponse(confirmation));

      const client = new WixClient(TEST_CONFIG);
      const result = await client.confirmOrder(
        confirmPayload.paymentIntentId,
        confirmPayload.lineItems,
        confirmPayload.totals,
        confirmPayload.paymentMethod,
      );

      expect(result).toEqual(confirmation);
    });

    it('throws WixApiError on HTTP failure', async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({ message: 'Order confirmation failed' }, 400),
      );

      const client = new WixClient(TEST_CONFIG);
      await expect(
        client.confirmOrder(
          confirmPayload.paymentIntentId,
          confirmPayload.lineItems,
          confirmPayload.totals,
          confirmPayload.paymentMethod,
        ),
      ).rejects.toThrow(WixApiError);
    });
  });
});
