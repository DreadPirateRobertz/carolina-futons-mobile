/**
 * @module purchases
 *
 * RevenueCat IAP service — manages in-app purchase lifecycle for the CF+
 * premium subscription. Handles initialization, offering retrieval, purchase
 * execution, restore, and entitlement checks. All receipt validation happens
 * server-side via RevenueCat.
 */

import Purchases from 'react-native-purchases';
import type { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';

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
  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!apiKey) {
    console.warn('RevenueCat API key not set — skipping purchases init');
    return;
  }
  Purchases.configure({ apiKey });
}

export async function getOfferings(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
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
