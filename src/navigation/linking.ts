/**
 * Deep linking configuration for React Navigation.
 *
 * URL scheme: carolinafutons://
 * Universal links: https://carolinafutons.com/
 *
 * Supported routes:
 *   carolinafutons://product/{slug}    → ProductDetailScreen
 *   carolinafutons://products/{slug}   → ProductDetailScreen (Wix website alias)
 *   carolinafutons://category/{slug}   → CategoryScreen
 *   carolinafutons://cart              → CartScreen (via Tabs)
 *   carolinafutons://checkout          → CheckoutScreen
 *   carolinafutons://orders            → OrderHistoryScreen
 *   carolinafutons://orders/{id}       → OrderDetailScreen
 *   carolinafutons://account           → AccountScreen (via Tabs)
 *   carolinafutons://shop              → ShopScreen (via Tabs)
 *   carolinafutons://home              → HomeScreen (via Tabs)
 *   carolinafutons://stores             → StoreLocatorScreen
 *   carolinafutons://store-locator      → StoreLocatorScreen (alias)
 *   carolinafutons://ar                → ARScreen (modal)
 */

import type { LinkingOptions } from '@react-navigation/native';
import { getStateFromPath } from '@react-navigation/native';
import type { RootStackParamList } from './AppNavigator';

/** Normalize URL paths before React Navigation processes them (e.g. /products/ → /product/) */
const normalizePathForLinking: NonNullable<LinkingOptions<RootStackParamList>['getStateFromPath']> = (
  path,
  options,
) => {
  let normalized = path.replace(/^\/products\//, '/product/');
  normalized = normalized.replace(/^\/?store-locator(\/|$)/, '/stores$1');
  return getStateFromPath(normalized, options);
};

export const linkingConfig: LinkingOptions<RootStackParamList> = {
  prefixes: ['carolinafutons://', 'https://carolinafutons.com', 'https://www.carolinafutons.com'],
  config: {
    screens: {
      Tabs: {
        screens: {
          Home: 'home',
          Shop: 'shop',
          Cart: 'cart',
          Account: 'account',
        },
      },
      AR: 'ar',
      Category: 'category/:slug',
      ProductDetail: {
        path: 'product/:slug',
        parse: {
          slug: (slug: string) => slug,
        },
      },
      Checkout: 'checkout',
      OrderConfirmation: 'order-confirmation',
      OrderHistory: 'orders',
      OrderDetail: 'orders/:orderId',
      Login: 'login',
      SignUp: 'signup',
      NotificationPreferences: 'notifications',
      Wishlist: 'wishlist',
      StoreLocator: 'stores',
      StoreDetail: 'stores/:storeId',
      Collections: 'collections',
      CollectionDetail: 'collections/:slug',
    },
  },
  getStateFromPath: normalizePathForLinking,
};

/** All supported deep link paths */
export const SUPPORTED_PATHS = [
  'home',
  'shop',
  'cart',
  'checkout',
  'account',
  'login',
  'signup',
  'orders',
  'notifications',
  'ar',
  'wishlist',
  'stores',
  'store-locator',
  'collections',
] as const;
