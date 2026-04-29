/**
 * @module crossRigSync
 *
 * CFM → CF-0CX cross-rig sync contract — real typed wrappers (cm-24e / cm-1at).
 *
 * After cf-ndr+cf-0cx merge, all functions make real calls to Wix backend
 * functions via the provided WixClient.  Input guards are enforced at the
 * boundary so callers get clear errors instead of silent no-ops.
 *
 * Wix backend functions called:
 *   - crossRigEventReceiver   (sendCrossRigEvent, syncMobilePoints)
 *   - completeMobileChallenge (completeMobileChallenge)
 *   - getMobileChallengeProgress (getMobileChallengeProgress)
 *   - sendPushToMember        (sendPushToMember)
 *
 * @see cf-0cx — web-side receiver
 * @see cf-ndr — mobile challenge schema (PR#1028)
 * @see cf-axn — push stub (PR#1025)
 */

// ── Wix client interface ──────────────────────────────────────────────────────

export interface WixClientLike {
  callFunction: (
    name: string,
    method: 'GET' | 'POST',
    body: Record<string, unknown>,
  ) => Promise<unknown>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** The CFM source rig identifier — must always be 'cfutons_mobile'. */
export const CROSS_RIG_SOURCE = 'cfutons_mobile' as const;

/** Push event keys for sendPushToMember (cf-axn PR#1025). */
export const PUSH_EVENTS = {
  BADGE_EARNED: 'badge_earned',
  TIER_CHANGED: 'tier_changed',
} as const;

export type PushEventKey = keyof typeof PUSH_EVENTS;

// ── Types ─────────────────────────────────────────────────────────────────────

/** All event types CFM may emit across the rig boundary. */
export type CrossRigEventType =
  | 'quiz_completed'
  | 'ar_discovery_completed'
  | 'social_share_completed'
  | 'badge_earned'
  | 'tier_changed';

/** Mobile challenge types supported by completeMobileChallenge (cf-ndr). */
export type MobileChallengeType = 'ar_discovery' | 'quiz_completion' | 'social_share';

/** Optional params for completeMobileChallenge. */
export interface MobileChallengeParams {
  productId?: string;
  score?: number;
  platform?: string;
}

/** Result shape returned by completeMobileChallenge (cf-ndr schema). */
export interface CompleteMobileChallengeResult {
  success: boolean;
  alreadyAwarded: boolean;
  pointsAwarded: number;
}

/** Result shape returned by getMobileChallengeProgress (cf-ndr schema). */
export interface MobileChallengeProgress {
  success: boolean;
  counts: {
    ar_discovery: number;
    quiz_completion: number;
    social_share: number;
  };
}

// ── MOBILE_CHALLENGE_TYPES ────────────────────────────────────────────────────

/**
 * Points awarded and cross-rig event name for each mobile challenge type.
 *
 * Points defined by cf-ndr PR#1028:
 *   ar_discovery = 75 pts, quiz_completion = 50 pts, social_share = 100 pts
 */
export const MOBILE_CHALLENGE_TYPES: Record<
  MobileChallengeType,
  { points: number; eventName: CrossRigEventType }
> = {
  ar_discovery: { points: 75, eventName: 'ar_discovery_completed' },
  quiz_completion: { points: 50, eventName: 'quiz_completed' },
  social_share: { points: 100, eventName: 'social_share_completed' },
};

// ── Guards ────────────────────────────────────────────────────────────────────

function assertMemberId(memberId: string): void {
  if (!memberId || !memberId.trim()) {
    throw new Error('[crossRigSync] memberId is required');
  }
}

// ── sendCrossRigEvent ─────────────────────────────────────────────────────────

/**
 * Send a cross-rig event to both the Wix backend and CFW API (cm-006 dual-write).
 *
 * Both legs fire concurrently via Promise.allSettled. A single-leg failure is
 * logged but does not block the other. Both failing throws an aggregate error.
 * If CROSS_RIG_SECRET is absent the CFW leg is skipped with a console.warn.
 *
 * @param wixClient - Authenticated Wix client with callFunction capability
 * @param memberId  - The authenticated member's ID (must be non-empty)
 * @param event     - One of the five recognised {@link CrossRigEventType} values
 * @param payload   - Event-specific data (e.g. `{ badgeId }`, `{ tier }`)
 *
 * @throws {Error} if `memberId` is empty or whitespace
 * @throws {Error} if both legs fail
 */
export async function sendCrossRigEvent(
  wixClient: WixClientLike,
  memberId: string,
  event: CrossRigEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  assertMemberId(memberId);

  const body = { memberId, event, payload, sourceRig: CROSS_RIG_SOURCE };

  const wixLeg = wixClient.callFunction('crossRigEventReceiver', 'POST', body);

  const secret = process.env.CROSS_RIG_SECRET;
  if (!secret) {
    console.warn('[crossRigSync] CROSS_RIG_SECRET not set — CFW leg skipped');
    await wixLeg;
    return;
  }

  const cfwLeg = fetch(`${process.env.CFW_API_URL}/api/cross-rig`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cross-Rig-Secret': secret,
    },
    body: JSON.stringify(body),
  });

  const [wixResult, cfwResult] = await Promise.allSettled([wixLeg, cfwLeg]);

  if (wixResult.status === 'rejected') {
    console.error('[crossRigSync] Wix leg failed', wixResult.reason);
  }
  if (cfwResult.status === 'rejected') {
    console.error('[crossRigSync] CFW leg failed', cfwResult.reason);
  }

  if (wixResult.status === 'rejected' && cfwResult.status === 'rejected') {
    throw new Error('[crossRigSync] dual-write: both legs failed');
  }
}

// ── syncMobilePoints ──────────────────────────────────────────────────────────

/**
 * Sync earned points from a mobile event to the web-side loyalty ledger.
 *
 * @param wixClient - Authenticated Wix client
 * @param memberId  - The authenticated member's ID (must be non-empty)
 * @param points    - Points earned — must be >= 0
 * @param eventType - The event that triggered this award
 *
 * @throws {Error} if `memberId` is empty or `points` is negative
 * @throws {Error} if the wixClient call fails
 */
export async function syncMobilePoints(
  wixClient: WixClientLike,
  memberId: string,
  points: number,
  eventType: CrossRigEventType,
): Promise<void> {
  assertMemberId(memberId);
  if (points < 0) {
    throw new Error(`[crossRigSync] points must be >= 0, got ${points}`);
  }

  await wixClient.callFunction('crossRigEventReceiver', 'POST', {
    memberId,
    event: eventType,
    payload: { points },
    sourceRig: CROSS_RIG_SOURCE,
  });
}

// ── completeMobileChallenge ───────────────────────────────────────────────────

/**
 * Complete a mobile challenge and award loyalty points (cf-ndr schema).
 *
 * Idempotent: same challengeType+productId same day → alreadyAwarded:true, pointsAwarded:0.
 * Idempotency is enforced server-side; params are forwarded so the backend
 * can apply productId+day keyed deduplication.
 *
 * @param wixClient     - Authenticated Wix client
 * @param memberId      - The member completing the challenge
 * @param challengeType - One of the three {@link MobileChallengeType} values
 * @param params        - Optional challenge params (productId, score, platform)
 *
 * @throws {Error} if memberId is empty
 * @throws {Error} if the wixClient call fails
 */
export async function completeMobileChallenge(
  wixClient: WixClientLike,
  memberId: string,
  challengeType: MobileChallengeType,
  params: MobileChallengeParams = {},
): Promise<CompleteMobileChallengeResult> {
  assertMemberId(memberId);

  const { eventName } = MOBILE_CHALLENGE_TYPES[challengeType];
  const result = await wixClient.callFunction('completeMobileChallenge', 'POST', {
    memberId,
    event: eventName,
    challengeType,
    params,
    sourceRig: CROSS_RIG_SOURCE,
  });

  return result as CompleteMobileChallengeResult;
}

// ── getMobileChallengeProgress ────────────────────────────────────────────────

/**
 * Fetch the member's mobile challenge completion counts from the web layer.
 *
 * @param wixClient - Authenticated Wix client
 * @param memberId  - The member whose progress to fetch
 *
 * @throws {Error} if memberId is empty
 * @throws {Error} if the wixClient call fails
 */
export async function getMobileChallengeProgress(
  wixClient: WixClientLike,
  memberId: string,
): Promise<MobileChallengeProgress> {
  assertMemberId(memberId);

  const result = await wixClient.callFunction('getMobileChallengeProgress', 'GET', {
    memberId,
    sourceRig: CROSS_RIG_SOURCE,
  });

  return result as MobileChallengeProgress;
}

// ── sendPushToMember ──────────────────────────────────────────────────────────

/**
 * Send a push notification to a member via the cf-axn push stub (PR#1025).
 *
 * Supported events: {@link PUSH_EVENTS.BADGE_EARNED}, {@link PUSH_EVENTS.TIER_CHANGED}.
 *
 * @param wixClient - Authenticated Wix client
 * @param memberId  - The member to notify
 * @param eventKey  - Key from {@link PUSH_EVENTS} (e.g. 'BADGE_EARNED')
 * @param payload   - Event-specific payload forwarded to the push service
 *
 * @throws {Error} if memberId is empty
 * @throws {Error} if the wixClient call fails
 */
export async function sendPushToMember(
  wixClient: WixClientLike,
  memberId: string,
  eventKey: PushEventKey,
  payload: Record<string, unknown>,
): Promise<{ sent: number; failed: number }> {
  assertMemberId(memberId);

  const result = await wixClient.callFunction('sendPushToMember', 'POST', {
    memberId,
    event: PUSH_EVENTS[eventKey],
    payload,
  });

  return result as { sent: number; failed: number };
}
