/**
 * @module usePremium
 *
 * Context provider and hook for CF+ premium subscription state. Initializes
 * RevenueCat on mount, checks entitlements, and exposes purchase/restore
 * actions. Components gate premium features via `isPremium`.
 */

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
    return () => {
      mounted = false;
    };
  }, []);

  const checkEntitlement = useCallback((info: CustomerInfo): boolean => {
    return ENTITLEMENT_ID in (info.entitlements.active ?? {});
  }, []);

  const purchase = useCallback(
    async (pkg: PurchasesPackage): Promise<boolean> => {
      setError(null);
      try {
        const info = await purchasePackage(pkg);
        if (!info) return false;
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
    try {
      const active = await getActiveEntitlements();
      setIsPremium(active);
    } catch {
      // Silent — will retry on next check
    }
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
