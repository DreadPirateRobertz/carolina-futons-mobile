/**
 * Hook for promo code validation against the Wix coupons API.
 *
 * Manages promo code input state, validation loading/error states,
 * and computes the discount amount based on the applied coupon.
 */

import { useState, useCallback } from 'react';
import { useWixClient } from '@/services/wix';
import { WixApiError, type CouponResult } from '@/services/wix';

export type PromoCodeStatus = 'idle' | 'validating' | 'applied' | 'error';

export interface PromoCodeState {
  /** Current status of the promo code flow. */
  status: PromoCodeStatus;
  /** The validated coupon, if successfully applied. */
  coupon: CouponResult | null;
  /** Error message if validation failed. */
  error: string | null;
  /** Apply a promo code against the Wix coupons API. */
  applyCode: (code: string) => Promise<void>;
  /** Remove the currently applied coupon. */
  removeCode: () => void;
  /** Compute the discount amount for a given subtotal. Returns 0 if no coupon applied. */
  getDiscount: (subtotal: number) => number;
}

export function usePromoCode(): PromoCodeState {
  const wixClient = useWixClient();
  const [status, setStatus] = useState<PromoCodeStatus>('idle');
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyCode = useCallback(
    async (code: string) => {
      if (!code.trim()) {
        setError('Please enter a promo code');
        setStatus('error');
        return;
      }

      setStatus('validating');
      setError(null);

      try {
        const result = await wixClient.applyCoupon(code);
        setCoupon(result);
        setStatus('applied');
        setError(null);
      } catch (err) {
        const message =
          err instanceof WixApiError
            ? err.statusCode === 404
              ? 'Invalid promo code'
              : err.message
            : 'Unable to validate promo code';
        setError(message);
        setStatus('error');
        setCoupon(null);
      }
    },
    [wixClient],
  );

  const removeCode = useCallback(() => {
    setCoupon(null);
    setStatus('idle');
    setError(null);
  }, []);

  const getDiscount = useCallback(
    (subtotal: number): number => {
      if (!coupon) return 0;
      if (coupon.minimumSubtotal && subtotal < coupon.minimumSubtotal) return 0;

      if (coupon.discountType === 'percentage') {
        return Math.round(subtotal * (coupon.discountValue / 100) * 100) / 100;
      }
      // Fixed amount — cannot exceed subtotal
      return Math.min(coupon.discountValue, subtotal);
    },
    [coupon],
  );

  return { status, coupon, error, applyCode, removeCode, getDiscount };
}
