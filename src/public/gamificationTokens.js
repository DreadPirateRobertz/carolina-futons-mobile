/**
 * gamificationTokens — cm-sxw
 *
 * Shared gamification constants for the Carolina Futons loyalty program.
 * Consumed by both this mobile app and the cfutons web frontend.
 *
 * Tier progression (points required to reach each tier):
 *   Trail Blazer   0–499
 *   Mountain Guide 500–1499
 *   Summit Master  1500–2999
 *   Blue Ridge Legend 3000+
 */

/** Points threshold to enter each tier, aligned with TIER_NAMES index. */
export const TIER_THRESHOLDS = [0, 500, 1500, 3000];

/** Display names for each tier, in ascending order. */
export const TIER_NAMES = ['Trail Blazer', 'Mountain Guide', 'Summit Master', 'Blue Ridge Legend'];

/**
 * Derive the tier index (0–3) for a given points value.
 * @param {number} points
 * @returns {number} 0 = Trail Blazer … 3 = Blue Ridge Legend
 */
export function getTierIndex(points) {
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= TIER_THRESHOLDS[i]) return i;
  }
  return 0;
}

/**
 * Derive the display tier name for a given points value.
 * @param {number} points
 * @returns {string}
 */
export function getTierName(points) {
  return TIER_NAMES[getTierIndex(points)];
}

/** Gamification analytics event name constants. */
export const GAMIFICATION_EVENTS = {
  ADD_TO_CART: 'gamification_add_to_cart',
  SUBMIT_REVIEW: 'gamification_submit_review',
  REFERRAL_SHARED: 'gamification_referral_shared',
  TRACK_VIEW: 'gamification_track_view',
};
