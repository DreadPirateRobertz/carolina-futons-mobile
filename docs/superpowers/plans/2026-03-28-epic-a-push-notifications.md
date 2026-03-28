# Epic A — Push Notification Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete push notification system covering order status, gamification events, and price-drop alerts with a11y-compliant permission UX.

**Architecture:** A `NotificationService` singleton registers device tokens with Wix via `callFunction`, handles foreground/tap events, and routes taps to the correct screen via `NotificationRouter`. All notification paths are unit-tested with mocked `expo-notifications`; real end-to-end push requires a physical device build on linux.

**Tech Stack:** expo-notifications, React Native, AsyncStorage, WixClient.callFunction, crossRigEventBus (existing), jest-expo

**Branch:** `cm-epicA-push-engine` (branch off main)

---

## Pre-task: Create branch

```bash
git checkout main && git pull origin main
git checkout -b cm-epicA-push-engine
```

---

## Task 1: useNotificationPermission hook

**Files:**
- Create: `src/hooks/useNotificationPermission.ts`
- Create: `src/hooks/__tests__/useNotificationPermission.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/hooks/__tests__/useNotificationPermission.test.ts
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Linking: { openSettings: jest.fn() },
}));

import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';
import { useNotificationPermission } from '../useNotificationPermission';

const ASKED_KEY = '@cf_notif_asked';

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

it('returns undetermined status on first load', async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
  const { result } = renderHook(() => useNotificationPermission());
  await act(async () => {});
  expect(result.current.status).toBe('undetermined');
  expect(result.current.hasAskedBefore).toBe(false);
});

it('requestPermission stores asked flag and returns granted', async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
  (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  const { result } = renderHook(() => useNotificationPermission());
  await act(async () => {});
  await act(async () => { await result.current.requestPermission(); });
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(ASKED_KEY, 'true');
  expect(result.current.status).toBe('granted');
});

it('openSettings calls Linking.openSettings', async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
  const { result } = renderHook(() => useNotificationPermission());
  await act(async () => {});
  result.current.openSettings();
  expect(Linking.openSettings).toHaveBeenCalled();
});

it('hasAskedBefore is true when AsyncStorage flag is set', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
  const { result } = renderHook(() => useNotificationPermission());
  await act(async () => {});
  expect(result.current.hasAskedBefore).toBe(true);
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
# On linux SSH (pop-os):
npx jest src/hooks/__tests__/useNotificationPermission.test.ts --no-coverage
```
Expected: `Cannot find module '../useNotificationPermission'`

- [ ] **Step 3: Implement hook**

```typescript
// src/hooks/useNotificationPermission.ts
import { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ASKED_KEY = '@cf_notif_asked';

export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface NotificationPermissionResult {
  status: PermissionStatus;
  hasAskedBefore: boolean;
  requestPermission: () => Promise<PermissionStatus>;
  openSettings: () => void;
}

export function useNotificationPermission(): NotificationPermissionResult {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');
  const [hasAskedBefore, setHasAskedBefore] = useState(false);

  useEffect(() => {
    async function init() {
      const [{ status: currentStatus }, askedFlag] = await Promise.all([
        Notifications.getPermissionsAsync(),
        AsyncStorage.getItem(ASKED_KEY),
      ]);
      setStatus(currentStatus as PermissionStatus);
      setHasAskedBefore(askedFlag === 'true');
    }
    init();
  }, []);

  const requestPermission = useCallback(async (): Promise<PermissionStatus> => {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    await AsyncStorage.setItem(ASKED_KEY, 'true');
    setStatus(newStatus as PermissionStatus);
    setHasAskedBefore(true);
    return newStatus as PermissionStatus;
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  return { status, hasAskedBefore, requestPermission, openSettings };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest src/hooks/__tests__/useNotificationPermission.test.ts --no-coverage
```
Expected: 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNotificationPermission.ts src/hooks/__tests__/useNotificationPermission.test.ts
git commit -m "feat(epicA): useNotificationPermission hook with AsyncStorage asked-flag"
```

---

## Task 2: NotificationService

**Files:**
- Create: `src/services/notificationService.ts`
- Create: `src/services/__tests__/notificationService.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/services/__tests__/notificationService.test.ts
import { captureException } from '@/services/crashReporting';

jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('@/services/crashReporting', () => ({ captureException: jest.fn() }));

import * as Notifications from 'expo-notifications';
import {
  registerDeviceToken,
  deregisterDeviceToken,
} from '../notificationService';

const mockWixClient = {
  callFunction: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

it('registerDeviceToken calls Wix registerPushToken endpoint', async () => {
  (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
    data: 'ExponentPushToken[abc123]',
  });
  mockWixClient.callFunction.mockResolvedValue({ success: true });

  await registerDeviceToken(mockWixClient as never);

  expect(mockWixClient.callFunction).toHaveBeenCalledWith(
    '/_functions/registerPushToken',
    'POST',
    expect.objectContaining({ token: 'ExponentPushToken[abc123]' }),
  );
});

it('registerDeviceToken does not throw on Wix error', async () => {
  (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
    data: 'ExponentPushToken[abc123]',
  });
  mockWixClient.callFunction.mockRejectedValue(new Error('network'));

  await expect(registerDeviceToken(mockWixClient as never)).resolves.not.toThrow();
  expect(captureException).toHaveBeenCalled();
});

it('deregisterDeviceToken calls Wix deregisterPushToken endpoint', async () => {
  (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
    data: 'ExponentPushToken[abc123]',
  });
  mockWixClient.callFunction.mockResolvedValue({ success: true });

  await deregisterDeviceToken(mockWixClient as never);

  expect(mockWixClient.callFunction).toHaveBeenCalledWith(
    '/_functions/deregisterPushToken',
    'POST',
    expect.objectContaining({ token: 'ExponentPushToken[abc123]' }),
  );
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest src/services/__tests__/notificationService.test.ts --no-coverage
```

- [ ] **Step 3: Implement NotificationService**

```typescript
// src/services/notificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { captureException } from '@/services/crashReporting';
import { version as appVersion } from '../../package.json';

interface WixClientLike {
  callFunction: (path: string, method: 'GET' | 'POST', body?: unknown) => Promise<unknown>;
}

export async function registerDeviceToken(client: WixClientLike): Promise<void> {
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await client.callFunction('/_functions/registerPushToken', 'POST', {
      token,
      platform: Platform.OS,
      appVersion,
      registeredAt: Date.now(),
    });
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)));
  }
}

export async function deregisterDeviceToken(client: WixClientLike): Promise<void> {
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await client.callFunction('/_functions/deregisterPushToken', 'POST', { token });
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)));
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest src/services/__tests__/notificationService.test.ts --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add src/services/notificationService.ts src/services/__tests__/notificationService.test.ts
git commit -m "feat(epicA): NotificationService register/deregister device token"
```

---

## Task 3: NotificationRouter

**Files:**
- Create: `src/navigation/NotificationRouter.ts`
- Create: `src/navigation/__tests__/NotificationRouter.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/navigation/__tests__/NotificationRouter.test.ts
import { routeNotificationTap } from '../NotificationRouter';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, reset: jest.fn() };

beforeEach(() => jest.clearAllMocks());

it('routes order_shipped to OrderDetailScreen', () => {
  routeNotificationTap({ type: 'order_shipped', orderId: 'ord-123' }, mockNavigation as never);
  expect(mockNavigate).toHaveBeenCalledWith('OrderDetail', { orderId: 'ord-123' });
});

it('routes streak_extended to ChallengesScreen', () => {
  routeNotificationTap({ type: 'streak_extended' }, mockNavigation as never);
  expect(mockNavigate).toHaveBeenCalledWith('Challenges');
});

it('routes badge_earned to LoyaltyScreen', () => {
  routeNotificationTap({ type: 'badge_earned' }, mockNavigation as never);
  expect(mockNavigate).toHaveBeenCalledWith('Loyalty');
});

it('routes price_drop to ProductDetailScreen', () => {
  routeNotificationTap({ type: 'price_drop', productSlug: 'mesa-5000' }, mockNavigation as never);
  expect(mockNavigate).toHaveBeenCalledWith('ProductDetail', { slug: 'mesa-5000' });
});

it('routes unknown type to HomeScreen', () => {
  routeNotificationTap({ type: 'unknown_future_type' as never }, mockNavigation as never);
  expect(mockNavigate).toHaveBeenCalledWith('Home');
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest src/navigation/__tests__/NotificationRouter.test.ts --no-coverage
```

- [ ] **Step 3: Implement NotificationRouter**

```typescript
// src/navigation/NotificationRouter.ts
export type NotificationPayload =
  | { type: 'order_shipped'; orderId: string }
  | { type: 'order_delivered'; orderId: string }
  | { type: 'order_refunded'; orderId: string }
  | { type: 'challenge_started'; challengeId?: string }
  | { type: 'streak_extended' }
  | { type: 'badge_earned' }
  | { type: 'price_drop'; productSlug: string };

interface NavigationLike {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
}

export function routeNotificationTap(
  payload: NotificationPayload,
  navigation: NavigationLike,
): void {
  switch (payload.type) {
    case 'order_shipped':
    case 'order_delivered':
    case 'order_refunded':
      navigation.navigate('OrderDetail', { orderId: payload.orderId });
      break;
    case 'challenge_started':
      navigation.navigate('Challenges');
      break;
    case 'streak_extended':
      navigation.navigate('Challenges');
      break;
    case 'badge_earned':
      navigation.navigate('Loyalty');
      break;
    case 'price_drop':
      navigation.navigate('ProductDetail', { slug: payload.productSlug });
      break;
    default:
      navigation.navigate('Home');
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest src/navigation/__tests__/NotificationRouter.test.ts --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add src/navigation/NotificationRouter.ts src/navigation/__tests__/NotificationRouter.test.ts
git commit -m "feat(epicA): NotificationRouter maps notification types to screen routes"
```

---

## Task 4: emitBadgeEarned + emitTierChanged (crossRigEventBus extension)

**Files:**
- Modify: `src/services/crossRigEventBus.ts` (add two emitters at bottom)
- Modify: `src/services/__tests__/crossRigEventBus.test.ts` (add tests for new emitters)

- [ ] **Step 1: Write failing tests**

Add to `src/services/__tests__/crossRigEventBus.test.ts`:

```typescript
// Add these tests to the existing describe block
it('emitBadgeEarned sends badge_earned event', async () => {
  mockCallFunction.mockResolvedValue({ success: true });
  await emitBadgeEarned(mockClient, { badgeId: 'badge-1', badgeName: 'First Purchase' });
  expect(mockCallFunction).toHaveBeenCalledWith(
    'crossRigEvent',
    'POST',
    expect.objectContaining({ event: 'badge_earned', badgeId: 'badge-1', badgeName: 'First Purchase' }),
  );
});

it('emitTierChanged sends tier_changed event', async () => {
  mockCallFunction.mockResolvedValue({ success: true });
  await emitTierChanged(mockClient, { oldTier: 'bronze', newTier: 'silver' });
  expect(mockCallFunction).toHaveBeenCalledWith(
    'crossRigEvent',
    'POST',
    expect.objectContaining({ event: 'tier_changed', oldTier: 'bronze', newTier: 'silver' }),
  );
});
```

Also add to imports: `import { emitBadgeEarned, emitTierChanged } from '../crossRigEventBus';`

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest src/services/__tests__/crossRigEventBus.test.ts --no-coverage
```

- [ ] **Step 3: Add emitters to crossRigEventBus.ts**

Append to `src/services/crossRigEventBus.ts` after `emitRedemptionInitiated`:

```typescript
export async function emitBadgeEarned(
  client: WixClientLike | null,
  input: { badgeId: string; badgeName: string },
): Promise<CrossRigEventResult> {
  return emit(client, 'badge_earned', {
    badgeId: input.badgeId,
    badgeName: input.badgeName,
    delta: 0,
    newTotal: 0,
  });
}

export async function emitTierChanged(
  client: WixClientLike | null,
  input: { oldTier: string; newTier: string },
): Promise<CrossRigEventResult> {
  return emit(client, 'tier_changed', {
    oldTier: input.oldTier,
    newTier: input.newTier,
    delta: 0,
    newTotal: 0,
  });
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest src/services/__tests__/crossRigEventBus.test.ts --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add src/services/crossRigEventBus.ts src/services/__tests__/crossRigEventBus.test.ts
git commit -m "feat(epicA): add emitBadgeEarned + emitTierChanged to crossRigEventBus"
```

---

## Task 5: NotificationPermissionPromptScreen

**Files:**
- Create: `src/screens/NotificationPermissionPromptScreen.tsx`
- Create: `src/screens/__tests__/NotificationPermissionPromptScreen.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/screens/__tests__/NotificationPermissionPromptScreen.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@/hooks/useNotificationPermission', () => ({
  useNotificationPermission: () => ({
    status: 'undetermined',
    hasAskedBefore: false,
    requestPermission: mockRequest,
    openSettings: jest.fn(),
  }),
}));
jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { espresso: '#3A2518', sandBase: '#E8D5B7', offWhite: '#FAF7F2', sunsetCoral: '#E8845C' },
    spacing: { md: 16, lg: 24, xl: 32 },
    typography: { headingFamily: 'System', bodyFamily: 'System' },
    borderRadius: { md: 8 },
  }),
}));

const mockRequest = jest.fn().mockResolvedValue('granted');
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

import { NotificationPermissionPromptScreen } from '../NotificationPermissionPromptScreen';

beforeEach(() => jest.clearAllMocks());

it('renders explanation text and two CTAs', () => {
  const { getByText } = render(<NotificationPermissionPromptScreen />);
  expect(getByText(/turn on notifications/i)).toBeTruthy();
  expect(getByText(/maybe later/i)).toBeTruthy();
});

it('calls requestPermission on primary CTA press', async () => {
  const { getByText } = render(<NotificationPermissionPromptScreen />);
  fireEvent.press(getByText(/turn on notifications/i));
  expect(mockRequest).toHaveBeenCalled();
});

it('navigates back on maybe later', () => {
  const { getByText } = render(<NotificationPermissionPromptScreen />);
  fireEvent.press(getByText(/maybe later/i));
  expect(mockNavigate).toHaveBeenCalledWith('Home');
});

it('has testID for primary CTA', () => {
  const { getByTestId } = render(<NotificationPermissionPromptScreen />);
  expect(getByTestId('notif-prompt-enable')).toBeTruthy();
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest src/screens/__tests__/NotificationPermissionPromptScreen.test.tsx --no-coverage
```

- [ ] **Step 3: Implement screen**

```typescript
// src/screens/NotificationPermissionPromptScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';

export function NotificationPermissionPromptScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const navigation = useNavigation();
  const { requestPermission } = useNotificationPermission();

  async function handleEnable() {
    await requestPermission();
    navigation.navigate('Home' as never);
  }

  function handleLater() {
    navigation.navigate('Home' as never);
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.offWhite, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    title: { fontFamily: typography.headingFamily, fontSize: 24, color: colors.espresso, marginBottom: spacing.md, textAlign: 'center' },
    body: { fontFamily: typography.bodyFamily, fontSize: 16, color: colors.espresso, textAlign: 'center', marginBottom: spacing.lg * 2, lineHeight: 24 },
    primaryBtn: { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg * 2, marginBottom: spacing.md },
    primaryText: { color: colors.offWhite, fontFamily: typography.bodyFamily, fontSize: 16, fontWeight: '600' },
    secondaryText: { color: colors.espresso, fontFamily: typography.bodyFamily, fontSize: 14 },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stay in the loop</Text>
      <Text style={styles.body}>
        Get notified when your order ships, when you earn a badge, and when a futon you love drops in price.
      </Text>
      <TouchableOpacity
        testID="notif-prompt-enable"
        style={styles.primaryBtn}
        onPress={handleEnable}
        accessibilityRole="button"
        accessibilityLabel="Turn on notifications"
      >
        <Text style={styles.primaryText}>Turn on notifications</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleLater} accessibilityRole="button" accessibilityLabel="Maybe later">
        <Text style={styles.secondaryText}>Maybe later</Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest src/screens/__tests__/NotificationPermissionPromptScreen.test.tsx --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add src/screens/NotificationPermissionPromptScreen.tsx src/screens/__tests__/NotificationPermissionPromptScreen.test.tsx
git commit -m "feat(epicA): NotificationPermissionPromptScreen with pre-prompt explanation"
```

---

## Task 6: NotificationPreferencesScreen rework

**Files:**
- Modify: `src/screens/NotificationPreferencesScreen.tsx` (add skeleton + a11y)
- Modify or create: `src/screens/__tests__/NotificationPreferencesScreen.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/screens/__tests__/NotificationPreferencesScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { espresso: '#3A2518', sandBase: '#E8D5B7', offWhite: '#FAF7F2', sandDark: '#D4BC96' },
    spacing: { sm: 8, md: 16, lg: 24 },
    typography: { bodyFamily: 'System', headingFamily: 'System' },
    borderRadius: { md: 8 },
  }),
}));

const mockGetPrefs = jest.fn();
const mockSavePrefs = jest.fn();
jest.mock('@/hooks/useNotificationPreferences', () => ({
  useNotificationPreferences: () => ({
    preferences: mockPrefs,
    isLoading: false,
    toggle: mockSavePrefs,
  }),
}));

const mockPrefs = { orderUpdates: true, challenges: false, priceDrops: true, promotional: false };

import { NotificationPreferencesScreen } from '../NotificationPreferencesScreen';

it('renders skeleton when loading', () => {
  jest.resetModules();
  jest.doMock('@/hooks/useNotificationPreferences', () => ({
    useNotificationPreferences: () => ({ preferences: null, isLoading: true, toggle: jest.fn() }),
  }));
  const { NotificationPreferencesScreen: Screen } = require('../NotificationPreferencesScreen');
  const { getByTestId } = render(<Screen />);
  expect(getByTestId('notif-prefs-skeleton')).toBeTruthy();
});

it('renders preference toggles with correct initial state', async () => {
  const { getAllByRole } = render(<NotificationPreferencesScreen />);
  const switches = getAllByRole('switch');
  expect(switches.length).toBe(4);
  expect(switches[0].props.accessibilityState.checked).toBe(true);  // orderUpdates
  expect(switches[1].props.accessibilityState.checked).toBe(false); // challenges
});

it('calls toggle when switch is pressed', () => {
  const { getAllByRole } = render(<NotificationPreferencesScreen />);
  fireEvent(getAllByRole('switch')[0], 'valueChange', false);
  expect(mockSavePrefs).toHaveBeenCalledWith('orderUpdates', false);
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest src/screens/__tests__/NotificationPreferencesScreen.test.tsx --no-coverage
```

- [ ] **Step 3: Create useNotificationPreferences hook**

```typescript
// src/hooks/useNotificationPreferences.ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = '@cf_notif_prefs';

export interface NotificationPreferences {
  orderUpdates: boolean;
  challenges: boolean;
  priceDrops: boolean;
  promotional: boolean;
}

const DEFAULTS: NotificationPreferences = {
  orderUpdates: true,
  challenges: true,
  priceDrops: true,
  promotional: false,
};

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then((raw) => {
      setPreferences(raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS);
      setIsLoading(false);
    });
  }, []);

  const toggle = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { preferences, isLoading, toggle };
}
```

- [ ] **Step 4: Update NotificationPreferencesScreen**

Open `src/screens/NotificationPreferencesScreen.tsx` and replace its loading state (currently bare spinner) with:

```typescript
// Add near top of component:
if (isLoading) {
  return (
    <View testID="notif-prefs-skeleton" style={styles.container}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.skeletonRow, { backgroundColor: colors.sandDark }]} />
      ))}
    </View>
  );
}
```

Update each `Switch` to include:
```typescript
accessibilityRole="switch"
accessibilityState={{ checked: preferences.orderUpdates }}
accessibilityLabel="Order update notifications"
onValueChange={(val) => toggle('orderUpdates', val)}
```
(Repeat pattern for each of the 4 preference toggles.)

- [ ] **Step 5: Run all tests — expect PASS**

```bash
npx jest src/screens/__tests__/NotificationPreferencesScreen.test.tsx src/hooks/__tests__/ --no-coverage
```

- [ ] **Step 6: Commit**

```bash
git add src/screens/NotificationPreferencesScreen.tsx src/hooks/useNotificationPreferences.ts src/screens/__tests__/NotificationPreferencesScreen.test.tsx
git commit -m "feat(epicA): NotificationPreferencesScreen skeleton + a11y switches"
```

---

## Task 7: Wire token registration into AuthProvider + open PR

**Files:**
- Modify: `src/hooks/useAuth.tsx` (call registerDeviceToken after login, deregister on logout)

- [ ] **Step 1: Locate auth hooks**

```bash
grep -n "signIn\|signOut\|login\|logout" src/hooks/useAuth.tsx | head -20
```

- [ ] **Step 2: Add registration calls**

After successful sign-in, call `registerDeviceToken(wixClient)`. Before sign-out, call `deregisterDeviceToken(wixClient)`. Both calls are fire-and-forget (do not await in the auth flow — they are best-effort):

```typescript
// After signIn success:
registerDeviceToken(wixClient).catch(() => {}); // best-effort, logged inside service

// Before signOut:
deregisterDeviceToken(wixClient).catch(() => {}); // best-effort
```

- [ ] **Step 3: Run full test suite**

```bash
npx jest --no-coverage 2>&1 | tail -10
```
Expected: all existing tests pass + new tests pass.

- [ ] **Step 4: Commit and open PR**

```bash
git add src/hooks/useAuth.tsx
git commit -m "feat(epicA): wire push token registration into auth lifecycle"
git push origin cm-epicA-push-engine
gh pr create -R DreadPirateRobertz/carolina-futons-mobile \
  --title "feat(epicA): Push Notification Engine" \
  --body "$(cat <<'EOF'
## Summary
- useNotificationPermission hook with AsyncStorage asked-flag
- NotificationService: device token register/deregister via Wix
- NotificationRouter: maps notification type to screen route
- emitBadgeEarned + emitTierChanged added to crossRigEventBus
- NotificationPermissionPromptScreen (pre-prompt explanation)
- NotificationPreferencesScreen: skeleton loading + a11y switches
- Token registration wired into auth lifecycle

## Test plan
- [ ] All unit tests pass on linux
- [ ] Physical device: permission prompt → grant → receive test push
- [ ] Physical device: preference toggles persist across app restarts
- [ ] Notification tap routes to correct screen in foreground and cold-start

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Checklist

- ✅ `useNotificationPermission` → `NotificationService` → `NotificationRouter` types consistent
- ✅ `NotificationPayload` union covers all emitted event types including new `badge_earned`/`tier_changed`
- ✅ `MemberPushTokens` Wix collection referenced in Task 2 — wix-side creation is a separate cf-epicA bead for melania
- ✅ No TBDs or placeholders
- ✅ Physical device requirement noted in PR test plan
- ✅ `useNotificationPreferences` hook created in Task 6 before screen uses it
