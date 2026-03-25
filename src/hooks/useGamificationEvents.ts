/**
 * @module useGamificationEvents
 *
 * React hook providing typed gamification event functions that POST to the
 * Wix /_functions/gamificationEvent endpoint (hq-825vi).
 *
 * Replaces direct gamification.ts analytics-only calls. Each function:
 *   1. Fires the API event via sendGamificationEvent (with offline queue fallback)
 *   2. Returns the server response — callers should feed response.tierChanged
 *      into useTriggerMoments.reportTierChange when that API is available.
 *
 * Call sites:
 *   addToCart     — useCart.tsx on cart add
 *   submitReview  — useReviews.ts on review submit
 *   referralShared— AccountScreen.tsx after Share.share
 *   arUsed        — ProductDetailScreen.tsx on AR open
 *   wishlistAdd   — useWishlist.tsx on wishlist add
 *
 * hq-825vi / Phase 5+
 */

import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOptionalWixClient } from '@/services/wix';
import { sendGamificationEvent, type GamificationEventResult } from '@/services/gamificationApi';
import { emitQuestRefresh } from '@/services/questRefreshBus';

export interface GamificationEvents {
  addToCart: (productId: string, price: number) => Promise<GamificationEventResult>;
  submitReview: (
    productId: string,
    rating: number,
    hasPhoto: boolean,
  ) => Promise<GamificationEventResult>;
  referralShared: (code: string) => Promise<GamificationEventResult>;
  arUsed: (productId: string) => Promise<GamificationEventResult>;
  wishlistAdd: (productId: string) => Promise<GamificationEventResult>;
  /** cfutons_mobile-r2o: orderId doubles as idempotency key to prevent double-counting. */
  orderPlaced: (orderId: string, orderTotal: number) => Promise<GamificationEventResult>;
  styleQuizComplete: (
    stylePreference: string,
    sizeNeeds: string,
  ) => Promise<GamificationEventResult>;
}

const FALLBACK: GamificationEventResult = { success: false };

/** cf-ma6v: emit quest refresh after any successful gamification event. */
function withQuestRefresh(result: GamificationEventResult): GamificationEventResult {
  if (result.success) emitQuestRefresh();
  return result;
}

export function useGamificationEvents(): GamificationEvents {
  const wixClient = useOptionalWixClient();
  const { user } = useAuth();
  const memberId = user?.id ?? '';

  const addToCart = useCallback(
    async (productId: string, price: number): Promise<GamificationEventResult> => {
      try {
        return withQuestRefresh(await sendGamificationEvent(wixClient ?? null, {
          eventName: 'gamification_add_to_cart',
          memberId,
          payload: { product_id: productId, price },
        }));
      } catch {
        return FALLBACK;
      }
    },
    [wixClient, memberId],
  );

  const submitReview = useCallback(
    async (
      productId: string,
      rating: number,
      hasPhoto: boolean,
    ): Promise<GamificationEventResult> => {
      try {
        return withQuestRefresh(await sendGamificationEvent(wixClient ?? null, {
          eventName: 'gamification_submit_review',
          memberId,
          payload: { product_id: productId, rating, has_photo: hasPhoto },
        }));
      } catch {
        return FALLBACK;
      }
    },
    [wixClient, memberId],
  );

  const referralShared = useCallback(
    async (code: string): Promise<GamificationEventResult> => {
      try {
        return withQuestRefresh(await sendGamificationEvent(wixClient ?? null, {
          eventName: 'gamification_referral_shared',
          memberId,
          payload: { referral_code: code },
        }));
      } catch {
        return FALLBACK;
      }
    },
    [wixClient, memberId],
  );

  const arUsed = useCallback(
    async (productId: string): Promise<GamificationEventResult> => {
      try {
        return withQuestRefresh(await sendGamificationEvent(wixClient ?? null, {
          eventName: 'gamification_ar_used',
          memberId,
          payload: { product_id: productId },
        }));
      } catch {
        return FALLBACK;
      }
    },
    [wixClient, memberId],
  );

  const wishlistAdd = useCallback(
    async (productId: string): Promise<GamificationEventResult> => {
      try {
        return withQuestRefresh(await sendGamificationEvent(wixClient ?? null, {
          eventName: 'gamification_wishlist_add',
          memberId,
          payload: { product_id: productId },
        }));
      } catch {
        return FALLBACK;
      }
    },
    [wixClient, memberId],
  );

  const orderPlaced = useCallback(
    async (orderId: string, orderTotal: number): Promise<GamificationEventResult> => {
      try {
        return withQuestRefresh(await sendGamificationEvent(wixClient ?? null, {
          eventName: 'gamification_order_placed',
          memberId,
          payload: { order_id: orderId, order_total: orderTotal },
          eventId: orderId,
        }));
      } catch {
        return FALLBACK;
      }
    },
    [wixClient, memberId],
  );

  const styleQuizComplete = useCallback(
    async (stylePreference: string, sizeNeeds: string): Promise<GamificationEventResult> => {
      try {
        return withQuestRefresh(await sendGamificationEvent(wixClient ?? null, {
          eventName: 'gamification_style_quiz_complete',
          memberId,
          payload: { style_preference: stylePreference, size_needs: sizeNeeds },
        }));
      } catch {
        return FALLBACK;
      }
    },
    [wixClient, memberId],
  );

  return {
    addToCart,
    submitReview,
    referralShared,
    arUsed,
    wishlistAdd,
    orderPlaced,
    styleQuizComplete,
  };
}
