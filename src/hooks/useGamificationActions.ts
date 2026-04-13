/**
 * @module useGamificationActions
 *
 * Awards loyalty points for high-value gamification actions. Each function is
 * best-effort: failures are logged but never surfaced to the user (non-fatal).
 * Empty/missing IDs skip the award entirely to prevent ghost records.
 *
 * Point values (from LoyaltyActions spec):
 *   AR try-on:          5 pts  — low friction, high frequency
 *   Room photo upload: 25 pts  — high-value UGC contribution
 *   Product review:    10 pts  — social proof contribution
 *
 * hq-1jcj
 */

import { useCallback } from 'react';
import { useLoyalty } from '@/hooks/useLoyalty';

export interface UseGamificationActionsResult {
  /**
   * Award 5 points when a member uses AR try-on for a product.
   * @param productId - Wix product ID. No-op if empty.
   */
  awardForARTryOn: (productId: string) => Promise<void>;

  /**
   * Award 25 points when a member uploads an approved room photo.
   * @param photoId - Wix media/photo ID. No-op if empty.
   */
  awardForRoomPhoto: (photoId: string) => Promise<void>;

  /**
   * Award 10 points when a member submits a product review.
   * @param productId - Wix product ID. No-op if empty.
   */
  awardForProductReview: (productId: string) => Promise<void>;
}

/**
 * Returns stable action handlers for awarding gamification loyalty points.
 * All handlers are memoized with useCallback — safe to pass as props or deps.
 */
export function useGamificationActions(): UseGamificationActionsResult {
  const { awardPoints } = useLoyalty();

  const awardForARTryOn = useCallback(
    async (productId: string): Promise<void> => {
      // Guard: skip award for blank IDs — prevents ghost LoyaltyActions records
      if (!productId?.trim()) return;

      try {
        await awardPoints({ action: 'ar_try_on', productId, points: 5 });
      } catch (err) {
        // Non-fatal — points award should never block AR UX
        console.error('[useGamificationActions] awardForARTryOn failed:', err);
      }
    },
    [awardPoints],
  );

  const awardForRoomPhoto = useCallback(
    async (photoId: string): Promise<void> => {
      // Guard: skip award for blank IDs — prevents ghost LoyaltyActions records
      if (!photoId?.trim()) return;

      try {
        await awardPoints({ action: 'room_photo_upload', photoId, points: 25 });
      } catch (err) {
        // Non-fatal — points award should never block photo upload confirmation
        console.error('[useGamificationActions] awardForRoomPhoto failed:', err);
      }
    },
    [awardPoints],
  );

  const awardForProductReview = useCallback(
    async (productId: string): Promise<void> => {
      // Guard: skip award for blank IDs — prevents ghost LoyaltyActions records
      if (!productId?.trim()) return;

      try {
        await awardPoints({ action: 'product_review', productId, points: 10 });
      } catch (err) {
        // Non-fatal — points award should never block review submission
        console.error('[useGamificationActions] awardForProductReview failed:', err);
      }
    },
    [awardPoints],
  );

  return { awardForARTryOn, awardForRoomPhoto, awardForProductReview };
}
