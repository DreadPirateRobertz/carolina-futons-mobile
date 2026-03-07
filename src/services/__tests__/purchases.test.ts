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
    it('configures RevenueCat with env-based API key', async () => {
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
