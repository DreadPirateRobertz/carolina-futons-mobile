# Epic A — Push Notification Engine

**Date:** 2026-03-28
**Leads:** bishop (arch/infra), burke (a11y/permission UX)
**Dependencies:** None — this epic is a hard dependency for Epic D
**Bead prefix:** `cm-epicA-*`
**Quality gate:** screen-reference.html updated after epic closes

---

## 1. Goal

Deliver a complete push notification system covering order status events, gamification triggers (streaks, challenges), and price-drop alerts. Includes the full permission UX flow and a preferences management screen.

Success criteria:

- User receives order_shipped, order_delivered, order_refunded push within 30s of Wix webhook firing
- Streak/challenge/badge pushes fire within 5s of gamification event
- Price-drop push fires when watched product drops in price (Wix product update event)
- Permission pre-prompt screen shown before iOS system dialog on first launch
- Notification preferences screen has full loading state and a11y-compliant toggles
- All notification paths have unit + integration tests; permission flow tested on physical device

---

## 2. Architecture

```
Wix Backend (orderStatusWebhook.web.js / crossRigEvent)
    │
    ▼
crossRigEventBus (mobile → web already exists)
    │  New: web → mobile push channel
    ▼
Expo Push Notification Service (EPNS)
    │  Device token registered at auth, stored in Wix MemberPushTokens collection
    ▼
NotificationService (src/services/notificationService.ts)   ← NEW
    │
    ├── handleOrderNotification(payload)
    ├── handleGamificationNotification(payload)
    └── handlePriceDropNotification(payload)
    │
    ▼
NotificationRouter (src/navigation/NotificationRouter.ts)   ← NEW
    │  Deep-links notification tap to correct screen
    ▼
Screen (OrderDetailScreen / ChallengesScreen / ProductDetailScreen)
```

**Device token lifecycle:**

1. App launches → request permission (after pre-prompt) → register with Expo → store token in `MemberPushTokens` Wix collection via `callFunction('/_functions/registerPushToken', 'POST', { token, platform })`
2. On foreground: refresh token if stale (>7 days)
3. On logout: deregister token (`/_functions/deregisterPushToken`)

**Physical device requirement:** expo-notifications does not work on simulators. CI tests mock the service; real end-to-end validation requires a device build.

---

## 3. Components

### 3.1 Permission Flow (new screens)

**`NotificationPermissionPromptScreen`** (`src/screens/NotificationPermissionPromptScreen.tsx`)

- Shown once before iOS system dialog, never shown again if already decided
- Explains what notifications the user will receive and why
- Two CTAs: "Turn on notifications" (triggers system dialog) / "Maybe later" (defers, shown again after 7 days)
- A11y: full VoiceOver support, no animation blocking

**`NotificationPreferencesScreen`** (exists — needs full rework)

- Replace loading-free fetch with skeleton (3 toggle rows)
- Each toggle: `accessibilityRole="switch"`, `accessibilityState={{ checked }}`, announces state change
- Categories: Order Updates, Challenges & Streaks, Price Drops, Promotional
- If permission denied: show Settings deep-link CTA with explanation

### 3.2 NotificationService (`src/services/notificationService.ts`) — NEW

Single entry point for all notification handling:

```ts
// Registration
registerDeviceToken(wixClient): Promise<void>
deregisterDeviceToken(wixClient): Promise<void>

// Incoming handler (registered with expo-notifications addNotificationReceivedListener)
handleForegroundNotification(notification: Notifications.Notification): void

// Tap handler (registered with addNotificationResponseReceivedListener)
handleNotificationTap(response: Notifications.NotificationResponse): void
```

Error handling: registration failures logged to Sentry, do NOT throw (notification failure must not crash the app). Retry token registration once on next app foreground if initial fails.

### 3.3 NotificationRouter (`src/navigation/NotificationRouter.ts`) — NEW

Maps notification `data.type` to navigation action:

- `order_shipped` / `order_delivered` / `order_refunded` → `OrderDetailScreen` with orderId
- `challenge_started` / `streak_extended` → `ChallengesScreen`
- `badge_earned` → `LoyaltyScreen`
- `price_drop` → `ProductDetailScreen` with productSlug
- Unknown type → `HomeScreen` (safe fallback)

### 3.4 useNotificationPermission hook (`src/hooks/useNotificationPermission.ts`) — NEW

```ts
{
  (status, requestPermission, openSettings);
}
```

- Wraps `expo-notifications` permission API
- Persists "asked before" flag in AsyncStorage so pre-prompt shows only once
- `openSettings()` calls `Linking.openSettings()` for denied state

---

## 4. Data Contracts

### MemberPushTokens (Wix collection — new)

```
{ memberId, token, platform: 'ios'|'android', registeredAt, appVersion }
```

### Notification envelope (Wix → EPNS → device)

```ts
{
  to: string,           // Expo push token
  title: string,
  body: string,
  data: {
    type: 'order_shipped' | 'order_delivered' | 'order_refunded'
         | 'challenge_started' | 'streak_extended' | 'badge_earned'
         | 'price_drop',
    orderId?: string,
    productSlug?: string,
    challengeId?: string,
  },
  sound: 'default',
  badge?: number,
}
```

---

## 5. Error Handling

| Scenario                           | Handling                                                             |
| ---------------------------------- | -------------------------------------------------------------------- |
| Permission denied on first ask     | Show Settings CTA on preferences screen; do not re-prompt for 7 days |
| Token registration fails           | Log to Sentry, retry on next foreground event, do not crash          |
| Notification tap with unknown type | Navigate to HomeScreen                                               |
| Wix endpoint 400 (bad token)       | Deregister token locally, trigger re-registration                    |
| Wix endpoint 5xx                   | Retry with exponential backoff (3 attempts), then Sentry alert       |

---

## 6. Testing

- **Unit:** NotificationService handler routing, NotificationRouter mapping, useNotificationPermission state machine
- **Integration:** Token registration/deregistration with mocked WixClient, preference toggle persistence
- **Physical device:** Permission prompt → system dialog → grant/deny flow; push receipt on foreground/background/killed states
- **Edge cases:** App killed when notification arrives (cold start), stale token (>30 days), permission revoked in Settings mid-session

---

## 7. Beads

| Bead       | Description                                            | Lead           |
| ---------- | ------------------------------------------------------ | -------------- |
| cm-epicA-1 | NotificationService + token registration               | bishop         |
| cm-epicA-2 | NotificationPermissionPromptScreen                     | burke          |
| cm-epicA-3 | NotificationPreferencesScreen rework (skeleton + a11y) | burke          |
| cm-epicA-4 | NotificationRouter + deep-link tap handling            | bishop         |
| cm-epicA-5 | Order status push integration (Wix webhook → EPNS)     | bishop         |
| cm-epicA-6 | Gamification push triggers (streak/challenge/badge)    | hicks          |
| cm-epicA-7 | Price-drop push trigger                                | ripley         |
| cm-epicA-8 | Physical device validation + E2E test suite            | bishop + burke |
