/**
 * Deep linking configuration for React Navigation.
 *
 * URL scheme: carolinafutons://
 * Universal links: https://carolinafutons.com/
 *
 * Supported routes:
 *   carolinafutons://product/{slug}    → ProductDetailScreen
 *   carolinafutons://category/{slug}   → CategoryScreen
 *   carolinafutons://cart              → CartScreen
 *   carolinafutons://checkout          → CheckoutScreen
 *   carolinafutons://orders            → OrderHistoryScreen
 *   carolinafutons://orders/{id}       → OrderDetailScreen
 *   carolinafutons://account           → AccountScreen
 *   carolinafutons://shop              → ShopScreen
 *   carolinafutons://home              → HomeScreen
 */

export interface LinkingConfig {
  prefixes: string[];
  config: {
    screens: Record<string, string | { path: string; parse?: Record<string, (v: string) => string> }>;
  };
}

export const linkingConfig: LinkingConfig = {
  prefixes: [
    'carolinafutons://',
    'https://carolinafutons.com',
    'https://www.carolinafutons.com',
  ],
  config: {
    screens: {
      Home: 'home',
      Shop: 'shop',
      Category: 'category/:slug',
      ProductDetail: {
        path: 'product/:slug',
        parse: {
          slug: (slug: string) => slug,
        },
      },
      Cart: 'cart',
      Checkout: 'checkout',
      OrderHistory: 'orders',
      OrderDetail: 'orders/:orderId',
      Account: 'account',
      Login: 'login',
      SignUp: 'signup',
      NotificationPreferences: 'notifications',
    },
  },
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
] as const;
