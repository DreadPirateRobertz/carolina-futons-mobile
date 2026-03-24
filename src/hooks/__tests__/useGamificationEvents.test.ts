/**
 * Tests for useGamificationEvents hook — hq-825vi
 * TDD: tests written before implementation.
 *
 * Hook provides typed event functions that POST to the Wix gamification
 * endpoint via sendGamificationEvent. Unauthenticated calls are queued.
 */

import { renderHook } from '@testing-library/react-native';
import { useGamificationEvents } from '../useGamificationEvents';

// Use the real hook implementation (global setup mocks it for dependency isolation)
jest.unmock('@/hooks/useGamificationEvents');

// ── Mock gamificationApi ──────────────────────────────────────────────────────
const mockSendGamificationEvent = jest.fn();
jest.mock('@/services/gamificationApi', () => ({
  sendGamificationEvent: (...args: unknown[]) => mockSendGamificationEvent(...args),
  replayGamificationQueue: jest.fn(),
}));

// ── Mock wix ──────────────────────────────────────────────────────────────────
const mockWixClient = { callFunction: jest.fn() };
const mockUseOptionalWixClient = jest.fn();
jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

// ── Mock useAuth ──────────────────────────────────────────────────────────────
const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Mock analytics (gamification.ts fires analytics side-effect) ──────────────
jest.mock('@/services/analytics', () => ({
  trackEvent: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSendGamificationEvent.mockResolvedValue({ success: true, newTotal: 100 });
  mockUseOptionalWixClient.mockReturnValue(mockWixClient);
  mockUseAuth.mockReturnValue({ user: { id: 'member-abc', email: 'test@test.com' } });
});

describe('useGamificationEvents', () => {
  describe('addToCart', () => {
    it('calls sendGamificationEvent with correct event name and payload', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.addToCart('prod-1', 199.99);

      expect(mockSendGamificationEvent).toHaveBeenCalledWith(
        mockWixClient,
        expect.objectContaining({
          eventName: 'gamification_add_to_cart',
          memberId: 'member-abc',
          payload: expect.objectContaining({ product_id: 'prod-1', price: 199.99 }),
        }),
      );
    });
  });

  describe('submitReview', () => {
    it('calls sendGamificationEvent with review payload', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.submitReview('prod-2', 5, true);

      expect(mockSendGamificationEvent).toHaveBeenCalledWith(
        mockWixClient,
        expect.objectContaining({
          eventName: 'gamification_submit_review',
          memberId: 'member-abc',
          payload: expect.objectContaining({ product_id: 'prod-2', rating: 5, has_photo: true }),
        }),
      );
    });
  });

  describe('referralShared', () => {
    it('calls sendGamificationEvent with referral code', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.referralShared('REF-XYZ');

      expect(mockSendGamificationEvent).toHaveBeenCalledWith(
        mockWixClient,
        expect.objectContaining({
          eventName: 'gamification_referral_shared',
          payload: expect.objectContaining({ referral_code: 'REF-XYZ' }),
        }),
      );
    });
  });

  describe('arUsed', () => {
    it('calls sendGamificationEvent for AR event', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.arUsed('prod-3');

      expect(mockSendGamificationEvent).toHaveBeenCalledWith(
        mockWixClient,
        expect.objectContaining({
          eventName: 'gamification_ar_used',
          payload: expect.objectContaining({ product_id: 'prod-3' }),
        }),
      );
    });
  });

  describe('wishlistAdd', () => {
    it('calls sendGamificationEvent for wishlist event', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.wishlistAdd('prod-4');

      expect(mockSendGamificationEvent).toHaveBeenCalledWith(
        mockWixClient,
        expect.objectContaining({
          eventName: 'gamification_wishlist_add',
          payload: expect.objectContaining({ product_id: 'prod-4' }),
        }),
      );
    });
  });

  describe('unauthenticated user', () => {
    it('passes null memberId string when user not logged in (queued offline)', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.addToCart('prod-5', 50);

      // Event still sent (server will reject or queue) — memberId is empty string
      expect(mockSendGamificationEvent).toHaveBeenCalledWith(
        mockWixClient,
        expect.objectContaining({ memberId: '' }),
      );
    });
  });

  describe('no wixClient (offline)', () => {
    it('passes null client — sendGamificationEvent handles queueing', async () => {
      mockUseOptionalWixClient.mockReturnValue(null);
      mockSendGamificationEvent.mockResolvedValue({ success: false, queued: true });
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.addToCart('prod-6', 75);

      expect(mockSendGamificationEvent).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ eventName: 'gamification_add_to_cart' }),
      );
    });
  });

  describe('returns response', () => {
    it('returns sendGamificationEvent result including tierChanged', async () => {
      mockSendGamificationEvent.mockResolvedValue({
        success: true,
        newTotal: 600,
        tierChanged: true,
        newTier: 'silver',
      });
      const { result } = renderHook(() => useGamificationEvents());
      const response = await result.current.addToCart('prod-7', 299);

      expect(response.tierChanged).toBe(true);
      expect(response.newTier).toBe('silver');
    });
  });

  describe('error resilience', () => {
    it('does not throw when sendGamificationEvent rejects', async () => {
      mockSendGamificationEvent.mockRejectedValue(new Error('network'));
      const { result } = renderHook(() => useGamificationEvents());
      await expect(result.current.addToCart('prod-8', 100)).resolves.not.toThrow();
    });
  });

  // ── cfutons_mobile-r2o ───────────────────────────────────────────────────
  describe('orderPlaced', () => {
    it('calls sendGamificationEvent with correct event name and payload', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.orderPlaced('ord-abc', 422.43);

      expect(mockSendGamificationEvent).toHaveBeenCalledWith(
        mockWixClient,
        expect.objectContaining({
          eventName: 'gamification_order_placed',
          memberId: 'member-abc',
          payload: expect.objectContaining({ order_id: 'ord-abc', order_total: 422.43 }),
        }),
      );
    });

    it('uses orderId as eventId for server-side idempotency', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.orderPlaced('ord-idem-123', 299.99);

      expect(mockSendGamificationEvent).toHaveBeenCalledWith(
        mockWixClient,
        expect.objectContaining({ eventId: 'ord-idem-123' }),
      );
    });

    it('returns FALLBACK on network error', async () => {
      mockSendGamificationEvent.mockRejectedValue(new Error('network'));
      const { result } = renderHook(() => useGamificationEvents());
      const response = await result.current.orderPlaced('ord-err', 100);
      expect(response).toEqual({ success: false });
    });

    it('returns tierChanged and newTier for badge evaluation', async () => {
      mockSendGamificationEvent.mockResolvedValue({
        success: true,
        newTotal: 1500,
        tierChanged: true,
        newTier: 'gold',
      });
      const { result } = renderHook(() => useGamificationEvents());
      const response = await result.current.orderPlaced('ord-tier', 1200);
      expect(response.tierChanged).toBe(true);
      expect(response.newTier).toBe('gold');
    });
  });
});
