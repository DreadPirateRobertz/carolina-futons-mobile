# CrossRig Event Audit — CFM → Wix

> **Purpose:** Pre-Phase 8 inventory of all events mobile fires to Wix `crossRigEventReceiver`.
> Requested by Melania (cm-004) for CFW migration planning.
> No code changes — documentation only.

---

## Channel A — `crossRigSync.ts` → `crossRigEventReceiver` (Wix Velo backend)

These events are sent via `wixClient.callFunction('crossRigEventReceiver', 'POST', ...)`.
Envelope shape: `{ memberId, event, payload, sourceRig: 'cfutons_mobile' }`.

| Event | Trigger | Payload | Points | Status |
|-------|---------|---------|--------|--------|
| `quiz_completed` | User completes style quiz | `{ points: 50 }` | 50 | LIVE |
| `ar_discovery_completed` | User places product in AR view | `{ points: 75, productId? }` | 75 | LIVE (cf-cn2 PR#1037) |
| `social_share_completed` | User shares product to social | `{ points: 100, platform? }` | 100 | LIVE (cf-cn2 PR#1037) |
| `badge_earned` | Badge awarded to member | `{ badgeId }` | 0 | LIVE |
| `tier_changed` | Member loyalty tier changes | `{ tier }` | 0 | LIVE |

Also called via `completeMobileChallenge` (wraps `crossRigEventReceiver` + challenge deduplication):

| Challenge Type | Maps to Event | Points | Idempotency |
|----------------|---------------|--------|-------------|
| `ar_discovery` | `ar_discovery_completed` | 75 | same productId+day |
| `quiz_completion` | `quiz_completed` | 50 | same day |
| `social_share` | `social_share_completed` | 100 | same platform+day |

---

## Channel B — `crossRigEventBus.ts` → `crossRigEvent` (Wix webMethod, Phase 8)

These events use the cf-44r shared envelope schema:
`{ eventId, schemaVersion, traceId, event, source, platform, appVersion, ts, delta, newTotal, ...payload }`.

Retry policy: network failures queued in AsyncStorage for replay; 400s (schema errors) dropped permanently.
Idempotency guard (cm-030): same memberId+eventType+day → no-op client-side.

| Event | Trigger | Key Payload Fields | Status |
|-------|---------|-------------------|--------|
| `streak_extended` | Login streak milestone hit | `streak, delta, newTotal` | Phase 8 (cm-p8-bus) |
| `challenge_started` | User begins a challenge | `challengeId, delta:0, newTotal` | Phase 8 (cm-p8-bus) |
| `redemption_initiated` | User redeems loyalty points | `delta (negative), newTotal` | Phase 8 (cm-p8-bus) |
| `badge_earned` | Badge awarded (bus variant) | `badgeId, badgeName, delta:0, newTotal:0` | Phase 8 (cm-p8-bus) |
| `tier_changed` | Tier upgrade (bus variant) | `oldTier, newTier, delta:0, newTotal:0` | Phase 8 (cm-p8-bus) |
| `cart_abandoned` | Cart left without checkout | `cartTotal, itemCount, delta:0, newTotal:0` | Phase 8 (cm-p8-bus) |

---

## Channel C — Wix → CFM (inbound, NOT fired by mobile)

`gamificationEventBridge.ts` **receives** these events from the Wix layer and converts them to mobile push notifications. Mobile does **not** fire these to Wix.

| Event | Direction | Push Title |
|-------|-----------|-----------|
| `gamification_badge_awarded` | Wix → CFM | "You earned the {label} badge! 🏆" |
| `gamification_tier_upgrade` | Wix → CFM | "You reached {tier} tier! 🎉" |
| `gamification_points_milestone` | Wix → CFM | "{points} points and counting! ⭐" |
| `gamification_streak_milestone` | Wix → CFM | "{n}-day streak! 🔥" |

---

## Push Notifications — CFM → Wix (via `sendPushToMember`)

Mobile also calls `wixClient.callFunction('sendPushToMember', 'POST', ...)` to dispatch push notifications for loyalty events:

| Event Key | Wix Event | Payload |
|-----------|-----------|---------|
| `BADGE_EARNED` | `badge_earned` | `{ badgeId }` |
| `TIER_CHANGED` | `tier_changed` | `{ tier }` |

FCM handles delivery. CFM stubs the response (`{ sent: N, failed: 0 }`).

---

## Summary

| Channel | Destination | Events (CFM → Wix) |
|---------|-------------|-------------------|
| crossRigSync → crossRigEventReceiver | Wix Velo backend function | 5 event types |
| crossRigEventBus → crossRigEvent | Wix webMethod (Phase 8) | 6 event types |
| sendPushToMember | Wix push service | 2 event types |
| **Total outbound** | | **13 event types** |

**Note for CFW migration:** All Channel A calls target Wix Velo backend functions. If `crossRigEventReceiver` moves from Wix/Velo to the CFW Next.js layer, all 5 Channel A events need redirect. Channel B (`crossRigEvent` webMethod) similarly needs a CFW equivalent before Phase 8 ships.
