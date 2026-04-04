/**
 * TDD tests for usePriceAlertSubscription hook.
 *
 * Behaviour:
 *  - On mount, queries Wix PriceAlerts collection to check if user already subscribed
 *  - subscribe() inserts a record into PriceAlerts → isSubscribed=true
 *  - unsubscribe() deletes the record by ID → isSubscribed=false
 *  - No push token → subscribe/unsubscribe are graceful no-ops; isSubscribed stays false
 *  - No Wix client (dev) → subscribe/unsubscribe are graceful no-ops; isSubscribed stays false
 *  - Network error on subscribe → error set, isSubscribed unchanged, isLoading=false
 *  - Network error on unsubscribe → error set, isSubscribed unchanged, isLoading=false
 *  - Optimistic update: isSubscribed flips immediately, reverts on error
 *
 * Wix collection: PriceAlerts
 * Fields: productId, productSlug, pushToken, originalPrice, subscribedAt
 *
 * @bead cm-pda
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { usePriceAlertSubscription } from '../usePriceAlertSubscription';

// ── Mocks ─────────────────────────────────────────────────────────────��───────

const mockQueryData = jest.fn();
const mockInsertDataItem = jest.fn();
const mockDeleteDataItem = jest.fn();
let mockWixClient: {
  queryData: jest.Mock;
  insertDataItem: jest.Mock;
  deleteDataItem: jest.Mock;
} | null = null;

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

let mockPushToken: string | null = 'ExponentPushToken[test-token-abc123]';

jest.mock('@/hooks/useNotifications', () => ({
  useOptionalNotifications: () =>
    mockPushToken !== null
      ? {
          pushToken: mockPushToken,
          permissionStatus: 'granted',
          preferences: {},
          badgeCount: 0,
          requestPermission: jest.fn(),
          togglePreference: jest.fn(),
          setPreferences: jest.fn(),
          setBadgeCount: jest.fn(),
          clearBadge: jest.fn(),
        }
      : null,
}));

jest.mock('@/services/crashReporting', () => ({ captureException: jest.fn() }));

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRODUCT_ID = 'asheville-full';
const PRODUCT_SLUG = 'asheville-full';
const CURRENT_PRICE = 549;
const PUSH_TOKEN = 'ExponentPushToken[test-token-abc123]';
const ALERT_ID = 'alert-wix-001';

function makeAlertItem(overrides: Record<string, unknown> = {}) {
  return {
    id: ALERT_ID,
    productId: PRODUCT_ID,
    productSlug: PRODUCT_SLUG,
    pushToken: PUSH_TOKEN,
    originalPrice: CURRENT_PRICE,
    subscribedAt: '2026-04-04T12:00:00Z',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('usePriceAlertSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPushToken = PUSH_TOKEN;
    mockWixClient = {
      queryData: mockQueryData,
      insertDataItem: mockInsertDataItem,
      deleteDataItem: mockDeleteDataItem,
    };
    // Default: no existing subscription, no insert/delete configured yet
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
  });

  // ── Initial state ────────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with isLoading=true before mount check resolves', () => {
      mockQueryData.mockReturnValue(new Promise(() => {})); // never resolves
      const { result, unmount } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      expect(result.current.isLoading).toBe(true);
      unmount();
    });

    it('isSubscribed=false when no existing alert in collection', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isSubscribed).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('isSubscribed=true when an existing alert is found on mount', async () => {
      mockQueryData.mockResolvedValue({ items: [makeAlertItem()], totalResults: 1 });
      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isSubscribed).toBe(true);
    });

    it('queries PriceAlerts with productId + pushToken filter on mount', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      renderHook(() => usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE));
      await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
      expect(mockQueryData).toHaveBeenCalledWith('PriceAlerts', {
        filter: {
          productId: { $eq: PRODUCT_ID },
          pushToken: { $eq: PUSH_TOKEN },
        },
      });
    });
  });

  // ── No push token ────────────────────────────────────────────────────────────

  describe('no push token', () => {
    beforeEach(() => {
      mockPushToken = null;
    });

    it('skips mount query when no push token', async () => {
      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockQueryData).not.toHaveBeenCalled();
      expect(result.current.isSubscribed).toBe(false);
    });

    it('subscribe is a no-op when no push token', async () => {
      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => result.current.subscribe());
      expect(mockInsertDataItem).not.toHaveBeenCalled();
      expect(result.current.isSubscribed).toBe(false);
    });

    it('unsubscribe is a no-op when no push token', async () => {
      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => result.current.unsubscribe());
      expect(mockDeleteDataItem).not.toHaveBeenCalled();
    });
  });

  // ── No Wix client ────────────────────────────────────────────────────────────

  describe('no Wix client (dev / unconfigured)', () => {
    beforeEach(() => {
      mockWixClient = null;
    });

    it('skips mount query when no Wix client', async () => {
      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isSubscribed).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('subscribe is a no-op when no Wix client', async () => {
      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => result.current.subscribe());
      expect(result.current.isSubscribed).toBe(false);
    });
  });

  // ── subscribe() ───────────────────────────────────────────────────────────────

  describe('subscribe()', () => {
    it('inserts into PriceAlerts collection with correct fields', async () => {
      mockInsertDataItem.mockResolvedValue({ id: ALERT_ID, data: makeAlertItem() });
      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => result.current.subscribe());

      expect(mockInsertDataItem).toHaveBeenCalledWith(
        'PriceAlerts',
        expect.objectContaining({
          productId: PRODUCT_ID,
          productSlug: PRODUCT_SLUG,
          pushToken: PUSH_TOKEN,
          originalPrice: CURRENT_PRICE,
        }),
      );
      // subscribedAt is a recent ISO timestamp
      const insertedData = mockInsertDataItem.mock.calls[0][1];
      expect(typeof insertedData.subscribedAt).toBe('string');
      expect(new Date(insertedData.subscribedAt).getTime()).toBeGreaterThan(0);
    });

    it('sets isSubscribed=true after successful subscribe', async () => {
      mockInsertDataItem.mockResolvedValue({ id: ALERT_ID, data: makeAlertItem() });
      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => result.current.subscribe());
      expect(result.current.isSubscribed).toBe(true);
    });

    it('sets isLoading=false after subscribe resolves', async () => {
      mockInsertDataItem.mockResolvedValue({ id: ALERT_ID, data: makeAlertItem() });
      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => result.current.subscribe());
      expect(result.current.isLoading).toBe(false);
    });

    it('sets error and reverts isSubscribed on network failure', async () => {
      mockInsertDataItem.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => result.current.subscribe());

      expect(result.current.isSubscribed).toBe(false);
      expect(result.current.error).not.toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('does not call insert if already subscribed', async () => {
      mockQueryData.mockResolvedValue({ items: [makeAlertItem()], totalResults: 1 });
      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isSubscribed).toBe(true));

      await act(async () => result.current.subscribe());
      expect(mockInsertDataItem).not.toHaveBeenCalled();
    });
  });

  // ── unsubscribe() ─────────────────────────────────────────────────────────────

  describe('unsubscribe()', () => {
    it('deletes the alert record from PriceAlerts by stored ID', async () => {
      mockQueryData.mockResolvedValue({ items: [makeAlertItem()], totalResults: 1 });
      mockDeleteDataItem.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isSubscribed).toBe(true));

      await act(async () => result.current.unsubscribe());

      expect(mockDeleteDataItem).toHaveBeenCalledWith('PriceAlerts', ALERT_ID);
    });

    it('sets isSubscribed=false after successful unsubscribe', async () => {
      mockQueryData.mockResolvedValue({ items: [makeAlertItem()], totalResults: 1 });
      mockDeleteDataItem.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isSubscribed).toBe(true));

      await act(async () => result.current.unsubscribe());
      expect(result.current.isSubscribed).toBe(false);
    });

    it('reverts isSubscribed=true and sets error when delete fails', async () => {
      mockQueryData.mockResolvedValue({ items: [makeAlertItem()], totalResults: 1 });
      mockDeleteDataItem.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isSubscribed).toBe(true));

      await act(async () => result.current.unsubscribe());

      expect(result.current.isSubscribed).toBe(true);
      expect(result.current.error).not.toBeNull();
    });

    it('is a no-op when not currently subscribed', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => result.current.unsubscribe());
      expect(mockDeleteDataItem).not.toHaveBeenCalled();
    });
  });

  // ── mount query error ─────────────────────────────────────────────────────────

  describe('mount query error', () => {
    it('sets isLoading=false and isSubscribed=false when mount query fails', async () => {
      mockQueryData.mockRejectedValue(new Error('Fetch failed'));
      const { result } = renderHook(() =>
        usePriceAlertSubscription(PRODUCT_ID, PRODUCT_SLUG, CURRENT_PRICE),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isSubscribed).toBe(false);
    });
  });
});
