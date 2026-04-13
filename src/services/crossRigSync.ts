/**
 * @module crossRigSync
 *
 * CFM → CF-0CX cross-rig sync contract — typed no-op stubs (cm-24e).
 *
 * Establishes the wiring path that the real cf-0cx implementation will fulfil.
 * On the web side, `crossRigEventReceiver.web.js` receives calls shaped as:
 *   { memberId, event, payload, sourceRig: 'cfutons_mobile' }
 *
 * Events:
 *   - quiz_completed           → points award
 *   - ar_discovery_completed   → points award
 *   - social_share_completed   → points award
 *   - badge_earned             → push dispatch (payload: { badgeId })
 *   - tier_changed             → push dispatch (payload: { tier })
 *
 * All functions are no-ops that resolve immediately.  Input guards are enforced
 * now so the real implementation inherits correct validation when cf-0cx lands.
 *
 * @see cf-0cx — web-side receiver that will consume these calls
 */

/** The CFM source rig identifier — must always be 'cfutons_mobile'. */
export const CROSS_RIG_SOURCE = 'cfutons_mobile' as const;

/** All event types CFM may emit across the rig boundary. */
export type CrossRigEventType =
  | 'quiz_completed'
  | 'ar_discovery_completed'
  | 'social_share_completed'
  | 'badge_earned'
  | 'tier_changed';

/**
 * Send a cross-rig event to the web layer (cf-0cx receiver).
 *
 * No-op stub — resolves immediately.  When cf-0cx activates, replace this
 * body with a real `crossRigEventReceiver.web.js` call.
 *
 * @param memberId  - The authenticated member's ID (must be non-empty)
 * @param event     - One of the five recognised {@link CrossRigEventType} values
 * @param payload   - Event-specific data (e.g. `{ badgeId }`, `{ tier }`)
 *
 * @throws {Error} if `memberId` is empty or whitespace
 */
export async function sendCrossRigEvent(
  memberId: string,
  event: CrossRigEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!memberId || !memberId.trim()) {
    throw new Error('[crossRigSync] memberId is required');
  }

  // No-op stub — real call shape for cf-0cx:
  // await wixClient.callFunction('crossRigEventReceiver', 'POST', {
  //   memberId,
  //   event,
  //   payload,
  //   sourceRig: CROSS_RIG_SOURCE,
  // });
  void event;
  void payload;
}

/**
 * Sync earned points from a mobile event to the web-side loyalty ledger.
 *
 * No-op stub — resolves immediately.  When cf-0cx activates, replace this
 * body with a call to the points sync endpoint.
 *
 * @param memberId  - The authenticated member's ID (must be non-empty)
 * @param points    - Points earned — must be >= 0
 * @param eventType - The event that triggered this award
 *
 * @throws {Error} if `memberId` is empty or `points` is negative
 */
export async function syncMobilePoints(
  memberId: string,
  points: number,
  eventType: CrossRigEventType,
): Promise<void> {
  if (!memberId || !memberId.trim()) {
    throw new Error('[crossRigSync] memberId is required');
  }
  if (points < 0) {
    throw new Error(`[crossRigSync] points must be >= 0, got ${points}`);
  }

  // No-op stub — real call shape for cf-0cx:
  // await sendCrossRigEvent(memberId, eventType, {
  //   points,
  //   sourceRig: CROSS_RIG_SOURCE,
  // });
  void eventType;
}
