import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { PremiumProvider, usePremium } from '../usePremium';
import * as purchasesService from '@/services/purchases';

jest.mock('@/services/purchases', () => {
  const actual = jest.requireActual('@/services/purchases');
  return {
    ...actual,
    initializePurchases: jest.fn(),
    getActiveEntitlements: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
  };
});

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

async function flushInit() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('usePremium', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedInitializePurchases.mockResolvedValue(undefined);
    mockedGetActiveEntitlements.mockResolvedValue(false);
    mockedGetOfferings.mockResolvedValue([]);
  });

  it('initializes with isPremium false', () => {
    const { result } = renderHook(() => usePremium(), { wrapper });
    expect(result.current.isPremium).toBe(false);
  });

  it('checks entitlements on mount', async () => {
    mockedGetActiveEntitlements.mockResolvedValue(true);
    const { result } = renderHook(() => usePremium(), { wrapper });

    await flushInit();

    expect(result.current.isPremium).toBe(true);
  });

  it('purchase updates isPremium on success', async () => {
    const mockPkg = { identifier: '$rc_monthly' } as any;
    const mockInfo = {
      entitlements: { active: { cf_plus: { isActive: true } } },
    } as any;
    mockedPurchasePackage.mockResolvedValue(mockInfo);

    const { result } = renderHook(() => usePremium(), { wrapper });
    await flushInit();

    let purchaseResult: string | undefined;
    await act(async () => {
      purchaseResult = await result.current.purchase(mockPkg);
    });

    expect(purchaseResult).toBe('success');
    expect(result.current.isPremium).toBe(true);
  });

  it('restore updates isPremium', async () => {
    const mockInfo = {
      entitlements: { active: { cf_plus: { isActive: true } } },
    } as any;
    mockedRestorePurchases.mockResolvedValue(mockInfo);

    const { result } = renderHook(() => usePremium(), { wrapper });
    await flushInit();

    await act(async () => {
      await result.current.restore();
    });

    expect(result.current.isPremium).toBe(true);
  });

  it('handles purchase cancellation', async () => {
    const mockPkg = { identifier: '$rc_monthly' } as any;
    mockedPurchasePackage.mockResolvedValue(null);

    const { result } = renderHook(() => usePremium(), { wrapper });
    await flushInit();

    let purchaseResult: string | undefined;
    await act(async () => {
      purchaseResult = await result.current.purchase(mockPkg);
    });

    expect(purchaseResult).toBe('cancelled');
    expect(result.current.isPremium).toBe(false);
  });

  it('sets error on purchase failure', async () => {
    const mockPkg = { identifier: '$rc_monthly' } as any;
    mockedPurchasePackage.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePremium(), { wrapper });
    await flushInit();

    let purchaseResult: string | undefined;
    await act(async () => {
      purchaseResult = await result.current.purchase(mockPkg);
    });

    expect(purchaseResult).toBe('error');
    expect(result.current.error).toBe('Network error');
    expect(result.current.isPremium).toBe(false);
  });

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => usePremium());
    }).toThrow('usePremium must be used within PremiumProvider');
  });
});
