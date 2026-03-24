import { executeOrderSaga, type OrderSagaInput } from '../orderSaga';

// Mock payment functions
const mockCreatePaymentIntent = jest.fn();
const mockConfirmOrder = jest.fn();
jest.mock('../payment', () => ({
  createPaymentIntent: (...args: unknown[]) => mockCreatePaymentIntent(...args),
  confirmOrder: (...args: unknown[]) => mockConfirmOrder(...args),
}));

// Mock refund
const mockRefundPayment = jest.fn();
jest.mock('../refund', () => ({
  refundPayment: (...args: unknown[]) => mockRefundPayment(...args),
}));

// Mock crash reporting
const mockCaptureException = jest.fn();
jest.mock('../crashReporting', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

const mockClient = {} as OrderSagaInput['client'];
const baseInput: OrderSagaInput = {
  client: mockClient,
  items: [] as OrderSagaInput['items'],
  totals: { subtotal: 499, shipping: 0, tax: 34.93, total: 533.93 },
  paymentMethod: 'card',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();

  mockCreatePaymentIntent.mockResolvedValue({
    clientSecret: 'pi_test_secret',
    paymentIntentId: 'pi_test_123',
    ephemeralKey: 'ek_test',
    customerId: 'cus_test',
  });

  mockConfirmOrder.mockResolvedValue({
    orderId: 'order-456',
    orderNumber: 'CF-2026-0001',
    items: [],
    totals: baseInput.totals,
    paymentMethod: 'card',
    createdAt: '2026-03-16',
    estimatedDelivery: '2026-03-23',
  });

  mockRefundPayment.mockResolvedValue({ refundId: 'ref_123' });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('executeOrderSaga', () => {
  it('completes happy path: payment → order → confirmed', async () => {
    const promise = executeOrderSaga(baseInput);
    jest.runAllTimers();
    const result = await promise;

    expect(result.status).toBe('confirmed');
    expect(result.orderId).toBe('order-456');
    expect(result.orderNumber).toBe('CF-2026-0001');
    expect(mockCreatePaymentIntent).toHaveBeenCalledTimes(1);
    expect(mockConfirmOrder).toHaveBeenCalledTimes(1);
    expect(mockRefundPayment).not.toHaveBeenCalled();
  });

  it('returns payment_failed when PaymentIntent creation fails', async () => {
    mockCreatePaymentIntent.mockRejectedValue(new Error('Stripe down'));

    const promise = executeOrderSaga(baseInput);
    jest.runAllTimers();
    const result = await promise;

    expect(result.status).toBe('payment_failed');
    expect(result.error).toMatch(/Stripe down/);
    expect(mockConfirmOrder).not.toHaveBeenCalled();
  });

  it('rolls back Stripe charge when Wix order creation fails after retries', async () => {
    mockConfirmOrder.mockRejectedValue(new Error('Wix unavailable'));

    const promise = executeOrderSaga(baseInput);
    // Advance through all retry delays
    for (let i = 0; i < 5; i++) {
      await Promise.resolve(); // flush microtasks
      jest.advanceTimersByTime(5000);
    }
    const result = await promise;

    expect(result.status).toBe('rolled_back');
    expect(result.error).toMatch(/Wix unavailable/);
    expect(mockRefundPayment).toHaveBeenCalledWith('pi_test_123');
    expect(mockConfirmOrder).toHaveBeenCalledTimes(3);
  });

  it('reports critical error when both order AND refund fail', async () => {
    mockConfirmOrder.mockRejectedValue(new Error('Wix down'));
    mockRefundPayment.mockRejectedValue(new Error('Stripe refund failed'));

    const promise = executeOrderSaga(baseInput);
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(5000);
    }
    const result = await promise;

    expect(result.status).toBe('refund_failed');
    expect(result.requiresManualResolution).toBe(true);
    expect(mockCaptureException).toHaveBeenCalled();
  });

  // ── Compensation failure — CRITICAL Sentry path ─────────────────────────

  it('captures with fatal severity when refund fails', async () => {
    mockConfirmOrder.mockRejectedValue(new Error('Wix down'));
    mockRefundPayment.mockRejectedValue(new Error('Stripe refund failed'));

    const promise = executeOrderSaga(baseInput);
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(5000);
    }
    await promise;

    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      'fatal',
      expect.any(Object),
    );
  });

  it('includes paymentIntentId in Sentry context on refund failure', async () => {
    mockConfirmOrder.mockRejectedValue(new Error('Wix down'));
    mockRefundPayment.mockRejectedValue(new Error('Stripe refund failed'));

    const promise = executeOrderSaga(baseInput);
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(5000);
    }
    await promise;

    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      'fatal',
      expect.objectContaining({ paymentIntentId: 'pi_test_123' }),
    );
  });

  it('includes original Wix error in Sentry context on refund failure', async () => {
    mockConfirmOrder.mockRejectedValue(new Error('Wix order failed'));
    mockRefundPayment.mockRejectedValue(new Error('Stripe refund failed'));

    const promise = executeOrderSaga(baseInput);
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(5000);
    }
    await promise;

    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      'fatal',
      expect.objectContaining({ originalError: 'Wix order failed' }),
    );
  });

  it('returns paymentIntentId in refund_failed result for manual resolution', async () => {
    mockConfirmOrder.mockRejectedValue(new Error('Wix down'));
    mockRefundPayment.mockRejectedValue(new Error('Stripe refund failed'));

    const promise = executeOrderSaga(baseInput);
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(5000);
    }
    const result = await promise;

    expect(result.paymentIntentId).toBe('pi_test_123');
    expect(result.requiresManualResolution).toBe(true);
  });

  it('handles non-Error thrown by refundPayment (string rejection)', async () => {
    mockConfirmOrder.mockRejectedValue(new Error('Wix down'));
    mockRefundPayment.mockRejectedValue('network timeout');

    const promise = executeOrderSaga(baseInput);
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(5000);
    }
    const result = await promise;

    expect(result.status).toBe('refund_failed');
    expect(result.requiresManualResolution).toBe(true);
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      'fatal',
      expect.objectContaining({ paymentIntentId: 'pi_test_123' }),
    );
  });

  it('handles non-Error thrown by confirmOrder (string rejection)', async () => {
    mockConfirmOrder.mockRejectedValue('Wix timeout string');
    mockRefundPayment.mockRejectedValue(new Error('Stripe refund failed'));

    const promise = executeOrderSaga(baseInput);
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(5000);
    }
    const result = await promise;

    expect(result.status).toBe('refund_failed');
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      'fatal',
      expect.objectContaining({ originalError: 'Wix timeout string' }),
    );
  });

  it('succeeds on retry within 3 attempts', async () => {
    let callCount = 0;
    mockConfirmOrder.mockImplementation(() => {
      callCount++;
      if (callCount < 3) return Promise.reject(new Error('Wix timeout'));
      return Promise.resolve({
        orderId: 'order-789',
        orderNumber: 'CF-2026-0002',
        items: [],
        totals: baseInput.totals,
        paymentMethod: 'card',
        createdAt: '2026-03-16',
        estimatedDelivery: '2026-03-23',
      });
    });

    const promise = executeOrderSaga(baseInput);
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(5000);
    }
    const result = await promise;

    expect(result.status).toBe('confirmed');
    expect(result.orderId).toBe('order-789');
    expect(mockConfirmOrder).toHaveBeenCalledTimes(3);
    expect(mockRefundPayment).not.toHaveBeenCalled();
  });

  it('passes client, items, and totals through to payment functions', async () => {
    const promise = executeOrderSaga(baseInput);
    jest.runAllTimers();
    await promise;

    expect(mockCreatePaymentIntent).toHaveBeenCalledWith(
      mockClient,
      baseInput.items,
      baseInput.totals,
    );
    expect(mockConfirmOrder).toHaveBeenCalledWith(
      mockClient,
      'pi_test_123',
      baseInput.items,
      baseInput.totals,
      'card',
    );
  });

  it('returns paymentIntentId on confirmed result', async () => {
    const promise = executeOrderSaga(baseInput);
    jest.runAllTimers();
    const result = await promise;

    expect(result.paymentIntentId).toBe('pi_test_123');
  });
});
