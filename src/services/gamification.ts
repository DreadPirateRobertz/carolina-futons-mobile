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
 * Call sites:
 *   addToCart    — useCart.tsx on every cart add
 *   submitReview — useReviews.ts on successful review submission
 *   referralShared — AccountScreen.tsx after Share.share resolves
 */

import { trackEvent } from '@/services/analytics';

/**
 * Fire a gamification event when a product is added to the cart.
 * Awards points per the "Purchase" earning rule (10 pts / $1).
 *
 * @param productId - Catalog product ID.
 * @param price - Unit price in USD (whole or decimal).
 */
export function addToCart(productId: string, price: number): void {
  trackEvent('gamification_add_to_cart', { product_id: productId, price });
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
  trackEvent('gamification_submit_review', { product_id: productId, rating, has_photo: hasPhoto });
}

/**
 * Fire a gamification event when a referral link is shared.
 * Awards 500 pts when the referred friend completes their first order.
 *
 * @param code - The member's referral code.
 */
export function referralShared(code: string): void {
  trackEvent('gamification_referral_shared', { referral_code: code });
}
