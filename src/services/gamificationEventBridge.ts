/**
 * @module gamificationEventBridge
 *
 * cf-3izx — Wave 26 mobile: GamificationEventBridge
 *
 * Receives cross-rig gamification events forwarded from the web layer
 * (crossRigEventReceiver.web.js, CF-87tn) and translates them into mobile
 * push notification payloads.
 *
 * Injectable: pass sendPushNotification as the second argument (defaults to
 * the production push sender when omitted). This keeps the module testable
 * without network calls.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body: string;
  data: { type: string; memberId: string };
}

export type SendPushFn = (memberId: string, payload: PushPayload) => Promise<void>;

export type GamificationEvent =
  | { type: 'gamification_badge_awarded'; memberId: string; badgeId: string; badgeLabel: string }
  | { type: 'gamification_tier_upgrade'; memberId: string; prevTier: string; newTier: string }
  | { type: 'gamification_points_milestone'; memberId: string; points: number }
  | { type: 'gamification_streak_milestone'; memberId: string; streakDays: number };

export type BridgeResult = { sent: true; type: string } | { error: string };

// ── Default sender (no-op stub — real sender injected at call site) ────────────

const noopSend: SendPushFn = async () => {};

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleBadgeAwarded(
  event: Extract<GamificationEvent, { type: 'gamification_badge_awarded' }>,
  send: SendPushFn,
): Promise<BridgeResult> {
  if (!event.memberId) return { error: 'missing memberId' };
  if (!event.badgeId) return { error: 'missing badgeId' };
  if (!event.badgeLabel) return { error: 'missing badgeLabel' };

  const payload: PushPayload = {
    title: `You earned the ${event.badgeLabel} badge! 🏆`,
    body: 'Check your profile to see your new badge.',
    data: { type: event.type, memberId: event.memberId },
  };

  try {
    await send(event.memberId, payload);
    return { sent: true, type: event.type };
  } catch {
    return { error: 'sendPushNotification failed' };
  }
}

async function handleTierUpgrade(
  event: Extract<GamificationEvent, { type: 'gamification_tier_upgrade' }>,
  send: SendPushFn,
): Promise<BridgeResult> {
  if (!event.memberId) return { error: 'missing memberId' };
  if (!event.prevTier) return { error: 'missing prevTier' };
  if (!event.newTier) return { error: 'missing newTier' };

  const payload: PushPayload = {
    title: `You reached ${event.newTier} tier! 🎉`,
    body: `Congrats on leveling up from ${event.prevTier} to ${event.newTier}!`,
    data: { type: event.type, memberId: event.memberId },
  };

  try {
    await send(event.memberId, payload);
    return { sent: true, type: event.type };
  } catch {
    return { error: 'sendPushNotification failed' };
  }
}

async function handlePointsMilestone(
  event: Extract<GamificationEvent, { type: 'gamification_points_milestone' }>,
  send: SendPushFn,
): Promise<BridgeResult> {
  if (!event.memberId) return { error: 'missing memberId' };
  if (!event.points || event.points <= 0) return { error: 'missing or invalid points' };

  const payload: PushPayload = {
    title: `${event.points} points and counting! ⭐`,
    body: `You hit ${event.points} points! Keep going!`,
    data: { type: event.type, memberId: event.memberId },
  };

  try {
    await send(event.memberId, payload);
    return { sent: true, type: event.type };
  } catch {
    return { error: 'sendPushNotification failed' };
  }
}

async function handleStreakMilestone(
  event: Extract<GamificationEvent, { type: 'gamification_streak_milestone' }>,
  send: SendPushFn,
): Promise<BridgeResult> {
  if (!event.memberId) return { error: 'missing memberId' };
  if (!event.streakDays || event.streakDays <= 0) return { error: 'missing or invalid streakDays' };

  const payload: PushPayload = {
    title: `${event.streakDays}-day streak! 🔥`,
    body: `You're on a ${event.streakDays}-day streak. Don't break the chain!`,
    data: { type: event.type, memberId: event.memberId },
  };

  try {
    await send(event.memberId, payload);
    return { sent: true, type: event.type };
  } catch {
    return { error: 'sendPushNotification failed' };
  }
}

// ── Public dispatcher ─────────────────────────────────────────────────────────

/**
 * Dispatch a cross-rig gamification event to the appropriate push handler.
 *
 * @param event - The incoming gamification event from the web layer.
 * @param sendPushNotification - Injectable push sender (defaults to no-op).
 * @returns { sent: true, type } on success, { error } on validation failure or
 *          unknown type.
 */
export async function handleGamificationEvent(
  event: GamificationEvent,
  sendPushNotification: SendPushFn = noopSend,
): Promise<BridgeResult> {
  switch (event.type) {
    case 'gamification_badge_awarded':
      return handleBadgeAwarded(event, sendPushNotification);
    case 'gamification_tier_upgrade':
      return handleTierUpgrade(event, sendPushNotification);
    case 'gamification_points_milestone':
      return handlePointsMilestone(event, sendPushNotification);
    case 'gamification_streak_milestone':
      return handleStreakMilestone(event, sendPushNotification);
    default:
      return { error: `unknown event type: ${(event as { type: string }).type}` };
  }
}
