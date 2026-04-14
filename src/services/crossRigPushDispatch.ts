/**
 * @module crossRigPushDispatch
 *
 * Receives push dispatch events from cfutons (badge_earned, tier_changed)
 * and routes them to expo-notifications local scheduling.
 *
 * Contract: melania cf-axn (PR#1025) + cf-bdl push dispatch trigger.
 * Direction: cfutons → CFM (device push). FCM handles delivery on the CF side;
 * this module handles the CFM-side local notification scheduling.
 *
 * @bead cm-3hg
 */

import * as Notifications from 'expo-notifications';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CrossRigPushResult {
  sent: number;
  failed: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const PUSH_EVENTS = {
  BADGE_EARNED: 'badge_earned',
  TIER_CHANGED: 'tier_changed',
} as const;

type PushEventType = (typeof PUSH_EVENTS)[keyof typeof PUSH_EVENTS];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function hasPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === 'granted';
}

function buildContent(
  event: string,
  payload: Record<string, unknown>,
): Notifications.NotificationContentInput {
  if (event === PUSH_EVENTS.BADGE_EARNED) {
    const badgeId = typeof payload.badgeId === 'string' ? payload.badgeId : '';
    return {
      title: 'You earned a new badge!',
      body: badgeId ? `Badge unlocked: ${badgeId}` : 'Check your profile to see your new badge.',
      data: { event, badgeId },
    };
  }

  if (event === PUSH_EVENTS.TIER_CHANGED) {
    const newTier = typeof payload.newTier === 'string' ? payload.newTier : '';
    return {
      title: 'Your loyalty tier has been updated',
      body: newTier
        ? `You've reached ${newTier} status!`
        : 'Your status has changed — check your profile.',
      data: { event, newTier },
    };
  }

  // Unreachable in practice — guard for exhaustiveness
  return { title: '', body: '' };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Dispatch a cross-rig push notification to the device.
 *
 * Returns { sent: 1, failed: 0 } on success.
 * Returns { sent: 0, failed: 1 } on permission denied or scheduling error.
 * Returns { sent: 0, failed: 0 } for unknown/unhandled event types.
 *
 * Never throws — all errors are handled internally.
 */
export async function dispatchCrossRigPush(
  memberId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<CrossRigPushResult> {
  // Unknown event → silently ignore
  const knownEvents: string[] = Object.values(PUSH_EVENTS);
  if (!knownEvents.includes(event)) {
    return { sent: 0, failed: 0 };
  }

  try {
    const permitted = await hasPermission();
    if (!permitted) {
      return { sent: 0, failed: 1 };
    }

    await Notifications.scheduleNotificationAsync({
      content: buildContent(event, payload),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
      },
    });

    return { sent: 1, failed: 0 };
  } catch {
    return { sent: 0, failed: 1 };
  }
}
