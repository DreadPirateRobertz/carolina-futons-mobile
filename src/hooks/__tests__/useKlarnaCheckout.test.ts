/**
 * TDD tests for useKlarnaCheckout hook (cm-g2o).
 *
 * Klarna redirect flow:
 * 1. POST /_functions/klarna/checkout → { redirectUrl, orderId }
 * 2. Validate redirectUrl with SSRF guard
 * 3. Linking.openURL(redirectUrl)
 * 4. App returns via deep link: carolinafutons://klarna/return?status=success|cancel&orderId=xxx
 * 5. On success: confirm order, clear cart, emit success state
 * 6. On cancel: reset to idle
 * 7. On error: set error state
 */
import { renderHook, act } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import { useKlarnaCheckout } from '../useKlarnaCheckout';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockOpenURL = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-linking', () => ({
  openURL: (...args: unknown[]) => mockOpenURL(...args),
  addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  createURL: jest.fn((path: string) => `carolinafutons://${path}`),
}));

const mockCreateKlarnaSession = jest.fn();
const mockConfirmKlarnaOrder = jest.fn();
jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => ({
    createKlarnaSession: mockCreateKlarnaSession,
    confirmKlarnaOrder: mockConfirmKlarnaOrder,
  }),
}));

const mockClearCart = jest.fn();
jest.mock('../useCart', () => ({
  useCart: () => ({
    items: [{ id: 'prod-001', quantity: 1, price: 299 }],
    subtotal: 299,
    clearCart: mockClearCart,
  }),
}));

jest.mock('../usePremium', () => ({
  usePremium: () => ({ isPremium: false }),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_SESSION = {
  redirectUrl: 'https://pay.klarna.com/checkout/abc123',
  orderId: 'order-klarna-001',
};

const MOCK_CONFIRMATION = {
  orderId: 'order-klarna-001',
  total: 299,
  currency: 'USD',
};

const MOCK_TOTALS = {
  subtotal: 299,
  shipping: 0,
  tax: 0,
  discount: 0,
  total: 299,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Session creation ──────────────────────────────────────────────────────────

describe('startCheckout — session creation', () => {
  it('transitions to processing state immediately', async () => {
    mockCreateKlarnaSession.mockResolvedValue(MOCK_SESSION);

    const { result } = renderHook(() => useKlarnaCheckout());
    expect(result.current.status).toBe('idle');

    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    expect(result.current.status).toBe('processing');
    await act(async () => {
      await promise;
    });
  });

  it('calls createKlarnaSession with amount in cents', async () => {
    mockCreateKlarnaSession.mockResolvedValue(MOCK_SESSION);
    mockConfirmKlarnaOrder.mockResolvedValue(MOCK_CONFIRMATION);

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    expect(mockCreateKlarnaSession).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 29900 }),
    );
  });

  it('calls Linking.openURL with the redirect URL', async () => {
    mockCreateKlarnaSession.mockResolvedValue(MOCK_SESSION);

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    expect(mockOpenURL).toHaveBeenCalledWith('https://pay.klarna.com/checkout/abc123');
  });

  it('transitions to awaiting_redirect after opening Klarna URL', async () => {
    mockCreateKlarnaSession.mockResolvedValue(MOCK_SESSION);

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    expect(result.current.status).toBe('awaiting_redirect');
  });

  it('registers a deep link listener while awaiting redirect', async () => {
    mockCreateKlarnaSession.mockResolvedValue(MOCK_SESSION);

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    expect(Linking.addEventListener).toHaveBeenCalledWith('url', expect.any(Function));
  });
});

// ── SSRF guard ────────────────────────────────────────────────────────────────

describe('startCheckout — SSRF guard on redirect URL', () => {
  it('rejects a non-Klarna redirect URL and sets error', async () => {
    mockCreateKlarnaSession.mockResolvedValue({
      redirectUrl: 'https://evil.com/phish',
      orderId: 'order-x',
    });

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/invalid/i);
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  it('rejects an http (non-HTTPS) Klarna URL', async () => {
    mockCreateKlarnaSession.mockResolvedValue({
      redirectUrl: 'http://pay.klarna.com/checkout/abc',
      orderId: 'order-x',
    });

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    expect(result.current.status).toBe('error');
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  it('rejects an empty redirect URL', async () => {
    mockCreateKlarnaSession.mockResolvedValue({ redirectUrl: '', orderId: 'order-x' });

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    expect(result.current.status).toBe('error');
    expect(mockOpenURL).not.toHaveBeenCalled();
  });
});

// ── Return URL handling ───────────────────────────────────────────────────────

describe('deep link return — success', () => {
  it('confirms the order and sets success state on success return URL', async () => {
    mockCreateKlarnaSession.mockResolvedValue(MOCK_SESSION);
    mockConfirmKlarnaOrder.mockResolvedValue(MOCK_CONFIRMATION);

    let capturedUrlHandler: ((event: { url: string }) => void) | null = null;
    (Linking.addEventListener as jest.Mock).mockImplementation((_event, handler) => {
      capturedUrlHandler = handler;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    // Simulate Klarna returning to the app
    await act(async () => {
      capturedUrlHandler?.({
        url: 'carolinafutons://klarna/return?status=success&orderId=order-klarna-001',
      });
    });

    expect(mockConfirmKlarnaOrder).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-klarna-001' }),
    );
    expect(result.current.status).toBe('success');
    expect(result.current.order).toEqual(MOCK_CONFIRMATION);
  });

  it('clears the cart after successful order confirmation', async () => {
    mockCreateKlarnaSession.mockResolvedValue(MOCK_SESSION);
    mockConfirmKlarnaOrder.mockResolvedValue(MOCK_CONFIRMATION);

    let capturedUrlHandler: ((event: { url: string }) => void) | null = null;
    (Linking.addEventListener as jest.Mock).mockImplementation((_event, handler) => {
      capturedUrlHandler = handler;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    await act(async () => {
      capturedUrlHandler?.({
        url: 'carolinafutons://klarna/return?status=success&orderId=order-klarna-001',
      });
    });

    expect(mockClearCart).toHaveBeenCalled();
  });

  it('removes the deep link listener after success', async () => {
    mockCreateKlarnaSession.mockResolvedValue(MOCK_SESSION);
    mockConfirmKlarnaOrder.mockResolvedValue(MOCK_CONFIRMATION);

    const mockRemove = jest.fn();
    let capturedUrlHandler: ((event: { url: string }) => void) | null = null;
    (Linking.addEventListener as jest.Mock).mockImplementation((_event, handler) => {
      capturedUrlHandler = handler;
      return { remove: mockRemove };
    });

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    await act(async () => {
      capturedUrlHandler?.({
        url: 'carolinafutons://klarna/return?status=success&orderId=order-klarna-001',
      });
    });

    expect(mockRemove).toHaveBeenCalled();
  });
});

describe('deep link return — cancel', () => {
  it('resets to idle on cancel return URL', async () => {
    mockCreateKlarnaSession.mockResolvedValue(MOCK_SESSION);

    let capturedUrlHandler: ((event: { url: string }) => void) | null = null;
    (Linking.addEventListener as jest.Mock).mockImplementation((_event, handler) => {
      capturedUrlHandler = handler;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    await act(async () => {
      capturedUrlHandler?.({
        url: 'carolinafutons://klarna/return?status=cancel&orderId=order-klarna-001',
      });
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(mockConfirmKlarnaOrder).not.toHaveBeenCalled();
    expect(mockClearCart).not.toHaveBeenCalled();
  });

  it('removes the deep link listener on cancel', async () => {
    mockCreateKlarnaSession.mockResolvedValue(MOCK_SESSION);

    const mockRemove = jest.fn();
    let capturedUrlHandler: ((event: { url: string }) => void) | null = null;
    (Linking.addEventListener as jest.Mock).mockImplementation((_event, handler) => {
      capturedUrlHandler = handler;
      return { remove: mockRemove };
    });

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    await act(async () => {
      capturedUrlHandler?.({
        url: 'carolinafutons://klarna/return?status=cancel&orderId=order-klarna-001',
      });
    });

    expect(mockRemove).toHaveBeenCalled();
  });
});

describe('deep link return — error', () => {
  it('sets error state on error return URL', async () => {
    mockCreateKlarnaSession.mockResolvedValue(MOCK_SESSION);

    let capturedUrlHandler: ((event: { url: string }) => void) | null = null;
    (Linking.addEventListener as jest.Mock).mockImplementation((_event, handler) => {
      capturedUrlHandler = handler;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    await act(async () => {
      capturedUrlHandler?.({
        url: 'carolinafutons://klarna/return?status=error&orderId=order-klarna-001',
      });
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBeTruthy();
  });

  it('sets error state when confirmKlarnaOrder throws', async () => {
    mockCreateKlarnaSession.mockResolvedValue(MOCK_SESSION);
    mockConfirmKlarnaOrder.mockRejectedValue(new Error('Confirmation failed'));

    let capturedUrlHandler: ((event: { url: string }) => void) | null = null;
    (Linking.addEventListener as jest.Mock).mockImplementation((_event, handler) => {
      capturedUrlHandler = handler;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    await act(async () => {
      capturedUrlHandler?.({
        url: 'carolinafutons://klarna/return?status=success&orderId=order-klarna-001',
      });
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBeTruthy();
    expect(mockClearCart).not.toHaveBeenCalled();
  });
});

// ── Network / API error handling ──────────────────────────────────────────────

describe('startCheckout — error states', () => {
  it('sets error state when createKlarnaSession throws a network error', async () => {
    mockCreateKlarnaSession.mockRejectedValue(new TypeError('fetch failed'));

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBeTruthy();
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  it('sets error state when Linking.openURL throws', async () => {
    mockCreateKlarnaSession.mockResolvedValue(MOCK_SESSION);
    mockOpenURL.mockRejectedValueOnce(new Error('Cannot open URL'));

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    expect(result.current.status).toBe('error');
  });

  it('does not process if wixClient is unavailable', async () => {
    // Override to return null client
    jest.doMock('@/services/wix', () => ({
      useOptionalWixClient: () => null,
    }));

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    // Reset mock for subsequent tests
    jest.doMock('@/services/wix', () => ({
      useOptionalWixClient: () => ({
        createKlarnaSession: mockCreateKlarnaSession,
        confirmKlarnaOrder: mockConfirmKlarnaOrder,
      }),
    }));
  });

  it('prevents double-submission while processing', async () => {
    let resolveSession: (v: unknown) => void;
    mockCreateKlarnaSession.mockReturnValue(
      new Promise((res) => {
        resolveSession = res;
      }),
    );

    const { result } = renderHook(() => useKlarnaCheckout());

    act(() => {
      result.current.startCheckout([{ id: 'prod-001', quantity: 1, price: 299 }], MOCK_TOTALS);
      result.current.startCheckout([{ id: 'prod-001', quantity: 1, price: 299 }], MOCK_TOTALS);
    });

    await act(async () => {
      resolveSession!(MOCK_SESSION);
    });

    expect(mockCreateKlarnaSession).toHaveBeenCalledTimes(1);
  });
});

// ── Amount validation ─────────────────────────────────────────────────────────

describe('startCheckout — amount validation', () => {
  it('rejects a zero-amount checkout', async () => {
    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout([{ id: 'prod-001', quantity: 1, price: 0 }], {
        ...MOCK_TOTALS,
        total: 0,
        subtotal: 0,
      });
    });

    expect(result.current.status).toBe('error');
    expect(mockCreateKlarnaSession).not.toHaveBeenCalled();
  });

  it('rejects a negative-amount checkout', async () => {
    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout([{ id: 'prod-001', quantity: 1, price: -10 }], {
        ...MOCK_TOTALS,
        total: -10,
        subtotal: -10,
      });
    });

    expect(result.current.status).toBe('error');
    expect(mockCreateKlarnaSession).not.toHaveBeenCalled();
  });
});

// ── reset ────────────────────────────────────────────────────────────────────

describe('reset', () => {
  it('clears error state', async () => {
    mockCreateKlarnaSession.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    expect(result.current.status).toBe('error');

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });
});

// ── Deep link listener cleanup ────────────────────────────────────────────────

describe('cleanup on unmount', () => {
  it('removes the deep link listener when the hook unmounts while awaiting redirect', async () => {
    mockCreateKlarnaSession.mockResolvedValue(MOCK_SESSION);

    const mockRemove = jest.fn();
    (Linking.addEventListener as jest.Mock).mockReturnValue({ remove: mockRemove });

    const { result, unmount } = renderHook(() => useKlarnaCheckout());
    await act(async () => {
      await result.current.startCheckout(
        [{ id: 'prod-001', quantity: 1, price: 299 }],
        MOCK_TOTALS,
      );
    });

    expect(result.current.status).toBe('awaiting_redirect');
    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });
});
