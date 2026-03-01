/**
 * Conversion funnel tracking for key user journeys.
 *
 * Defines funnel step sequences and provides helpers to track
 * user progression through shopping, checkout, and AR funnels.
 * Works with the analytics abstraction layer — no direct SDK dependency.
 */

import { trackEvent, type AnalyticsEventName } from './analytics';

export interface FunnelStep {
  name: string;
  event: AnalyticsEventName;
}

export interface FunnelDefinition {
  id: string;
  name: string;
  steps: FunnelStep[];
}

/** Core conversion funnels for Carolina Futons */
export const FUNNELS: Record<string, FunnelDefinition> = {
  purchase: {
    id: 'purchase_funnel',
    name: 'Purchase Funnel',
    steps: [
      { name: 'View Product', event: 'view_product' },
      { name: 'Add to Cart', event: 'add_to_cart' },
      { name: 'Begin Checkout', event: 'begin_checkout' },
      { name: 'Purchase', event: 'purchase' },
    ],
  },

  arToPurchase: {
    id: 'ar_to_purchase_funnel',
    name: 'AR to Purchase Funnel',
    steps: [
      { name: 'Open AR', event: 'open_ar' },
      { name: 'Place Furniture', event: 'ar_furniture_placed' },
      { name: 'AR Add to Cart', event: 'ar_add_to_cart' },
      { name: 'Begin Checkout', event: 'begin_checkout' },
      { name: 'Purchase', event: 'purchase' },
    ],
  },

  browseToPurchase: {
    id: 'browse_to_purchase_funnel',
    name: 'Browse to Purchase Funnel',
    steps: [
      { name: 'Search or Browse', event: 'search' },
      { name: 'View Product', event: 'view_product' },
      { name: 'Add to Cart', event: 'add_to_cart' },
      { name: 'Purchase', event: 'purchase' },
    ],
  },

  wishlistConversion: {
    id: 'wishlist_conversion_funnel',
    name: 'Wishlist Conversion Funnel',
    steps: [
      { name: 'Add to Wishlist', event: 'add_to_wishlist' },
      { name: 'View Product', event: 'view_product' },
      { name: 'Add to Cart', event: 'add_to_cart' },
      { name: 'Purchase', event: 'purchase' },
    ],
  },
};

/**
 * Track a funnel step with the funnel context attached as properties.
 * This enables funnel analysis in both Firebase and Mixpanel dashboards.
 */
export function trackFunnelStep(
  funnelId: string,
  stepEvent: AnalyticsEventName,
  properties?: Record<string, string | number | boolean>,
): void {
  const funnel = Object.values(FUNNELS).find((f) => f.id === funnelId);
  if (!funnel) return;

  const stepIndex = funnel.steps.findIndex((s) => s.event === stepEvent);
  if (stepIndex === -1) return;

  trackEvent(stepEvent, {
    ...properties,
    funnel_id: funnelId,
    funnel_name: funnel.name,
    funnel_step: stepIndex + 1,
    funnel_step_name: funnel.steps[stepIndex].name,
    funnel_total_steps: funnel.steps.length,
  });
}

/** Convenience helpers for common funnel tracking */
export const funnelEvents = {
  /** Track a step in the purchase funnel */
  purchaseStep(
    stepEvent: AnalyticsEventName,
    properties?: Record<string, string | number | boolean>,
  ) {
    trackFunnelStep('purchase_funnel', stepEvent, properties);
  },

  /** Track a step in the AR-to-purchase funnel */
  arPurchaseStep(
    stepEvent: AnalyticsEventName,
    properties?: Record<string, string | number | boolean>,
  ) {
    trackFunnelStep('ar_to_purchase_funnel', stepEvent, properties);
  },

  /** Track a step in the browse-to-purchase funnel */
  browseStep(
    stepEvent: AnalyticsEventName,
    properties?: Record<string, string | number | boolean>,
  ) {
    trackFunnelStep('browse_to_purchase_funnel', stepEvent, properties);
  },

  /** Track a step in the wishlist conversion funnel */
  wishlistStep(
    stepEvent: AnalyticsEventName,
    properties?: Record<string, string | number | boolean>,
  ) {
    trackFunnelStep('wishlist_conversion_funnel', stepEvent, properties);
  },
};
