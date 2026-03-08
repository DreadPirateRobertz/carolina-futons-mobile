/**
 * Product catalog data and types.
 * Mock data now; designed for Wix CMS API integration later.
 */
import { type ProductId, productId } from './productId';

export interface ProductImage {
  uri: string;
  alt: string;
  blurhash?: string;
}

/** Warm-toned fallback blurhash for product images pending server-generated hashes. */
export const DEFAULT_PRODUCT_BLURHASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

export type ProductSize = 'twin' | 'full' | 'queen';

export interface Product {
  id: ProductId;
  name: string;
  slug: string;
  sku?: string;
  category: ProductCategory;
  size?: ProductSize;
  price: number;
  originalPrice?: number;
  description: string;
  shortDescription: string;
  images: ProductImage[];
  badge?: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockCount?: number;
  fabricOptions: string[];
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
}

export type ProductCategory =
  | 'futons'
  | 'covers'
  | 'mattresses'
  | 'frames'
  | 'murphy-beds'
  | 'pillows'
  | 'accessories';

export interface CategoryInfo {
  id: ProductCategory;
  label: string;
  count: number;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export const LOW_STOCK_THRESHOLD = 5;

export function getStockStatus(product: Product): StockStatus {
  if (!product.inStock) return 'out_of_stock';
  if (product.stockCount !== undefined && product.stockCount < LOW_STOCK_THRESHOLD) return 'low_stock';
  return 'in_stock';
}

export type SortOption = 'featured' | 'popular' | 'price-asc' | 'price-desc' | 'newest' | 'rating';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'popular', label: 'Popular' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top Rated' },
];

export const CATEGORIES: CategoryInfo[] = [
  { id: 'futons', label: 'Futons', count: 8 },
  { id: 'murphy-beds', label: 'Murphy Beds', count: 6 },
  { id: 'covers', label: 'Covers', count: 12 },
  { id: 'mattresses', label: 'Mattresses', count: 6 },
  { id: 'frames', label: 'Frames', count: 5 },
  { id: 'pillows', label: 'Pillows', count: 4 },
  { id: 'accessories', label: 'Accessories', count: 7 },
];

/**
 * Mock product catalog. In production, fetched from Wix CMS API.
 */
export const PRODUCTS: Product[] = [
  {
    id: productId('prod-asheville-full'),
    name: 'The Asheville Full Futon',
    slug: 'asheville-full-futon',
    sku: 'CF-FUT-ASH-001',
    category: 'futons',
    size: 'full',
    price: 349,
    description:
      'Our bestselling full-size futon. Handcrafted solid hardwood frame with a premium innerspring mattress. Converts from sofa to bed in seconds.',
    shortDescription: 'Bestselling full-size futon with innerspring mattress',
    images: [
      {
        uri: 'https://placeholder.co/400x300/D4C5A9/3A2518?text=Asheville',
        alt: 'The Asheville Full Futon',
      },
    ],
    badge: 'Bestseller',
    rating: 4.8,
    reviewCount: 234,
    inStock: true,
    fabricOptions: ['Natural Linen', 'Slate Gray', 'Mountain Blue', 'Sunset Coral'],
    dimensions: { width: 54, depth: 34, height: 33 },
  },
  {
    id: productId('prod-blue-ridge-queen'),
    name: 'The Blue Ridge Queen Futon',
    slug: 'blue-ridge-queen-futon',
    sku: 'CF-FUT-BRQ-002',
    category: 'futons',
    size: 'queen',
    price: 449,
    description:
      'Queen-size luxury comfort with solid ash frame and 8-inch pocket coil mattress. The ultimate guest room solution.',
    shortDescription: 'Queen-size luxury futon with pocket coil mattress',
    images: [
      {
        uri: 'https://placeholder.co/400x300/5B8FA8/FFFFFF?text=Blue+Ridge',
        alt: 'The Blue Ridge Queen Futon',
      },
    ],
    badge: 'Premium',
    rating: 4.9,
    reviewCount: 156,
    inStock: true,
    fabricOptions: ['Natural Linen', 'Slate Gray', 'Mountain Blue', 'Espresso Brown', 'Charcoal'],
    dimensions: { width: 60, depth: 36, height: 35 },
  },
  {
    id: productId('prod-pisgah-twin'),
    name: 'The Pisgah Twin Futon',
    slug: 'pisgah-twin-futon',
    category: 'futons',
    size: 'twin',
    price: 279,
    description:
      'Perfect for dorm rooms, studios, and small spaces. Compact design without compromising comfort.',
    shortDescription: 'Compact twin futon for small spaces',
    images: [
      {
        uri: 'https://placeholder.co/400x300/4A7C59/FFFFFF?text=Pisgah',
        alt: 'The Pisgah Twin Futon',
      },
    ],
    rating: 4.6,
    reviewCount: 89,
    inStock: true,
    stockCount: 3,
    fabricOptions: ['Natural Linen', 'Slate Gray', 'Forest Green'],
    dimensions: { width: 39, depth: 32, height: 31 },
  },
  {
    id: productId('prod-biltmore-loveseat'),
    name: 'The Biltmore Loveseat',
    slug: 'biltmore-loveseat',
    category: 'futons',
    size: 'full',
    price: 319,
    originalPrice: 379,
    description:
      'Elegant loveseat futon inspired by the grandeur of the Biltmore Estate. Perfect for reading nooks.',
    shortDescription: 'Elegant loveseat futon with classic styling',
    images: [
      {
        uri: 'https://placeholder.co/400x300/C9A0A0/3A2518?text=Biltmore',
        alt: 'The Biltmore Loveseat',
      },
    ],
    badge: 'Sale',
    rating: 4.7,
    reviewCount: 67,
    inStock: true,
    fabricOptions: ['Natural Linen', 'Mauve Blush', 'Espresso Brown'],
    dimensions: { width: 48, depth: 33, height: 32 },
  },
  // --- Murphy Cabinet Beds ---
  {
    id: productId('prod-murphy-queen-vertical'),
    name: 'The Hendersonville Queen Murphy Cabinet Bed',
    slug: 'hendersonville-queen-murphy-cabinet-bed',
    category: 'murphy-beds',
    size: 'queen',
    price: 1299,
    description:
      'Queen-size vertical Murphy cabinet bed in solid oak. Folds into a stylish 42" tall cabinet when closed. Gas-piston mechanism for effortless operation.',
    shortDescription: 'Queen vertical Murphy bed, solid oak',
    images: [
      {
        uri: 'https://placeholder.co/400x300/D4BC96/3A2518?text=Hendersonville',
        alt: 'The Hendersonville Queen Murphy Cabinet Bed',
      },
    ],
    badge: 'Bestseller',
    rating: 4.9,
    reviewCount: 178,
    inStock: true,
    fabricOptions: ['Honey Oak', 'Espresso', 'Natural'],
    dimensions: { width: 64, depth: 24, height: 42 },
  },
  {
    id: productId('prod-murphy-full-horizontal'),
    name: 'The Appalachian Full Horizontal Murphy Cabinet',
    slug: 'appalachian-full-horizontal-murphy-cabinet',
    category: 'murphy-beds',
    size: 'full',
    price: 1149,
    description:
      'Full-size horizontal Murphy cabinet in solid maple. Perfect for rooms with low ceilings. Includes built-in USB charging ports.',
    shortDescription: 'Full horizontal Murphy, solid maple',
    images: [
      {
        uri: 'https://placeholder.co/400x300/C9A0A0/3A2518?text=Appalachian',
        alt: 'The Appalachian Full Horizontal Murphy Cabinet',
      },
    ],
    rating: 4.7,
    reviewCount: 92,
    inStock: true,
    fabricOptions: ['Maple Natural', 'Walnut Stain', 'White'],
    dimensions: { width: 78, depth: 20, height: 44 },
  },
  {
    id: productId('prod-murphy-queen-bookcase'),
    name: 'The Smoky Mountain Queen Bookcase Murphy',
    slug: 'smoky-mountain-queen-bookcase-murphy',
    category: 'murphy-beds',
    size: 'queen',
    price: 1699,
    description:
      'Queen Murphy bed flanked by two full-height bookcases. 84" tall wall unit provides ample storage and display space. LED shelf lighting included.',
    shortDescription: 'Queen Murphy with bookcase side units',
    images: [
      {
        uri: 'https://placeholder.co/400x300/5B8FA8/FFFFFF?text=Smoky+Mountain',
        alt: 'The Smoky Mountain Queen Bookcase Murphy',
      },
    ],
    badge: 'Premium',
    rating: 4.8,
    reviewCount: 64,
    inStock: true,
    fabricOptions: ['Espresso', 'Honey Oak', 'Gray Wash'],
    dimensions: { width: 100, depth: 24, height: 84 },
  },
  {
    id: productId('prod-murphy-twin-cabinet'),
    name: 'The Brevard Twin Cabinet Bed',
    slug: 'brevard-twin-cabinet-bed',
    category: 'murphy-beds',
    size: 'twin',
    price: 899,
    description:
      'Compact twin-size cabinet bed in solid birch. Just 38" tall closed — doubles as a console table or TV stand. Ideal for guest rooms and studios.',
    shortDescription: 'Twin cabinet bed, doubles as console',
    images: [
      {
        uri: 'https://placeholder.co/400x300/4A7C59/FFFFFF?text=Brevard',
        alt: 'The Brevard Twin Cabinet Bed',
      },
    ],
    rating: 4.6,
    reviewCount: 143,
    inStock: true,
    fabricOptions: ['Natural Birch', 'Espresso', 'White'],
    dimensions: { width: 44, depth: 24, height: 38 },
  },
  {
    id: productId('prod-murphy-queen-desk'),
    name: 'The Chimney Rock Queen Desk Murphy',
    slug: 'chimney-rock-queen-desk-murphy',
    category: 'murphy-beds',
    size: 'queen',
    price: 1899,
    originalPrice: 2099,
    description:
      'Queen Murphy with integrated fold-down desk. Work by day, sleep at night — the ultimate space saver. Desk surface stays level when bed deploys.',
    shortDescription: 'Queen Murphy with fold-down desk',
    images: [
      {
        uri: 'https://placeholder.co/400x300/E8845C/FFFFFF?text=Chimney+Rock',
        alt: 'The Chimney Rock Queen Desk Murphy',
      },
    ],
    badge: 'Sale',
    rating: 4.9,
    reviewCount: 87,
    inStock: true,
    fabricOptions: ['Espresso', 'Walnut', 'Gray Wash'],
    dimensions: { width: 66, depth: 26, height: 84 },
  },
  {
    id: productId('prod-murphy-full-storage'),
    name: 'The Nantahala Full Storage Murphy',
    slug: 'nantahala-full-storage-murphy',
    category: 'murphy-beds',
    size: 'full',
    price: 1449,
    description:
      'Full-size Murphy bed with top storage cabinet and side shelving. Solid oak construction with soft-close hinges throughout.',
    shortDescription: 'Full Murphy with integrated storage',
    images: [
      {
        uri: 'https://placeholder.co/400x300/6B7B8D/FFFFFF?text=Nantahala',
        alt: 'The Nantahala Full Storage Murphy',
      },
    ],
    rating: 4.7,
    reviewCount: 56,
    inStock: true,
    fabricOptions: ['Honey Oak', 'Espresso', 'Natural'],
    dimensions: { width: 60, depth: 24, height: 82 },
  },
  {
    id: productId('prod-mountain-cover-full'),
    name: 'Mountain Weave Futon Cover',
    slug: 'mountain-weave-cover',
    category: 'covers',
    size: 'full',
    price: 59,
    description:
      'Durable cotton-poly blend cover in our signature Mountain Weave pattern. Machine washable.',
    shortDescription: 'Durable cotton-poly cover, machine washable',
    images: [
      {
        uri: 'https://placeholder.co/400x300/E8D5B7/3A2518?text=Cover',
        alt: 'Mountain Weave Futon Cover',
      },
    ],
    rating: 4.5,
    reviewCount: 312,
    inStock: true,
    fabricOptions: ['Sand', 'Blue Ridge', 'Forest', 'Coral'],
    dimensions: { width: 54, depth: 34, height: 0 },
  },
  {
    id: productId('prod-sunset-cover-queen'),
    name: 'Sunset Cotton Cover - Queen',
    slug: 'sunset-cotton-cover-queen',
    category: 'covers',
    size: 'queen',
    price: 69,
    originalPrice: 89,
    description:
      'Premium 100% organic cotton cover in warm sunset tones. Pre-shrunk and fade-resistant.',
    shortDescription: 'Organic cotton cover in warm sunset tones',
    images: [
      {
        uri: 'https://placeholder.co/400x300/E8845C/FFFFFF?text=Sunset+Cover',
        alt: 'Sunset Cotton Cover',
      },
    ],
    badge: 'Sale',
    rating: 4.4,
    reviewCount: 198,
    inStock: true,
    fabricOptions: ['Coral', 'Terracotta', 'Amber'],
    dimensions: { width: 60, depth: 36, height: 0 },
  },
  {
    id: productId('prod-premium-innerspring'),
    name: 'Premium Innerspring Mattress',
    slug: 'premium-innerspring-mattress',
    category: 'mattresses',
    size: 'full',
    price: 189,
    description:
      '8-inch innerspring futon mattress with quilted cotton top. 312-coil count for superior support.',
    shortDescription: '8-inch innerspring with 312-coil support',
    images: [
      {
        uri: 'https://placeholder.co/400x300/F2E8D5/3A2518?text=Mattress',
        alt: 'Premium Innerspring Mattress',
      },
    ],
    rating: 4.7,
    reviewCount: 145,
    inStock: true,
    fabricOptions: ['Natural', 'Gray'],
    dimensions: { width: 54, depth: 75, height: 8 },
  },
  {
    id: productId('prod-memory-foam'),
    name: 'Memory Foam Futon Mattress',
    slug: 'memory-foam-mattress',
    category: 'mattresses',
    size: 'full',
    price: 249,
    description:
      '6-inch memory foam with cooling gel layer. CertiPUR-US certified. Ultimate comfort for daily sleeping.',
    shortDescription: 'Cooling gel memory foam, CertiPUR-US certified',
    images: [
      {
        uri: 'https://placeholder.co/400x300/A8CCD8/3A2518?text=Memory+Foam',
        alt: 'Memory Foam Mattress',
      },
    ],
    badge: 'New',
    rating: 4.8,
    reviewCount: 52,
    inStock: true,
    fabricOptions: ['White', 'Gray'],
    dimensions: { width: 54, depth: 75, height: 6 },
  },
  {
    id: productId('prod-hardwood-frame'),
    name: 'Solid Hardwood Frame',
    slug: 'solid-hardwood-frame',
    category: 'frames',
    size: 'full',
    price: 199,
    description:
      'Kiln-dried solid hardwood frame with a honey oak finish. Supports up to 600 lbs. Easy assembly.',
    shortDescription: 'Solid hardwood with honey oak finish',
    images: [
      {
        uri: 'https://placeholder.co/400x300/D4BC96/3A2518?text=Frame',
        alt: 'Solid Hardwood Frame',
      },
    ],
    rating: 4.6,
    reviewCount: 203,
    inStock: true,
    fabricOptions: ['Honey Oak', 'Espresso', 'Natural'],
    dimensions: { width: 54, depth: 38, height: 33 },
  },
  {
    id: productId('prod-arm-pillows'),
    name: 'Futon Arm Pillow Set',
    slug: 'arm-pillow-set',
    category: 'pillows',
    price: 39,
    description: 'Set of 2 matching arm pillows. Memory foam fill with removable, washable covers.',
    shortDescription: 'Set of 2 memory foam arm pillows',
    images: [
      { uri: 'https://placeholder.co/400x300/C9A0A0/FFFFFF?text=Pillows', alt: 'Arm Pillow Set' },
    ],
    rating: 4.3,
    reviewCount: 87,
    inStock: true,
    fabricOptions: ['Natural', 'Gray', 'Blue', 'Coral'],
    dimensions: { width: 24, depth: 8, height: 8 },
  },
  {
    id: productId('prod-grip-strips'),
    name: 'Non-Slip Grip Strips',
    slug: 'non-slip-grip-strips',
    category: 'accessories',
    price: 15,
    description:
      'Keep your futon cover in place. Set of 4 adhesive grip strips. Works on all fabrics.',
    shortDescription: 'Set of 4 adhesive grip strips',
    images: [
      {
        uri: 'https://placeholder.co/400x300/999999/FFFFFF?text=Grip+Strips',
        alt: 'Non-Slip Grip Strips',
      },
    ],
    rating: 4.1,
    reviewCount: 456,
    inStock: false,
    stockCount: 0,
    fabricOptions: [],
    dimensions: { width: 12, depth: 2, height: 0 },
  },
  {
    id: productId('prod-furniture-polish'),
    name: 'Natural Wood Polish',
    slug: 'natural-wood-polish',
    category: 'accessories',
    price: 12,
    description: 'Beeswax and lemon oil polish for hardwood frames. 8 oz bottle. Made in NC.',
    shortDescription: 'Beeswax & lemon oil polish, made in NC',
    images: [
      {
        uri: 'https://placeholder.co/400x300/D4BC96/3A2518?text=Polish',
        alt: 'Natural Wood Polish',
      },
    ],
    rating: 4.6,
    reviewCount: 89,
    inStock: true,
    fabricOptions: [],
    dimensions: { width: 3, depth: 3, height: 6 },
  },
];
