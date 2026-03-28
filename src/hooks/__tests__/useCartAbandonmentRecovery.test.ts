/**
 * useCartAbandonmentRecovery — TDD tests
 *
 * 1hr cart abandonment recovery push with web email dedup.
 * Rich payload: cart_items[0..2], total_price, cart_id.
 * Sets dedup flag on Wix member to suppress web email (cf-ji7j).
 *
 * Bead: hq-8k690
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import type { CartItem } from '@/hooks/useCart';
import {
  useCartAbandonmentRecovery,
  buildRecoveryPayload,
  RECOVERY_TRIGGER_MS,
} from '../useCartAbandonmentRecovery';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notif-123')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));

const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
const mockCancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;

const mockSetDedupFlag = jest.fn(() => Promise.resolve());

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => ({
    setMemberField: mockSetDedupFlag,
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

// Partial fixtures — hook only needs id/name from model, cast to satisfy type
const CART_ITEMS = [
  {
    id: 'asheville:linen',
    model: { id: 'asheville', name: 'The Asheville' },
    fabric: { id: 'linen', name: 'Natural Linen' },
    quantity: 1,
    unitPrice: 899,
    imageUrl: 'https://cdn.example.com/asheville.jpg',
  },
  {
    id: 'coastal:gray',
    model: { id: 'coastal', name: 'The Coastal' },
    fabric: { id: 'gray', name: 'Slate Gray' },
    quantity: 2,
    unitPrice: 749,
    imageUrl: 'https://cdn.example.com/coastal.jpg',
  },
  {
    id: 'mountain:blue',
    model: { id: 'mountain', name: 'The Mountain' },
    fabric: { id: 'blue', name: 'Mountain Blue' },
    quantity: 1,
    unitPrice: 599,
    imageUrl: 'https://cdn.example.com/mountain.jpg',
  },
  {
    id: 'rustic:coral',
    model: { id: 'rustic', name: 'The Rustic' },
    fabric: { id: 'coral', name: 'Sunset Coral' },
    quantity: 1,
    unitPrice: 449,
    imageUrl: null,
  },
] as unknown as CartItem[];

const DEFAULT_OPTS = {
  items: CART_ITEMS.slice(0, 2),
  subtotal: 2397,
  cartId: 'cart-abc-123',
  userId: 'member-1',
  pushPermitted: true,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useCartAbandonmentRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Happy path ──────────────────────────────────────────────────────────

  describe('happy path', () => {
    it('schedules a recovery push after 1hr of cart inactivity', async () => {
      const { result } = renderHook(() => useCartAbandonmentRecovery(DEFAULT_OPTS));

      await act(async () => {
        result.current.onCartActivity();
      });

      // Advance 1 hour
      jest.advanceTimersByTime(RECOVERY_TRIGGER_MS);
      await act(async () => {});

      expect(mockSchedule).toHaveBeenCalledTimes(1);
      expect(mockSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: expect.stringContaining('cart'),
            data: expect.objectContaining({
              type: 'cart_recovery',
              cart_id: 'cart-abc-123',
              deepLink: 'carolinafutons://cart',
            }),
          }),
        }),
      );
    });

    it('includes cart_items[0..2] in push payload', async () => {
      const opts = { ...DEFAULT_OPTS, items: CART_ITEMS };
      const { result } = renderHook(() => useCartAbandonmentRecovery(opts));

      await act(async () => {
        result.current.onCartActivity();
      });

      jest.advanceTimersByTime(RECOVERY_TRIGGER_MS);
      await act(async () => {});

      const payload = mockSchedule.mock.calls[0][0].content.data;
      expect(payload.cart_items).toHaveLength(3); // Capped at 3
      expect(payload.cart_items[0]).toMatchObject({
        name: 'The Asheville',
        price: 899,
      });
    });

    it('includes total_price in push payload', async () => {
      const { result } = renderHook(() => useCartAbandonmentRecovery(DEFAULT_OPTS));

      await act(async () => {
        result.current.onCartActivity();
      });

      jest.advanceTimersByTime(RECOVERY_TRIGGER_MS);
      await act(async () => {});

      const payload = mockSchedule.mock.calls[0][0].content.data;
      expect(payload.total_price).toBe(2397);
    });

    it('sets dedup flag on Wix member after scheduling push', async () => {
      const { result } = renderHook(() => useCartAbandonmentRecovery(DEFAULT_OPTS));

      await act(async () => {
        result.current.onCartActivity();
      });

      jest.advanceTimersByTime(RECOVERY_TRIGGER_MS);
      await act(async () => {});

      expect(mockSetDedupFlag).toHaveBeenCalledWith('member-1', 'cartRecoveryPushSent', true);
    });
  });

  // ── Empty cart ──────────────────────────────────────────────────────────

  describe('empty cart', () => {
    it('does not schedule push when cart is empty', async () => {
      const opts = { ...DEFAULT_OPTS, items: [] };
      const { result } = renderHook(() => useCartAbandonmentRecovery(opts));

      await act(async () => {
        result.current.onCartActivity();
      });

      jest.advanceTimersByTime(RECOVERY_TRIGGER_MS);
      await act(async () => {});

      expect(mockSchedule).not.toHaveBeenCalled();
    });
  });

  // ── Push disabled ──────────────────────────────────────────────────────

  describe('push disabled', () => {
    it('does not schedule push when permission denied', async () => {
      const opts = { ...DEFAULT_OPTS, pushPermitted: false };
      const { result } = renderHook(() => useCartAbandonmentRecovery(opts));

      await act(async () => {
        result.current.onCartActivity();
      });

      jest.advanceTimersByTime(RECOVERY_TRIGGER_MS);
      await act(async () => {});

      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it('does not set dedup flag when push permission denied (allow web email)', async () => {
      const opts = { ...DEFAULT_OPTS, pushPermitted: false };
      const { result } = renderHook(() => useCartAbandonmentRecovery(opts));

      await act(async () => {
        result.current.onCartActivity();
      });

      jest.advanceTimersByTime(RECOVERY_TRIGGER_MS);
      await act(async () => {});

      expect(mockSetDedupFlag).not.toHaveBeenCalled();
    });
  });

  // ── Logged out ─────────────────────────────────────────────────────────

  describe('logged out user', () => {
    it('does not schedule push when userId is null', async () => {
      const opts = { ...DEFAULT_OPTS, userId: null as unknown as string };
      const { result } = renderHook(() => useCartAbandonmentRecovery(opts));

      await act(async () => {
        result.current.onCartActivity();
      });

      jest.advanceTimersByTime(RECOVERY_TRIGGER_MS);
      await act(async () => {});

      expect(mockSchedule).not.toHaveBeenCalled();
    });
  });

  // ── Dedup flag ─────────────────────────────────────────────────────────

  describe('dedup with web email', () => {
    it('clears dedup flag when push is cancelled (e.g. order placed)', async () => {
      const { result } = renderHook(() => useCartAbandonmentRecovery(DEFAULT_OPTS));

      // Schedule a push
      await act(async () => {
        result.current.onCartActivity();
      });
      jest.advanceTimersByTime(RECOVERY_TRIGGER_MS);
      await act(async () => {});

      // Cancel it (order placed)
      await act(async () => {
        result.current.onOrderPlaced();
      });

      expect(mockSetDedupFlag).toHaveBeenLastCalledWith('member-1', 'cartRecoveryPushSent', false);
    });
  });

  // ── Timer reset ────────────────────────────────────────────────────────

  describe('timer management', () => {
    it('resets 1hr timer on new cart activity', async () => {
      const { result } = renderHook(() => useCartAbandonmentRecovery(DEFAULT_OPTS));

      await act(async () => {
        result.current.onCartActivity();
      });

      // Advance 30 min
      jest.advanceTimersByTime(RECOVERY_TRIGGER_MS / 2);

      // New activity resets timer
      await act(async () => {
        result.current.onCartActivity();
      });

      // Advance another 30 min — should NOT trigger (timer reset)
      jest.advanceTimersByTime(RECOVERY_TRIGGER_MS / 2);
      await act(async () => {});
      expect(mockSchedule).not.toHaveBeenCalled();

      // Advance full hour from second activity
      jest.advanceTimersByTime(RECOVERY_TRIGGER_MS / 2);
      await act(async () => {});
      expect(mockSchedule).toHaveBeenCalledTimes(1);
    });

    it('cancels pending timer on order placed', async () => {
      const { result } = renderHook(() => useCartAbandonmentRecovery(DEFAULT_OPTS));

      await act(async () => {
        result.current.onCartActivity();
      });

      await act(async () => {
        result.current.onOrderPlaced();
      });

      jest.advanceTimersByTime(RECOVERY_TRIGGER_MS);
      await act(async () => {});

      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it('cancels scheduled notification on order placed', async () => {
      const { result } = renderHook(() => useCartAbandonmentRecovery(DEFAULT_OPTS));

      // Let push schedule
      await act(async () => {
        result.current.onCartActivity();
      });
      jest.advanceTimersByTime(RECOVERY_TRIGGER_MS);
      await act(async () => {});

      expect(mockSchedule).toHaveBeenCalledTimes(1);

      // Order placed — cancel the scheduled notification
      await act(async () => {
        result.current.onOrderPlaced();
      });

      expect(mockCancel).toHaveBeenCalledWith('notif-123');
    });
  });
});

// ── buildRecoveryPayload ─────────────────────────────────────────────────

describe('buildRecoveryPayload', () => {
  it('caps cart_items at 3', () => {
    const payload = buildRecoveryPayload(CART_ITEMS, 3596, 'cart-xyz');
    expect(payload.cart_items).toHaveLength(3);
  });

  it('maps item fields correctly', () => {
    const payload = buildRecoveryPayload(CART_ITEMS.slice(0, 1), 899, 'cart-xyz');
    expect(payload.cart_items[0]).toEqual({
      name: 'The Asheville',
      image_url: 'https://cdn.example.com/asheville.jpg',
      price: 899,
    });
  });

  it('handles null image_url', () => {
    const payload = buildRecoveryPayload([CART_ITEMS[3]], 449, 'cart-xyz');
    expect(payload.cart_items[0].image_url).toBeNull();
  });

  it('includes total_price and cart_id', () => {
    const payload = buildRecoveryPayload(CART_ITEMS, 3596, 'cart-xyz');
    expect(payload.total_price).toBe(3596);
    expect(payload.cart_id).toBe('cart-xyz');
  });

  it('returns empty cart_items for empty array', () => {
    const payload = buildRecoveryPayload([], 0, 'cart-xyz');
    expect(payload.cart_items).toEqual([]);
  });
});
