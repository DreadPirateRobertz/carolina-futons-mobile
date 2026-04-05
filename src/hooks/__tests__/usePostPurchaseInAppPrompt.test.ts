/**
 * Tests for usePostPurchaseInAppPrompt — cm-qbt
 *
 * AC:
 *  1. Shows in-app prompt on next launch after T+3 days since order placed
 *  2. Does not show prompt before T+3 days
 *  3. Does not show prompt if order already reviewed
 *  4. dismiss() applies cooldown — prompt re-appears after cooldown expires
 *  5. markReviewed() permanently hides prompt for the order
 *  6. Re-checks on AppState 'active' (app foreground)
 */

import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  usePostPurchaseInAppPrompt,
  PUSH_STORAGE_PREFIX,
  NUDGES_INDEX_KEY,
  IN_APP_DISMISS_COOLDOWN_MS,
} from '../usePostPurchaseInAppPrompt';

// --- Constants ---

const ORDER_A = 'order-aaa';
const ORDER_B = 'order-bbb';
const PRODUCT_A = 'prod-futon-1';
const PRODUCT_B = 'prod-futon-2';

const NOW = Date.now();
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const PLACED_4_DAYS_AGO = new Date(NOW - 4 * 24 * 60 * 60 * 1000).toISOString();
const PLACED_2_DAYS_AGO = new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString();

// --- Helpers ---

function storageKey(orderId: string) {
  return `${PUSH_STORAGE_PREFIX}${orderId}`;
}

function makeRecord(
  orderId: string,
  productId: string,
  placedAt: string,
  overrides: Record<string, unknown> = {},
) {
  return JSON.stringify({ orderId, productId, placedAt, ...overrides });
}

/** Render hook and flush mount effects */
async function renderLoaded() {
  const hook = renderHook(() => usePostPurchaseInAppPrompt());
  await act(async () => {});
  return hook;
}

// --- AppState spy ---

// Spy on AppState.addEventListener so we can simulate foreground events
// without importing native modules directly.
let appStateCallback: ((state: string) => void) | null = null;
const appStateSpy = jest
  .spyOn(AppState, 'addEventListener')
  .mockImplementation((_event: string, handler: (state: string) => void) => {
    appStateCallback = handler;
    return { remove: jest.fn() };
  });

// --- Tests ---

describe('usePostPurchaseInAppPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStateCallback = null;
    appStateSpy.mockImplementation((_event: string, handler: (state: string) => void) => {
      appStateCallback = handler;
      return { remove: jest.fn() };
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  // --- AC 1 & 2: Show/hide based on time elapsed ---

  describe('prompt visibility', () => {
    it('returns null when no orders in index', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = await renderLoaded();

      expect(result.current.pendingOrder).toBeNull();
    });

    it('returns null when index is empty array', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([]));
        return Promise.resolve(null);
      });

      const { result } = await renderLoaded();

      expect(result.current.pendingOrder).toBeNull();
    });

    it('returns null when order placed < 3 days ago', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([ORDER_A]));
        if (key === storageKey(ORDER_A))
          return Promise.resolve(makeRecord(ORDER_A, PRODUCT_A, PLACED_2_DAYS_AGO));
        return Promise.resolve(null);
      });

      const { result } = await renderLoaded();

      expect(result.current.pendingOrder).toBeNull();
    });

    it('returns pending order when placed >= 3 days ago and not reviewed/dismissed', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([ORDER_A]));
        if (key === storageKey(ORDER_A))
          return Promise.resolve(makeRecord(ORDER_A, PRODUCT_A, PLACED_4_DAYS_AGO));
        return Promise.resolve(null);
      });

      const { result } = await renderLoaded();

      expect(result.current.pendingOrder).not.toBeNull();
      expect(result.current.pendingOrder?.orderId).toBe(ORDER_A);
      expect(result.current.pendingOrder?.productId).toBe(PRODUCT_A);
    });
  });

  // --- AC 3: Skip reviewed orders ---

  describe('reviewed orders', () => {
    it('returns null when order is already reviewed', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([ORDER_A]));
        if (key === storageKey(ORDER_A))
          return Promise.resolve(
            makeRecord(ORDER_A, PRODUCT_A, PLACED_4_DAYS_AGO, {
              reviewedAt: '2026-04-01T00:00:00Z',
            }),
          );
        return Promise.resolve(null);
      });

      const { result } = await renderLoaded();

      expect(result.current.pendingOrder).toBeNull();
    });

    it('skips reviewed orders and returns next qualifying one', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY)
          return Promise.resolve(JSON.stringify([ORDER_A, ORDER_B]));
        if (key === storageKey(ORDER_A))
          return Promise.resolve(
            makeRecord(ORDER_A, PRODUCT_A, PLACED_4_DAYS_AGO, {
              reviewedAt: '2026-04-01T00:00:00Z',
            }),
          );
        if (key === storageKey(ORDER_B))
          return Promise.resolve(makeRecord(ORDER_B, PRODUCT_B, PLACED_4_DAYS_AGO));
        return Promise.resolve(null);
      });

      const { result } = await renderLoaded();

      expect(result.current.pendingOrder?.orderId).toBe(ORDER_B);
    });
  });

  // --- AC 4: dismiss() with cooldown ---

  describe('dismiss', () => {
    it('returns null after dismissal during cooldown', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([ORDER_A]));
        if (key === storageKey(ORDER_A))
          return Promise.resolve(makeRecord(ORDER_A, PRODUCT_A, PLACED_4_DAYS_AGO));
        return Promise.resolve(null);
      });

      const { result } = await renderLoaded();
      expect(result.current.pendingOrder?.orderId).toBe(ORDER_A);

      // After dismiss, update storage to reflect cooldown
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([ORDER_A]));
        if (key === storageKey(ORDER_A))
          return Promise.resolve(
            makeRecord(ORDER_A, PRODUCT_A, PLACED_4_DAYS_AGO, {
              inAppDismissedUntil: Date.now() + IN_APP_DISMISS_COOLDOWN_MS,
            }),
          );
        return Promise.resolve(null);
      });

      await act(async () => {
        await result.current.dismiss();
      });

      expect(result.current.pendingOrder).toBeNull();
    });

    it('persists dismissedUntil timestamp to AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([ORDER_A]));
        if (key === storageKey(ORDER_A))
          return Promise.resolve(makeRecord(ORDER_A, PRODUCT_A, PLACED_4_DAYS_AGO));
        return Promise.resolve(null);
      });

      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.dismiss();
      });

      const writeCall = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
        ([key]: [string]) => key === storageKey(ORDER_A),
      );
      expect(writeCall).toBeDefined();
      const saved = JSON.parse(writeCall[1]);
      expect(saved.inAppDismissedUntil).toBeGreaterThan(Date.now());
    });

    it('returns prompt again after cooldown expires', async () => {
      const expiredCooldown = Date.now() - 1000; // already expired
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([ORDER_A]));
        if (key === storageKey(ORDER_A))
          return Promise.resolve(
            makeRecord(ORDER_A, PRODUCT_A, PLACED_4_DAYS_AGO, {
              inAppDismissedUntil: expiredCooldown,
            }),
          );
        return Promise.resolve(null);
      });

      const { result } = await renderLoaded();

      expect(result.current.pendingOrder?.orderId).toBe(ORDER_A);
    });

    it('hides prompt during active cooldown', async () => {
      const activeCooldown = Date.now() + IN_APP_DISMISS_COOLDOWN_MS;
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([ORDER_A]));
        if (key === storageKey(ORDER_A))
          return Promise.resolve(
            makeRecord(ORDER_A, PRODUCT_A, PLACED_4_DAYS_AGO, {
              inAppDismissedUntil: activeCooldown,
            }),
          );
        return Promise.resolve(null);
      });

      const { result } = await renderLoaded();

      expect(result.current.pendingOrder).toBeNull();
    });
  });

  // --- AC 5: markReviewed() permanently hides prompt ---

  describe('markReviewed', () => {
    it('clears pendingOrder after markReviewed', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([ORDER_A]));
        if (key === storageKey(ORDER_A))
          return Promise.resolve(makeRecord(ORDER_A, PRODUCT_A, PLACED_4_DAYS_AGO));
        return Promise.resolve(null);
      });

      const { result } = await renderLoaded();
      expect(result.current.pendingOrder?.orderId).toBe(ORDER_A);

      // After markReviewed, update storage to reflect reviewed state
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([ORDER_A]));
        if (key === storageKey(ORDER_A))
          return Promise.resolve(
            makeRecord(ORDER_A, PRODUCT_A, PLACED_4_DAYS_AGO, {
              reviewedAt: new Date().toISOString(),
            }),
          );
        return Promise.resolve(null);
      });

      await act(async () => {
        await result.current.markReviewed();
      });

      expect(result.current.pendingOrder).toBeNull();
    });

    it('persists reviewedAt to AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([ORDER_A]));
        if (key === storageKey(ORDER_A))
          return Promise.resolve(makeRecord(ORDER_A, PRODUCT_A, PLACED_4_DAYS_AGO));
        return Promise.resolve(null);
      });

      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.markReviewed();
      });

      const writeCall = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
        ([key]: [string]) => key === storageKey(ORDER_A),
      );
      expect(writeCall).toBeDefined();
      const saved = JSON.parse(writeCall[1]);
      expect(saved.reviewedAt).toBeTruthy();
    });
  });

  // --- AC 6: Re-checks on AppState 'active' ---

  describe('AppState integration', () => {
    it('registers AppState listener on mount', async () => {
      await renderLoaded();

      expect(appStateSpy).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('removes AppState listener on unmount', async () => {
      const removeMock = jest.fn();
      appStateSpy.mockImplementationOnce((_event: string, handler: (state: string) => void) => {
        appStateCallback = handler;
        return { remove: removeMock };
      });

      const { unmount } = await renderLoaded();
      unmount();

      expect(removeMock).toHaveBeenCalled();
    });

    it('re-checks orders when app comes to foreground (active state)', async () => {
      // Initially: order not yet 3 days old
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([ORDER_A]));
        if (key === storageKey(ORDER_A))
          return Promise.resolve(makeRecord(ORDER_A, PRODUCT_A, PLACED_2_DAYS_AGO));
        return Promise.resolve(null);
      });

      const { result } = await renderLoaded();
      expect(result.current.pendingOrder).toBeNull();

      // Simulate time passing — order now qualifies
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([ORDER_A]));
        if (key === storageKey(ORDER_A))
          return Promise.resolve(makeRecord(ORDER_A, PRODUCT_A, PLACED_4_DAYS_AGO));
        return Promise.resolve(null);
      });

      // Trigger app foreground event
      await act(async () => {
        appStateCallback?.('active');
      });

      expect(result.current.pendingOrder?.orderId).toBe(ORDER_A);
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('handles AsyncStorage read error gracefully (no crash)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const { result } = await renderLoaded();

      expect(result.current.pendingOrder).toBeNull();
    });

    it('handles malformed index JSON gracefully (no crash)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve('not-valid-json{{{');
        return Promise.resolve(null);
      });

      const { result } = await renderLoaded();

      expect(result.current.pendingOrder).toBeNull();
    });

    it('handles malformed order record JSON gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([ORDER_A]));
        if (key === storageKey(ORDER_A)) return Promise.resolve('{{invalid}}');
        return Promise.resolve(null);
      });

      const { result } = await renderLoaded();

      expect(result.current.pendingOrder).toBeNull();
    });

    it('handles dismiss() with no pendingOrder gracefully (no crash)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = await renderLoaded();
      expect(result.current.pendingOrder).toBeNull();

      await act(async () => {
        await result.current.dismiss();
      });

      // Should not throw
    });

    it('handles markReviewed() with no pendingOrder gracefully (no crash)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.markReviewed();
      });

      // Should not throw
    });

    it('skips orders with missing or invalid placedAt in index', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([ORDER_A]));
        if (key === storageKey(ORDER_A))
          return Promise.resolve(makeRecord(ORDER_A, PRODUCT_A, 'bad-date'));
        return Promise.resolve(null);
      });

      const { result } = await renderLoaded();

      expect(result.current.pendingOrder).toBeNull();
    });
  });
});
