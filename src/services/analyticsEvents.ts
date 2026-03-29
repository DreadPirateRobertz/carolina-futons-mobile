export const ANALYTICS = {
  CHECKOUT_STARTED: 'checkout_started',
  PROMO_CODE_APPLIED: 'promo_code_applied',
  PROMO_CODE_REJECTED: 'promo_code_rejected',
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  CART_ABANDONED: 'cart_abandoned',
  GUEST_CHECKOUT_STARTED: 'guest_checkout_started',
  GUEST_CHECKOUT_COMPLETED: 'guest_checkout_completed',
} as const;

export type AnalyticsEvent = (typeof ANALYTICS)[keyof typeof ANALYTICS];
