import { ANALYTICS } from '../analyticsEvents';

it('exports all required checkout event constants', () => {
  expect(ANALYTICS.CHECKOUT_STARTED).toBe('checkout_started');
  expect(ANALYTICS.PROMO_CODE_APPLIED).toBe('promo_code_applied');
  expect(ANALYTICS.PROMO_CODE_REJECTED).toBe('promo_code_rejected');
  expect(ANALYTICS.PAYMENT_INITIATED).toBe('payment_initiated');
  expect(ANALYTICS.PAYMENT_SUCCESS).toBe('payment_success');
  expect(ANALYTICS.PAYMENT_FAILED).toBe('payment_failed');
  expect(ANALYTICS.CART_ABANDONED).toBe('cart_abandoned');
});
