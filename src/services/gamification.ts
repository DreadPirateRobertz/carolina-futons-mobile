/**
 * @module gamification
 *
 * Loyalty gamification event emitter — cm-sxw.
 *
 * Fires analytics events that the backend (Wix Automations) listens to for
 * awarding loyalty points. Each function corresponds to a user action defined
 * in the gamification spec. Event names mirror GAMIFICATION_EVENTS constants
 * from gamificationTokens.js so the web and mobile surfaces stay in sync.
 *
 * Client-side rate limit guard (hq-74nry): drops events silently when ≥20
 * have fired in the last 60 seconds, matching the server-side 20/min cap.
 * wishlistAdd is also debounced (300ms) to collapse rapid taps.
 *
 * Call sites:
 *   addToCart    — useCart.tsx on every cart add
 *   submitReview — useReviews.ts on successful review submission
 *   referralShared — AccountScreen.tsx after Share.share resolves
 */

import { trackEvent } from '@/services/analytics';
import { gamificationRateLimiter } from '@/utils/gamificationRateLimit';

/** Emit if under limit, otherwise drop silently. */
function guardedEmit(
  name: string,
  properties: Record<string, string | number | boolean>,
): void {
  if (!gamificationRateLimiter.canEmit()) return;
  gamificationRateLimiter.recordEmission();
  trackEvent(name as Parameters<typeof trackEvent>[0], properties);
}

/**
 * Fire a gamification event when a product is added to the cart.
 * Awards points per the "Purchase" earning rule (10 pts / $1).
 *
 * @param productId - Catalog product ID.
 * @param price - Unit price in USD (whole or decimal).
 */
export function addToCart(productId: string, price: number): void {
  guardedEmit('gamification_add_to_cart', { product_id: productId, price });
}

/**
 * Fire a gamification event when a review is successfully submitted.
 * Awards 100 pts for a photo review upon approval.
 *
 * @param productId - Catalog product ID being reviewed.
 * @param rating - Star rating (1–5).
 * @param hasPhoto - Whether the submission includes at least one photo.
 */
export function submitReview(productId: string, rating: number, hasPhoto: boolean): void {
  guardedEmit('gamification_submit_review', { product_id: productId, rating, has_photo: hasPhoto });
}

/**
 * Fire a gamification event when a referral link is shared.
 * Awards 500 pts when the referred friend completes their first order.
 *
 * @param code - The member's referral code.
 */
export function referralShared(code: string): void {
  guardedEmit('gamification_referral_shared', { referral_code: code });
}

/**
 * Fire a gamification event when the user opens the AR viewer for a product.
 * Awards 10 pts per use. Phase 4 event — cm-b7zsx.
 *
 * @param productId - Catalog product ID viewed in AR.
 */
export function arUsed(productId: string): void {
  guardedEmit('gamification_ar_used', { product_id: productId });
}

/**
 * Fire a gamification event when a product is added to the wishlist.
 * Awards 2 pts, capped at 5 per day (enforced server-side). Phase 4 — cm-b7zsx.
 * Debounced 300ms to collapse rapid taps on the wishlist button.
 *
 * @param productId - Catalog product ID added to wishlist.
 */
export function wishlistAdd(productId: string): void {
  gamificationRateLimiter.debounce(
    'wishlist_add',
    () => guardedEmit('gamification_wishlist_add', { product_id: productId }),
    300,
  );
}
