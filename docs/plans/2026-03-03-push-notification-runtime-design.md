# Push Notification Runtime — Design

**Bead:** cm-c21
**Date:** 2026-03-03
**Author:** bishop

## Problem

`useNotifications` hook is fully mocked — no real `expo-notifications` integration. All downstream features (order status updates, cart reminders, back-in-stock alerts, promotions) are dead. The architecture is complete (notification service types, deep link mapping, preferences screen), but the runtime is stubbed.

## Design

### Approach: Wire expo-notifications into existing NotificationProvider

Minimal changes — replace mock with real calls, preserve context API surface. Zero breaking changes to consumers (NotificationPreferencesScreen, App.tsx).

### Dependencies

- `expo-notifications` — push token, permission, listeners
- `expo-device` — physical device check (push tokens require real device)
- `expo-constants` — EAS project ID for push token registration

### Changes to `useNotifications.tsx`

1. **Module-level:** `Notifications.setNotificationHandler()` — controls foreground display behavior
2. **`requestPermission`:** Replace mock with:
   - `Notifications.getPermissionsAsync()` → check existing
   - `Notifications.requestPermissionsAsync()` → prompt if needed
   - `Notifications.getExpoPushTokenAsync()` → get token on grant
   - Set Android notification channel
   - Dispatch `SET_PERMISSION` / `SET_TOKEN` with real values
3. **`useEffect` (mount):**
   - Check existing permission status
   - `addNotificationReceivedListener` → increment badge, check preferences filter
   - `addNotificationResponseReceivedListener` → extract notification type + data → `getDeepLinkForNotification` → `Linking.openURL`
   - Cleanup: remove listeners on unmount
4. **Preference persistence:** Save to AsyncStorage on toggle, restore on mount

### What stays the same

- `NotificationContextValue` interface — no changes
- `notificationReducer` — no changes
- `NotificationPreferencesScreen` — no changes
- `notifications.ts` service — no changes
- All existing tests continue to pass

### Test plan

- Mock `expo-notifications` module at test level
- Test: permission granted → token set
- Test: permission denied → status set, no token
- Test: notification received while app foregrounded → badge incremented
- Test: notification tapped → deep link opened via Linking
- Test: preference filtering → suppressed notification types not shown
- Test: listener cleanup on unmount
- Test: preference persistence (AsyncStorage read/write)

### Edge cases

- Simulator/emulator: `Device.isDevice` false → skip token registration, set granted for permission UI only
- Network failure on token fetch → retry with exponential backoff (max 3)
- Android channel setup on first launch
- Permission previously denied → show "open settings" message (existing UI handles this)
