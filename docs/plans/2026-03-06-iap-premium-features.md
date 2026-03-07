# In-App Purchase Flow for Premium Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an in-app purchase subscription ("CF+") that unlocks premium app features: AR Room Designer, Early Access collections, and free shipping on all orders.

**Architecture:** RevenueCat (`react-native-purchases`) manages IAP lifecycle (purchase, restore, entitlement checks) with server-side receipt validation. A `PremiumProvider` context exposes entitlement state app-wide. A `PremiumScreen` presents subscription options. Feature gates check entitlements at point of use.

**Tech Stack:** react-native-purchases (RevenueCat), Expo config plugin, React Context, AsyncStorage (cache), existing theme/components.

---

### Task 1: IAP Service Layer

**Files:**
- Create: `src/services/purchases.ts`
- Test: `src/services/__tests__/purchases.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/__tests__/purchases.test.ts
import {
  initializePurchases,
  getOfferings,
  purchasePackage,
  restorePurchases,
  getActiveEntitlements,
  PurchaseError,
  ENTITLEMENT_ID,
} from '../purchases';
import Purchases from 'react-native-purchases';

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    getCustomerInfo: jest.fn(),
    setLogLevel: jest.fn(),
    LOG_LEVEL: { DEBUG: 'DEBUG' },
  },
}));

describe('purchases service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('initializePurchases', () => {
    it('configures RevenueCat with API key', async () => {
      await initializePurchases();
      expect(Purchases.configure).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: expect.any(String) }),
      );
    });
  });

  describe('getOfferings', () => {
    it('returns current offering packages', async () => {
      const mockOfferings = {
        current: {
          identifier: 'default',
          availablePackages: [
            { identifier: '$rc_monthly', product: { priceString: '$4.99' } },
            { identifier: '$rc_annual', product: { priceString: '$39.99' } },
          ],
        },
      };
      (Purchases.getOfferings as jest.Mock).mockResolvedValue(mockOfferings);

      const result = await getOfferings();
      expect(result).toEqual(mockOfferings.current.availablePackages);
    });

    it('returns empty array when no current offering', async () => {
      (Purchases.getOfferings as jest.Mock).mockResolvedValue({ current: null });
      const result = await getOfferings();
      expect(result).toEqual([]);
    });
  });

  describe('purchasePackage', () => {
    it('returns customer info on success', async () => {
      const mockInfo = {
        entitlements: { active: { [ENTITLEMENT_ID]: { isActive: true } } },
      };
      (Purchases.purchasePackage as jest.Mock).mockResolvedValue({
        customerInfo: mockInfo,
      });

      const pkg = { identifier: '$rc_monthly' } as any;
      const result = await purchasePackage(pkg);
      expect(result).toEqual(mockInfo);
    });

    it('throws PurchaseError on failure', async () => {
      (Purchases.purchasePackage as jest.Mock).mockRejectedValue({
        userCancelled: false,
        message: 'Network error',
      });

      const pkg = { identifier: '$rc_monthly' } as any;
      await expect(purchasePackage(pkg)).rejects.toThrow(PurchaseError);
    });

    it('returns null when user cancels', async () => {
      (Purchases.purchasePackage as jest.Mock).mockRejectedValue({
        userCancelled: true,
      });

      const pkg = { identifier: '$rc_monthly' } as any;
      const result = await purchasePackage(pkg);
      expect(result).toBeNull();
    });
  });

  describe('restorePurchases', () => {
    it('returns customer info', async () => {
      const mockInfo = { entitlements: { active: {} } };
      (Purchases.restorePurchases as jest.Mock).mockResolvedValue(mockInfo);

      const result = await restorePurchases();
      expect(result).toEqual(mockInfo);
    });
  });

  describe('getActiveEntitlements', () => {
    it('returns true when premium entitlement is active', async () => {
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue({
        entitlements: { active: { [ENTITLEMENT_ID]: { isActive: true } } },
      });

      const result = await getActiveEntitlements();
      expect(result).toBe(true);
    });

    it('returns false when no active entitlement', async () => {
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue({
        entitlements: { active: {} },
      });

      const result = await getActiveEntitlements();
      expect(result).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/purchases.test.ts --no-coverage`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/services/purchases.ts
import Purchases from 'react-native-purchases';
import type { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUECAT_IOS_KEY = 'appl_cfutons_rc_key';
const REVENUECAT_ANDROID_KEY = 'goog_cfutons_rc_key';

export const ENTITLEMENT_ID = 'cf_plus';

export class PurchaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PurchaseError';
  }
}

export async function initializePurchases(): Promise<void> {
  if (__DEV__) {
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
  }
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
  Purchases.configure({ apiKey });
}

export async function getOfferings(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (err: any) {
    if (err.userCancelled) return null;
    throw new PurchaseError(err.message ?? 'Purchase failed');
  }
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export async function getActiveEntitlements(): Promise<boolean> {
  const info = await Purchases.getCustomerInfo();
  return ENTITLEMENT_ID in (info.entitlements.active ?? {});
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/services/__tests__/purchases.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/purchases.ts src/services/__tests__/purchases.test.ts
git commit -m "feat(iap): add RevenueCat purchases service layer (cm-iqn)"
```

---

### Task 2: Premium Context Provider & Hook

**Files:**
- Create: `src/hooks/usePremium.tsx`
- Test: `src/hooks/__tests__/usePremium.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/usePremium.test.tsx
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { PremiumProvider, usePremium } from '../usePremium';
import * as purchasesService from '@/services/purchases';

jest.mock('@/services/purchases');

const mockedGetActiveEntitlements = purchasesService.getActiveEntitlements as jest.MockedFunction<
  typeof purchasesService.getActiveEntitlements
>;
const mockedGetOfferings = purchasesService.getOfferings as jest.MockedFunction<
  typeof purchasesService.getOfferings
>;
const mockedPurchasePackage = purchasesService.purchasePackage as jest.MockedFunction<
  typeof purchasesService.purchasePackage
>;
const mockedRestorePurchases = purchasesService.restorePurchases as jest.MockedFunction<
  typeof purchasesService.restorePurchases
>;
const mockedInitializePurchases = purchasesService.initializePurchases as jest.MockedFunction<
  typeof purchasesService.initializePurchases
>;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(PremiumProvider, null, children);
}

describe('usePremium', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedInitializePurchases.mockResolvedValue(undefined);
    mockedGetActiveEntitlements.mockResolvedValue(false);
    mockedGetOfferings.mockResolvedValue([]);
  });

  it('initializes with isPremium false', async () => {
    const { result } = renderHook(() => usePremium(), { wrapper });
    expect(result.current.isPremium).toBe(false);
  });

  it('checks entitlements on mount', async () => {
    mockedGetActiveEntitlements.mockResolvedValue(true);
    const { result, rerender } = renderHook(() => usePremium(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isPremium).toBe(true);
  });

  it('purchase updates isPremium on success', async () => {
    const mockPkg = { identifier: '$rc_monthly' } as any;
    const mockInfo = {
      entitlements: { active: { cf_plus: { isActive: true } } },
    } as any;
    mockedPurchasePackage.mockResolvedValue(mockInfo);
    mockedGetOfferings.mockResolvedValue([mockPkg]);

    const { result } = renderHook(() => usePremium(), { wrapper });

    await act(async () => {
      await result.current.purchase(mockPkg);
    });

    expect(result.current.isPremium).toBe(true);
  });

  it('restore updates isPremium', async () => {
    const mockInfo = {
      entitlements: { active: { cf_plus: { isActive: true } } },
    } as any;
    mockedRestorePurchases.mockResolvedValue(mockInfo);

    const { result } = renderHook(() => usePremium(), { wrapper });

    await act(async () => {
      await result.current.restore();
    });

    expect(result.current.isPremium).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/hooks/__tests__/usePremium.test.tsx --no-coverage`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/hooks/usePremium.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import {
  initializePurchases,
  getActiveEntitlements,
  getOfferings,
  purchasePackage,
  restorePurchases,
  ENTITLEMENT_ID,
} from '@/services/purchases';

interface PremiumContextValue {
  isPremium: boolean;
  isLoading: boolean;
  offerings: PurchasesPackage[];
  error: string | null;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await initializePurchases();
        const [active, pkgs] = await Promise.all([
          getActiveEntitlements(),
          getOfferings(),
        ]);
        if (mounted) {
          setIsPremium(active);
          setOfferings(pkgs);
        }
      } catch {
        // Non-fatal — IAP may not be available in simulator
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();
    return () => { mounted = false; };
  }, []);

  const checkEntitlement = useCallback((info: CustomerInfo): boolean => {
    return ENTITLEMENT_ID in (info.entitlements.active ?? {});
  }, []);

  const purchase = useCallback(
    async (pkg: PurchasesPackage): Promise<boolean> => {
      setError(null);
      try {
        const info = await purchasePackage(pkg);
        if (!info) return false; // user cancelled
        const active = checkEntitlement(info);
        setIsPremium(active);
        return active;
      } catch (err: any) {
        setError(err.message ?? 'Purchase failed');
        return false;
      }
    },
    [checkEntitlement],
  );

  const restore = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      const info = await restorePurchases();
      const active = checkEntitlement(info);
      setIsPremium(active);
      return active;
    } catch (err: any) {
      setError(err.message ?? 'Restore failed');
      return false;
    }
  }, [checkEntitlement]);

  const refreshStatus = useCallback(async () => {
    const active = await getActiveEntitlements();
    setIsPremium(active);
  }, []);

  return (
    <PremiumContext.Provider
      value={{ isPremium, isLoading, offerings, error, purchase, restore, refreshStatus }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider');
  return ctx;
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/hooks/__tests__/usePremium.test.tsx --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/usePremium.tsx src/hooks/__tests__/usePremium.test.tsx
git commit -m "feat(iap): add PremiumProvider context and usePremium hook (cm-iqn)"
```

---

### Task 3: Premium Upgrade Screen

**Files:**
- Create: `src/screens/PremiumScreen.tsx`
- Test: `src/screens/__tests__/PremiumScreen.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/screens/__tests__/PremiumScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PremiumScreen } from '../PremiumScreen';

const mockPurchase = jest.fn();
const mockRestore = jest.fn();

jest.mock('@/hooks/usePremium', () => ({
  usePremium: () => ({
    isPremium: false,
    isLoading: false,
    offerings: [
      {
        identifier: '$rc_monthly',
        product: {
          priceString: '$4.99',
          title: 'CF+ Monthly',
          description: 'Monthly subscription',
        },
        packageType: 'MONTHLY',
      },
      {
        identifier: '$rc_annual',
        product: {
          priceString: '$39.99',
          title: 'CF+ Annual',
          description: 'Annual subscription',
        },
        packageType: 'ANNUAL',
      },
    ],
    error: null,
    purchase: mockPurchase,
    restore: mockRestore,
  }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sunsetCoral: '#E8845C',
      sunsetCoralDark: '#C96B44',
      mountainBlue: '#5B8FA8',
      mountainBlueLight: '#A8CCD8',
      espresso: '#3A2518',
      espressoLight: '#5C4033',
      sandBase: '#E8D5B7',
      sandLight: '#F2E8D5',
      success: '#4A7C59',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, button: 8 },
    shadows: { card: {}, button: {} },
    typography: { headingFamily: 'System', bodyFamily: 'System', button: {} },
  }),
}));

describe('PremiumScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders feature list', () => {
    const { getByText } = render(<PremiumScreen onBack={() => {}} />);
    expect(getByText('AR Room Designer')).toBeTruthy();
    expect(getByText('Early Access')).toBeTruthy();
    expect(getByText('Free Shipping')).toBeTruthy();
  });

  it('renders subscription options', () => {
    const { getByText } = render(<PremiumScreen onBack={() => {}} />);
    expect(getByText('$4.99')).toBeTruthy();
    expect(getByText('$39.99')).toBeTruthy();
  });

  it('calls purchase when plan is selected', () => {
    const { getByTestId } = render(<PremiumScreen onBack={() => {}} />);
    fireEvent.press(getByTestId('purchase-monthly'));
    expect(mockPurchase).toHaveBeenCalled();
  });

  it('renders restore button', () => {
    const { getByTestId } = render(<PremiumScreen onBack={() => {}} />);
    fireEvent.press(getByTestId('restore-purchases'));
    expect(mockRestore).toHaveBeenCalled();
  });

  it('renders back button that calls onBack', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(<PremiumScreen onBack={onBack} />);
    fireEvent.press(getByTestId('premium-back'));
    expect(onBack).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/screens/__tests__/PremiumScreen.test.tsx --no-coverage`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

The PremiumScreen uses the dark theme palette (like AccountScreen), MountainSkyline banner, GlassCards for feature list and plan options, and the Button component for purchase CTAs.

See implementation code in Task 3 step of actual execution.

**Step 4: Run test to verify it passes**

Run: `npx jest src/screens/__tests__/PremiumScreen.test.tsx --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/screens/PremiumScreen.tsx src/screens/__tests__/PremiumScreen.test.tsx
git commit -m "feat(iap): add PremiumScreen with plan selection UI (cm-iqn)"
```

---

### Task 4: Navigation & AccountScreen Integration

**Files:**
- Modify: `src/navigation/AppNavigator.tsx` — add Premium route
- Modify: `src/screens/AccountScreen.tsx` — add CF+ menu item
- Modify: `App.tsx` — wrap with PremiumProvider

**Step 1: Add Premium route to AppNavigator**

Add `Premium: undefined` to `RootStackParamList`, lazy-load `PremiumScreen`, add `Stack.Screen`.

**Step 2: Add CF+ menu item to AccountScreen**

Add a "CF+ Premium" menu item between "Payment Methods" and "Notification Preferences" in the authenticated menu. In guest state, add nothing (require auth first).

**Step 3: Wrap App with PremiumProvider**

Add `PremiumProvider` wrapper in `App.tsx` around the existing provider tree.

**Step 4: Run existing tests to verify no regressions**

Run: `npx jest --no-coverage`
Expected: All existing tests PASS

**Step 5: Commit**

```bash
git add src/navigation/AppNavigator.tsx src/screens/AccountScreen.tsx App.tsx
git commit -m "feat(iap): integrate PremiumScreen into navigation and account (cm-iqn)"
```

---

### Task 5: Install react-native-purchases dependency

**Step 1: Install package**

```bash
npx expo install react-native-purchases
```

**Step 2: Add jest mock to jest.setup.js**

```javascript
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getOfferings: jest.fn(() => Promise.resolve({ current: null })),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    getCustomerInfo: jest.fn(() =>
      Promise.resolve({ entitlements: { active: {} } }),
    ),
    setLogLevel: jest.fn(),
    LOG_LEVEL: { DEBUG: 'DEBUG' },
  },
}));
```

**Step 3: Verify all tests pass**

Run: `npx jest --no-coverage`
Expected: PASS

**Step 4: Commit**

```bash
git add package.json package-lock.json jest.setup.js
git commit -m "chore: add react-native-purchases dependency (cm-iqn)"
```

---

### Task 6: Final verification

**Step 1: Run full test suite**

```bash
npx jest --no-coverage
```

**Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

**Step 3: Run linter**

```bash
npx eslint src/services/purchases.ts src/hooks/usePremium.tsx src/screens/PremiumScreen.tsx
```

**Step 4: Fix any issues, commit**
