/**
 * @module gamificationPushHandler
 *
 * cm-6ws — mobile gamification sync: consume crossRigEventReceiver push events.
 *
 * Routes incoming push notification payloads (badge_earned, tier_changed,
 * challenge_complete, streak_milestone) to in-app UI update callbacks:
 *   - badge_earned       → showBadgeToast (BadgeToastContext)
 *   - tier_changed       → showTierUpgradeModal (TierCelebrationModal)
 *   - challenge_complete → showChallengeCompleteToast (ChallengeCompletedToast)
 *   - streak_milestone   → showStreakMilestoneBanner (StreakMilestoneBridge)
 *
 * The handler is purely synchronous and injectable — UI actions are passed as
 * callbacks so the module is testable without React or context dependencies.
 *
 * Uses crossRigSyncService contract: payloads follow the crossRigEventReceiver
 * push schema (cf-axn PR#1025).
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** Recognised gamification push event types from crossRigEventReceiver. */
export const GAMIFICATION_PUSH_EVENTS = {
  BADGE_EARNED: 'badge_earned',
  TIER_CHANGED: 'tier_changed',
  CHALLENGE_COMPLETE: 'challenge_complete',
  STREAK_MILESTONE: 'streak_milestone',
} as const;

export type GamificationPushEventType =
  (typeof GAMIFICATION_PUSH_EVENTS)[keyof typeof GAMIFICATION_PUSH_EVENTS];

// ── Payload types ─────────────────────────────────────────────────────────────

export type GamificationPushPayload =
  | { event: 'badge_earned'; badgeName: string; badgeId: string }
  | { event: 'tier_changed'; oldTier: string; newTier: string }
  | { event: 'challenge_complete'; challengeName: string; challengeId: string }
  | { event: 'streak_milestone'; streakCount: number };

// ── Action callbacks ──────────────────────────────────────────────────────────

/**
 * Injectable UI action callbacks. Each corresponds to one push event type.
 *
 * Wire these to your context/state at the call site:
 *   showBadgeToast        → useBadgeToastContext().showBadgeToast
 *   showTierUpgradeModal  → setActiveTier / TierCelebrationModal trigger
 *   showChallengeCompleteToast → challenge toast trigger
 *   showStreakMilestoneBanner  → streak banner trigger
 */
export interface GamificationPushActions {
  /** Show the badge unlock toast with the badge name. */
  showBadgeToast: (badgeName: string) => void;
  /** Show the tier upgrade modal with old and new tier names. */
  showTierUpgradeModal: (oldTier: string, newTier: string) => void;
  /** Show the challenge completed toast with the challenge name. */
  showChallengeCompleteToast: (challengeName: string) => void;
  /** Show the streak milestone banner with the streak count. */
  showStreakMilestoneBanner: (streakCount: number) => void;
}

// ── Guards ────────────────────────────────────────────────────────────────────

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Route a gamification push event payload to the appropriate in-app UI action.
 *
 * - badge_earned       → actions.showBadgeToast(badgeName)
 * - tier_changed       → actions.showTierUpgradeModal(oldTier, newTier)
 * - challenge_complete → actions.showChallengeCompleteToast(challengeName)
 * - streak_milestone   → actions.showStreakMilestoneBanner(streakCount)
 * - unknown type       → no-op (never throws)
 *
 * Malformed payloads (missing/wrong-typed fields) are handled gracefully with
 * safe defaults — this function never throws.
 *
 * @param payload - The incoming push notification data object
 * @param actions - Injectable UI callbacks (use context/state hooks at call site)
 */
export function handleGamificationPushEvent(
  payload: GamificationPushPayload,
  actions: GamificationPushActions,
): void {
  // Safe-cast: the runtime payload may be partially malformed
  const raw = payload as Record<string, unknown>;
  const event = safeString(raw.event);

  switch (event) {
    case GAMIFICATION_PUSH_EVENTS.BADGE_EARNED: {
      const badgeName = safeString(raw.badgeName);
      actions.showBadgeToast(badgeName);
      break;
    }

    case GAMIFICATION_PUSH_EVENTS.TIER_CHANGED: {
      const oldTier = safeString(raw.oldTier);
      const newTier = safeString(raw.newTier);
      actions.showTierUpgradeModal(oldTier, newTier);
      break;
    }

    case GAMIFICATION_PUSH_EVENTS.CHALLENGE_COMPLETE: {
      const challengeName = safeString(raw.challengeName);
      actions.showChallengeCompleteToast(challengeName);
      break;
    }

    case GAMIFICATION_PUSH_EVENTS.STREAK_MILESTONE: {
      const streakCount = safeNumber(raw.streakCount);
      actions.showStreakMilestoneBanner(streakCount);
      break;
    }

    default:
      // Unknown event type — silently ignore, never throw
      break;
  }
}
