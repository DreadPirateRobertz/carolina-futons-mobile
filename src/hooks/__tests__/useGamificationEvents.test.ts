/**
 * Tests for useGamificationEvents hook — hq-825vi / cm-lwg
 * TDD: tests written before implementation.
 *
 * Hook provides typed event functions that POST to the Wix gamification
 * endpoint via sendGamificationEvent. Unauthenticated calls are queued.
 *
 * cm-lwg: arDiscoveryCompleted + socialShareCompleted wire to completeMobileChallenge.
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

// cf-ma6v: mock questRefreshBus
const mockEmitQuestRefresh = jest.fn();
jest.mock('@/services/questRefreshBus', () => ({
  emitQuestRefresh: () => mockEmitQuestRefresh(),
}));

// cm-lwg: mock completeMobileChallenge for AR discovery + social share dispatch
const mockCompleteMobileChallenge = jest.fn();
jest.mock('@/services/crossRigSync', () => ({
  completeMobileChallenge: (...args: unknown[]) => mockCompleteMobileChallenge(...args),
  MOBILE_CHALLENGE_TYPES: {
    ar_discovery: { points: 75, eventName: 'ar_discovery_completed' },
    quiz_completion: { points: 50, eventName: 'quiz_completed' },
    social_share: { points: 100, eventName: 'social_share_completed' },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSendGamificationEvent.mockResolvedValue({ success: true, newTotal: 100 });
  mockCompleteMobileChallenge.mockResolvedValue({ success: true, alreadyAwarded: false, pointsAwarded: 75 });
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

  // ── styleQuizComplete — cfutons_mobile-0l2 ───────────────────────────────

  describe('styleQuizComplete', () => {
    it('exposes styleQuizComplete function', () => {
      const { result } = renderHook(() => useGamificationEvents());
      expect(typeof result.current.styleQuizComplete).toBe('function');
    });

    it('fires gamification_style_quiz_complete event with style and size payload', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.styleQuizComplete('modern', 'full');

      expect(mockSendGamificationEvent).toHaveBeenCalledWith(
        mockWixClient,
        expect.objectContaining({
          eventName: 'gamification_style_quiz_complete',
          memberId: 'member-abc',
          payload: expect.objectContaining({
            style_preference: 'modern',
            size_needs: 'full',
          }),
        }),
      );
    });

    it('fires with rustic style preference', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.styleQuizComplete('rustic', 'queen');

      expect(mockSendGamificationEvent).toHaveBeenCalledWith(
        mockWixClient,
        expect.objectContaining({
          payload: expect.objectContaining({ style_preference: 'rustic', size_needs: 'queen' }),
        }),
      );
    });

    it('fires with classic style preference', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.styleQuizComplete('classic', 'twin');

      expect(mockSendGamificationEvent).toHaveBeenCalledWith(
        mockWixClient,
        expect.objectContaining({
          payload: expect.objectContaining({ style_preference: 'classic', size_needs: 'twin' }),
        }),
      );
    });

    it('returns sendGamificationEvent result', async () => {
      mockSendGamificationEvent.mockResolvedValue({ success: true, newTotal: 100 });
      const { result } = renderHook(() => useGamificationEvents());
      const response = await result.current.styleQuizComplete('modern', 'full');

      expect(response.success).toBe(true);
    });

    it('does not throw when unauthenticated (empty memberId)', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      const { result } = renderHook(() => useGamificationEvents());
      await expect(result.current.styleQuizComplete('modern', 'full')).resolves.not.toThrow();
    });

    it('does not throw when sendGamificationEvent rejects', async () => {
      mockSendGamificationEvent.mockRejectedValue(new Error('network'));
      const { result } = renderHook(() => useGamificationEvents());
      await expect(result.current.styleQuizComplete('modern', 'full')).resolves.not.toThrow();
    });

    it('passes null wixClient when unavailable', async () => {
      mockUseOptionalWixClient.mockReturnValue(null);
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.styleQuizComplete('rustic', 'full');

      expect(mockSendGamificationEvent).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ eventName: 'gamification_style_quiz_complete' }),
      );
    });
  });

  // ── questRefreshBus emission (cf-ma6v) ───────────────────────────────────

  describe('questRefreshBus', () => {
    it('emits quest refresh after successful addToCart', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.addToCart('prod-1', 49.99);
      expect(mockEmitQuestRefresh).toHaveBeenCalledTimes(1);
    });

    it('emits quest refresh after successful submitReview', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.submitReview('prod-1', 5, false);
      expect(mockEmitQuestRefresh).toHaveBeenCalledTimes(1);
    });

    it('emits quest refresh after successful arUsed', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.arUsed('prod-1');
      expect(mockEmitQuestRefresh).toHaveBeenCalledTimes(1);
    });

    it('emits quest refresh after successful wishlistAdd', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.wishlistAdd('prod-1');
      expect(mockEmitQuestRefresh).toHaveBeenCalledTimes(1);
    });

    it('emits quest refresh after successful orderPlaced', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.orderPlaced('order-1', 299.99);
      expect(mockEmitQuestRefresh).toHaveBeenCalledTimes(1);
    });

    it('emits quest refresh after successful styleQuizComplete', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.styleQuizComplete('modern', 'full');
      expect(mockEmitQuestRefresh).toHaveBeenCalledTimes(1);
    });

    it('does NOT emit quest refresh when event fails', async () => {
      mockSendGamificationEvent.mockResolvedValue({ success: false });
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.addToCart('prod-1', 49.99);
      expect(mockEmitQuestRefresh).not.toHaveBeenCalled();
    });

    it('does NOT emit quest refresh when event throws', async () => {
      mockSendGamificationEvent.mockRejectedValue(new Error('network'));
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.addToCart('prod-1', 49.99);
      expect(mockEmitQuestRefresh).not.toHaveBeenCalled();
    });
  });

  // ── cm-lwg: arDiscoveryCompleted ────────────────────────────────────────────

  describe('arDiscoveryCompleted', () => {
    it('calls completeMobileChallenge with ar_discovery challenge type', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.arDiscoveryCompleted('prod-ar-1');

      expect(mockCompleteMobileChallenge).toHaveBeenCalledWith(
        mockWixClient,
        'member-abc',
        'ar_discovery',
        expect.objectContaining({ productId: 'prod-ar-1' }),
      );
    });

    it('calls completeMobileChallenge without productId when omitted', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.arDiscoveryCompleted();

      expect(mockCompleteMobileChallenge).toHaveBeenCalledWith(
        mockWixClient,
        'member-abc',
        'ar_discovery',
        {},
      );
    });

    it('returns result from completeMobileChallenge', async () => {
      mockCompleteMobileChallenge.mockResolvedValue({
        success: true,
        alreadyAwarded: false,
        pointsAwarded: 75,
      });
      const { result } = renderHook(() => useGamificationEvents());
      const res = await result.current.arDiscoveryCompleted('prod-ar-1');

      expect(res).toEqual({ success: true, alreadyAwarded: false, pointsAwarded: 75 });
    });

    it('emits quest refresh on fresh completion (alreadyAwarded: false)', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.arDiscoveryCompleted('prod-ar-1');
      expect(mockEmitQuestRefresh).toHaveBeenCalledTimes(1);
    });

    it('does NOT emit quest refresh when alreadyAwarded (idempotency)', async () => {
      mockCompleteMobileChallenge.mockResolvedValue({
        success: true,
        alreadyAwarded: true,
        pointsAwarded: 0,
      });
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.arDiscoveryCompleted('prod-ar-1');
      expect(mockEmitQuestRefresh).not.toHaveBeenCalled();
    });

    it('returns fallback when completeMobileChallenge throws', async () => {
      mockCompleteMobileChallenge.mockRejectedValue(new Error('network'));
      const { result } = renderHook(() => useGamificationEvents());
      const res = await result.current.arDiscoveryCompleted('prod-ar-1');

      expect(res).toEqual({ success: false, alreadyAwarded: false, pointsAwarded: 0 });
    });

    it('returns fallback when no wixClient (unauthenticated/offline)', async () => {
      mockUseOptionalWixClient.mockReturnValue(null);
      const { result } = renderHook(() => useGamificationEvents());
      const res = await result.current.arDiscoveryCompleted('prod-ar-1');

      expect(res).toEqual({ success: false, alreadyAwarded: false, pointsAwarded: 0 });
      expect(mockCompleteMobileChallenge).not.toHaveBeenCalled();
    });

    it('returns fallback when memberId is empty (not logged in)', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      const { result } = renderHook(() => useGamificationEvents());
      const res = await result.current.arDiscoveryCompleted('prod-ar-1');

      expect(res).toEqual({ success: false, alreadyAwarded: false, pointsAwarded: 0 });
      expect(mockCompleteMobileChallenge).not.toHaveBeenCalled();
    });

    it('does NOT emit quest refresh on error', async () => {
      mockCompleteMobileChallenge.mockRejectedValue(new Error('server error'));
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.arDiscoveryCompleted('prod-ar-1');
      expect(mockEmitQuestRefresh).not.toHaveBeenCalled();
    });
  });

  // ── cm-lwg: socialShareCompleted ────────────────────────────────────────────

  describe('socialShareCompleted', () => {
    it('calls completeMobileChallenge with social_share challenge type', async () => {
      mockCompleteMobileChallenge.mockResolvedValue({
        success: true,
        alreadyAwarded: false,
        pointsAwarded: 100,
      });
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.socialShareCompleted('instagram');

      expect(mockCompleteMobileChallenge).toHaveBeenCalledWith(
        mockWixClient,
        'member-abc',
        'social_share',
        expect.objectContaining({ platform: 'instagram' }),
      );
    });

    it('calls completeMobileChallenge without platform when omitted', async () => {
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.socialShareCompleted();

      expect(mockCompleteMobileChallenge).toHaveBeenCalledWith(
        mockWixClient,
        'member-abc',
        'social_share',
        {},
      );
    });

    it('returns result from completeMobileChallenge', async () => {
      mockCompleteMobileChallenge.mockResolvedValue({
        success: true,
        alreadyAwarded: false,
        pointsAwarded: 100,
      });
      const { result } = renderHook(() => useGamificationEvents());
      const res = await result.current.socialShareCompleted('twitter');

      expect(res).toEqual({ success: true, alreadyAwarded: false, pointsAwarded: 100 });
    });

    it('emits quest refresh on fresh share completion (alreadyAwarded: false)', async () => {
      mockCompleteMobileChallenge.mockResolvedValue({
        success: true,
        alreadyAwarded: false,
        pointsAwarded: 100,
      });
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.socialShareCompleted('facebook');
      expect(mockEmitQuestRefresh).toHaveBeenCalledTimes(1);
    });

    it('does NOT emit quest refresh when alreadyAwarded (idempotency)', async () => {
      mockCompleteMobileChallenge.mockResolvedValue({
        success: true,
        alreadyAwarded: true,
        pointsAwarded: 0,
      });
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.socialShareCompleted('instagram');
      expect(mockEmitQuestRefresh).not.toHaveBeenCalled();
    });

    it('returns fallback when completeMobileChallenge throws', async () => {
      mockCompleteMobileChallenge.mockRejectedValue(new Error('network'));
      const { result } = renderHook(() => useGamificationEvents());
      const res = await result.current.socialShareCompleted('instagram');

      expect(res).toEqual({ success: false, alreadyAwarded: false, pointsAwarded: 0 });
    });

    it('returns fallback when no wixClient', async () => {
      mockUseOptionalWixClient.mockReturnValue(null);
      const { result } = renderHook(() => useGamificationEvents());
      const res = await result.current.socialShareCompleted('instagram');

      expect(res).toEqual({ success: false, alreadyAwarded: false, pointsAwarded: 0 });
      expect(mockCompleteMobileChallenge).not.toHaveBeenCalled();
    });

    it('returns fallback when memberId is empty', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      const { result } = renderHook(() => useGamificationEvents());
      const res = await result.current.socialShareCompleted('instagram');

      expect(res).toEqual({ success: false, alreadyAwarded: false, pointsAwarded: 0 });
      expect(mockCompleteMobileChallenge).not.toHaveBeenCalled();
    });

    it('does NOT emit quest refresh on error', async () => {
      mockCompleteMobileChallenge.mockRejectedValue(new Error('server error'));
      const { result } = renderHook(() => useGamificationEvents());
      await result.current.socialShareCompleted('instagram');
      expect(mockEmitQuestRefresh).not.toHaveBeenCalled();
    });
  });
});
