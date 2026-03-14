/**
 * App Store Connect and Google Play Console listing metadata.
 * Structured for programmatic validation and future automation.
 */

export interface ScreenshotSpec {
  width: number;
  height: number;
  label: string;
}

export interface ScreenshotScene {
  name: string;
  description: string;
  screen: string;
}

export interface StoreMetadata {
  ios: {
    appName: string;
    subtitle: string;
    description: string;
    keywords: string[];
    promotionalText: string;
    primaryCategory: string;
    secondaryCategory: string;
    privacyPolicyUrl: string;
    screenshotSpecs: Record<string, ScreenshotSpec>;
  };
  android: {
    title: string;
    shortDescription: string;
    fullDescription: string;
    category: string;
    contentRating: string;
    screenshotSpecs: Record<string, ScreenshotSpec>;
  };
  screenshotPlan: ScreenshotScene[];
}

export const STORE_METADATA: StoreMetadata = {
  ios: {
    appName: 'Carolina Futons',
    subtitle: 'Futons, Murphy Beds & AR',
    description: `Shop handcrafted futons, Murphy cabinet beds, and accessories from Carolina Futons — Asheville's favorite furniture maker since 1995.

BROWSE & DISCOVER
• Explore our full catalog of futons, Murphy beds, covers, mattresses, frames, and accessories
• Filter by category, price range, fabric, and more
• Sort by featured, popular, price, newest, or top-rated
• Curated collections for every room and style

AR FURNITURE PREVIEW
• See how furniture looks in your space before you buy
• Place life-size 3D models in your room using your camera
• Compare fabrics and finishes in augmented reality
• Take screenshots to share with family and friends

SMART SHOPPING
• Save favorites to your wishlist
• Track orders from purchase to delivery
• Secure checkout with Apple Pay and credit cards
• Push notifications for sales, restocks, and order updates

FIND A STORE
• Locate our Asheville showroom and retail partners
• Get directions, hours, and contact info
• View in-store inventory availability

QUALITY & COMFORT
• Handcrafted solid hardwood frames
• Premium innerspring and memory foam mattresses
• Machine-washable covers in dozens of fabrics
• Made in North Carolina with sustainable materials`,

    keywords: [
      'futon',
      'murphy bed',
      'furniture',
      'sofa bed',
      'AR',
      'augmented reality',
      'Asheville',
      'home decor',
      'mattress',
      'sleeper',
    ],
    promotionalText:
      'New: AR Preview — see how our futons and Murphy beds look in your space before you buy!',
    primaryCategory: 'Shopping',
    secondaryCategory: 'Lifestyle',
    privacyPolicyUrl: 'https://carolinafutons.com/privacy',
    screenshotSpecs: {
      '6.7': { width: 1290, height: 2796, label: 'iPhone 15 Pro Max (6.7")' },
      '6.5': { width: 1284, height: 2778, label: 'iPhone 11 Pro Max (6.5")' },
      '5.5': { width: 1242, height: 2208, label: 'iPhone 8 Plus (5.5")' },
    },
  },

  android: {
    title: 'Carolina Futons',
    shortDescription:
      'Shop futons, Murphy beds & AR preview. Handcrafted in Asheville, NC.',
    fullDescription: `Shop handcrafted futons, Murphy cabinet beds, and accessories from Carolina Futons — Asheville's favorite furniture maker since 1995.

BROWSE & DISCOVER
• Explore our full catalog of futons, Murphy beds, covers, mattresses, frames, and accessories
• Filter by category, price range, fabric, and more
• Sort by featured, popular, price, newest, or top-rated
• Curated collections for every room and style

AR FURNITURE PREVIEW
• See how furniture looks in your space before you buy
• Place life-size 3D models in your room using ARCore
• Compare fabrics and finishes in augmented reality
• Take screenshots to share with family and friends

SMART SHOPPING
• Save favorites to your wishlist
• Track orders from purchase to delivery
• Secure checkout with Google Pay and credit cards
• Push notifications for sales, restocks, and order updates

FIND A STORE
• Locate our Asheville showroom and retail partners
• Get directions, hours, and contact info

QUALITY & COMFORT
• Handcrafted solid hardwood frames
• Premium innerspring and memory foam mattresses
• Machine-washable covers in dozens of fabrics
• Made in North Carolina with sustainable materials`,

    category: 'SHOPPING',
    contentRating: 'Everyone',
    screenshotSpecs: {
      phone: { width: 1080, height: 1920, label: 'Phone (16:9)' },
      '7inch': { width: 1200, height: 1920, label: '7-inch tablet' },
      '10inch': { width: 1600, height: 2560, label: '10-inch tablet' },
    },
  },

  screenshotPlan: [
    {
      name: 'Home & Discovery',
      description:
        'HomeScreen with mountain skyline header, promo banner carousel, and featured products grid',
      screen: 'HomeScreen',
    },
    {
      name: 'Product Browsing',
      description:
        'ShopScreen showing two-column product grid with category chips, sort controls, and product cards with badges',
      screen: 'ShopScreen',
    },
    {
      name: 'Product Detail',
      description:
        'ProductDetailScreen with image gallery, fabric selector, price, reviews, and Add to Cart button',
      screen: 'ProductDetailScreen',
    },
    {
      name: 'AR Preview',
      description:
        'ARScreen showing a futon placed in a room via augmented reality with measurement overlay and fabric selector',
      screen: 'ARScreen',
    },
    {
      name: 'Collections',
      description:
        'CollectionsScreen with curated collection cards showing editorial hero images',
      screen: 'CollectionsScreen',
    },
    {
      name: 'Cart & Checkout',
      description:
        'CartScreen showing items with quantity controls, order summary, and checkout button',
      screen: 'CartScreen',
    },
    {
      name: 'Wishlist',
      description: 'WishlistScreen with saved products grid and pull-to-refresh',
      screen: 'WishlistScreen',
    },
    {
      name: 'Store Locator',
      description:
        'StoreLocatorScreen showing map with store pins and list of nearby locations',
      screen: 'StoreLocatorScreen',
    },
  ],
};
