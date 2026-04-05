/**
 * TDD tests for usePurchaseExport (hq-a0d).
 *
 * Covers:
 *  - Status machine: idle → sending → sent | error
 *  - Calls /_functions/sendOrderHistoryEmail with correct payload
 *  - Payload: recipientEmail, memberName, exportDate, formatted orders
 *  - Empty order history handled gracefully
 *  - Email failure sets error state
 *  - No wixClient → error state
 *  - Unauthenticated → no-op
 *  - captureException called on failure
 *  - Retry resets error before re-sending
 */

import { renderHook, act } from '@testing-library/react-native';
import { usePurchaseExport } from '../usePurchaseExport';
import { captureException } from '@/services/crashReporting';
import type { Order } from '@/data/orders';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockCallFunction = jest.fn();
const mockUseOptionalWixClient = jest.fn();

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

const mockUseOrders = jest.fn();
jest.mock('@/hooks/useOrders', () => ({
  useOrders: () => mockUseOrders(),
}));

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const MEMBER = {
  id: 'member-1',
  email: 'alice@example.com',
  displayName: 'Alice Smith',
  phone: '555-0100',
  provider: 'wix' as const,
};

const ADDR = { name: 'Alice Smith', street: '1 Main St', city: 'Asheville', state: 'NC', zip: '28801' };

const ORDER_1: Order = {
  id: 'ord-1',
  orderNumber: 'CF-2026-0001',
  status: 'delivered',
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-01-20T00:00:00Z',
  items: [
    {
      id: 'li-1',
      modelId: 'asheville-full' as any,
      modelName: 'The Asheville',
      fabricId: 'natural-linen',
      fabricName: 'Natural Linen',
      fabricColor: '#D4C5A9',
      quantity: 1,
      unitPrice: 349,
      lineTotal: 349,
    },
  ],
  subtotal: 349,
  shipping: 49,
  tax: 27.92,
  total: 425.92,
  shippingAddress: ADDR,
  paymentMethod: 'Visa ····1234',
};

const ORDER_2: Order = {
  ...ORDER_1,
  id: 'ord-2',
  orderNumber: 'CF-2026-0002',
  status: 'processing',
  createdAt: '2026-03-01T00:00:00Z',
  total: 802.84,
};

function makeOrdersHook(orders: Order[]) {
  return {
    orders,
    isLoading: false,
    error: null,
    statusFilter: null,
    setStatusFilter: jest.fn(),
    getOrder: jest.fn(),
    refresh: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: MEMBER, loading: false, isAuthenticated: true });
  mockUseOrders.mockReturnValue(makeOrdersHook([ORDER_1, ORDER_2]));
  mockCallFunction.mockResolvedValue({ success: true });
  mockUseOptionalWixClient.mockReturnValue({ callFunction: mockCallFunction });
});

// ── Initial state ─────────────────────────────────────────────────────────────

describe('usePurchaseExport — initial state', () => {
  it('starts in idle status', () => {
    const { result } = renderHook(() => usePurchaseExport());
    expect(result.current.status).toBe('idle');
  });

  it('starts with null error', () => {
    const { result } = renderHook(() => usePurchaseExport());
    expect(result.current.error).toBeNull();
  });

  it('exposes sendExport function', () => {
    const { result } = renderHook(() => usePurchaseExport());
    expect(typeof result.current.sendExport).toBe('function');
  });
});

// ── Happy path ─────────────────────────────────────────────────────────────────

describe('usePurchaseExport — successful send', () => {
  it('transitions idle → sending → sent', async () => {
    let sendingObserved = false;
    mockCallFunction.mockImplementation(async () => {
      sendingObserved = true;
      return { success: true };
    });

    const { result } = renderHook(() => usePurchaseExport());
    expect(result.current.status).toBe('idle');

    await act(async () => {
      await result.current.sendExport();
    });

    expect(sendingObserved).toBe(true);
    expect(result.current.status).toBe('sent');
    expect(result.current.error).toBeNull();
  });

  it('calls callFunction with the sendOrderHistoryEmail path', async () => {
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    expect(mockCallFunction).toHaveBeenCalledWith(
      '/_functions/sendOrderHistoryEmail',
      'POST',
      expect.any(Object),
    );
  });

  it('sends recipientEmail from auth user', async () => {
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    const payload = mockCallFunction.mock.calls[0][2];
    expect(payload.recipientEmail).toBe('alice@example.com');
  });

  it('sends memberName from auth user displayName', async () => {
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    const payload = mockCallFunction.mock.calls[0][2];
    expect(payload.memberName).toBe('Alice Smith');
  });

  it('includes exportDate ISO string in payload', async () => {
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    const payload = mockCallFunction.mock.calls[0][2];
    expect(payload.exportDate).toBeDefined();
    expect(() => new Date(payload.exportDate)).not.toThrow();
  });

  it('includes all orders in the payload', async () => {
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    const payload = mockCallFunction.mock.calls[0][2];
    expect(payload.orders).toHaveLength(2);
  });

  it('formats order number, status, and total in payload', async () => {
    mockUseOrders.mockReturnValue(makeOrdersHook([ORDER_1]));
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    const order = mockCallFunction.mock.calls[0][2].orders[0];
    expect(order.orderNumber).toBe('CF-2026-0001');
    expect(order.status).toBe('delivered');
    expect(order.total).toBe(425.92);
  });

  it('formats line items with name, fabric, quantity, and prices', async () => {
    mockUseOrders.mockReturnValue(makeOrdersHook([ORDER_1]));
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    const item = mockCallFunction.mock.calls[0][2].orders[0].items[0];
    expect(item.name).toBe('The Asheville');
    expect(item.fabric).toBe('Natural Linen');
    expect(item.quantity).toBe(1);
    expect(item.unitPrice).toBe(349);
    expect(item.lineTotal).toBe(349);
  });

  it('includes subtotal, shipping, and tax in formatted order', async () => {
    mockUseOrders.mockReturnValue(makeOrdersHook([ORDER_1]));
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    const order = mockCallFunction.mock.calls[0][2].orders[0];
    expect(order.subtotal).toBe(349);
    expect(order.shipping).toBe(49);
    expect(order.tax).toBeCloseTo(27.92);
  });

  it('does not call captureException on success', async () => {
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    expect(captureException).not.toHaveBeenCalled();
  });
});

// ── Empty order history ────────────────────────────────────────────────────────

describe('usePurchaseExport — empty order history', () => {
  beforeEach(() => {
    mockUseOrders.mockReturnValue(makeOrdersHook([]));
  });

  it('still sends the email with an empty orders array', async () => {
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    expect(mockCallFunction).toHaveBeenCalledTimes(1);
    const payload = mockCallFunction.mock.calls[0][2];
    expect(payload.orders).toEqual([]);
  });

  it('reaches sent status even with empty history', async () => {
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    expect(result.current.status).toBe('sent');
  });
});

// ── Email / API failure ────────────────────────────────────────────────────────

describe('usePurchaseExport — API failure', () => {
  it('sets status to error when callFunction rejects', async () => {
    mockCallFunction.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    expect(result.current.status).toBe('error');
  });

  it('sets error message from the thrown error', async () => {
    mockCallFunction.mockRejectedValue(new Error('Email service unavailable'));
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    expect(result.current.error).toBe('Email service unavailable');
  });

  it('sets a fallback error message for non-Error rejections', async () => {
    mockCallFunction.mockRejectedValue('string error');
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    expect(result.current.error).toBeTruthy();
    expect(typeof result.current.error).toBe('string');
  });

  it('calls captureException with the error', async () => {
    const err = new Error('SMTP failure');
    mockCallFunction.mockRejectedValue(err);
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    expect(captureException).toHaveBeenCalledWith(err);
  });

  it('clears previous error before retrying', async () => {
    mockCallFunction
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });
    expect(result.current.status).toBe('error');

    await act(async () => {
      await result.current.sendExport();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe('sent');
  });
});

// ── No wixClient ───────────────────────────────────────────────────────────────

describe('usePurchaseExport — no wixClient', () => {
  beforeEach(() => {
    mockUseOptionalWixClient.mockReturnValue(null);
  });

  it('sets status to error when wixClient is unavailable', async () => {
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    expect(result.current.status).toBe('error');
  });

  it('sets a service unavailable error message', async () => {
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error).toMatch(/unavailable|service/i);
  });

  it('does not call callFunction when wixClient is null', async () => {
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    expect(mockCallFunction).not.toHaveBeenCalled();
  });
});

// ── Unauthenticated ───────────────────────────────────────────────────────────

describe('usePurchaseExport — unauthenticated', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, isAuthenticated: false });
  });

  it('does not send when user is null', async () => {
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    expect(mockCallFunction).not.toHaveBeenCalled();
  });

  it('stays idle when user is null', async () => {
    const { result } = renderHook(() => usePurchaseExport());

    await act(async () => {
      await result.current.sendExport();
    });

    expect(result.current.status).toBe('idle');
  });
});

// ── Guard: in-flight deduplication ────────────────────────────────────────────

describe('usePurchaseExport — in-flight guard', () => {
  it('does not fire a second request while already sending', async () => {
    let resolve!: () => void;
    mockCallFunction.mockImplementation(
      () => new Promise<{ success: boolean }>((res) => { resolve = () => res({ success: true }); }),
    );

    const { result } = renderHook(() => usePurchaseExport());

    // Fire first call without awaiting
    act(() => { result.current.sendExport(); });

    // Fire second call while first is in-flight
    await act(async () => {
      await result.current.sendExport();
    });

    resolve();

    expect(mockCallFunction).toHaveBeenCalledTimes(1);
  });
});
