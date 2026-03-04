/**
 * Conversion funnel definitions for tracking user journeys.
 *
 * Each funnel defines an ordered sequence of analytics events that represent
 * a meaningful conversion path. Use these with your analytics dashboard to
 * measure drop-off rates and optimize the user experience.
 */
import type { AnalyticsEventName } from './analytics';

export interface FunnelStep {
  name: string;
  event: AnalyticsEventName;
}

export interface Funnel {
  id: string;
  name: string;
  description: string;
  steps: FunnelStep[];
}

/** Purchase funnel: browse → view → cart → checkout → purchase */
export const purchaseFunnel: Funnel = {
  id: 'purchase',
  name: 'Purchase Funnel',
  description: 'Tracks the standard e-commerce purchase flow from browsing to checkout',
  steps: [
    { name: 'View Product', event: 'view_product' },
    { name: 'Add to Cart', event: 'add_to_cart' },
    { name: 'Begin Checkout', event: 'begin_checkout' },
    { name: 'Purchase', event: 'purchase' },
  ],
};

/** AR-to-purchase funnel: AR experience → add to cart from AR → purchase */
export const arToPurchaseFunnel: Funnel = {
  id: 'ar_to_purchase',
  name: 'AR to Purchase',
  description: 'Tracks conversions from AR product visualization to purchase',
  steps: [
    { name: 'Open AR', event: 'open_ar' },
    { name: 'Place Furniture', event: 'ar_furniture_placed' },
    { name: 'Add to Cart from AR', event: 'ar_add_to_cart' },
    { name: 'Begin Checkout', event: 'begin_checkout' },
    { name: 'Purchase', event: 'purchase' },
  ],
};

/** Browse funnel: search/filter → view product → engage (AR or cart) */
export const browseFunnel: Funnel = {
  id: 'browse',
  name: 'Browse Funnel',
  description: 'Tracks how users discover and engage with products',
  steps: [
    { name: 'Search', event: 'search' },
    { name: 'View Product', event: 'view_product' },
    { name: 'Select Fabric', event: 'select_fabric' },
    { name: 'Add to Cart', event: 'add_to_cart' },
  ],
};

/** Wishlist funnel: browse → wishlist → eventual purchase */
export const wishlistFunnel: Funnel = {
  id: 'wishlist',
  name: 'Wishlist Funnel',
  description: 'Tracks wishlist engagement and conversion to purchase',
  steps: [
    { name: 'View Product', event: 'view_product' },
    { name: 'Add to Wishlist', event: 'add_to_wishlist' },
    { name: 'Add to Cart', event: 'add_to_cart' },
    { name: 'Purchase', event: 'purchase' },
  ],
};

/** All funnels for dashboard registration */
export const allFunnels: Funnel[] = [purchaseFunnel, arToPurchaseFunnel, browseFunnel, wishlistFunnel];
