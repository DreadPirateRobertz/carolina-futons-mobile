/**
 * Product catalog data and types.
 * Mock data now; designed for Wix CMS API integration later.
 */

export interface ProductImage {
  uri: string;
  alt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  description: string;
  shortDescription: string;
  images: ProductImage[];
  badge?: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
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
  | 'pillows'
  | 'accessories';

export interface CategoryInfo {
  id: ProductCategory;
  label: string;
  count: number;
}

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'rating';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top Rated' },
];

export const CATEGORIES: CategoryInfo[] = [
  { id: 'futons', label: 'Futons', count: 8 },
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
    id: 'prod-asheville-full',
    name: 'The Asheville Full Futon',
    slug: 'asheville-full-futon',
    category: 'futons',
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
    id: 'prod-blue-ridge-queen',
    name: 'The Blue Ridge Queen Futon',
    slug: 'blue-ridge-queen-futon',
    category: 'futons',
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
    id: 'prod-pisgah-twin',
    name: 'The Pisgah Twin Futon',
    slug: 'pisgah-twin-futon',
    category: 'futons',
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
    fabricOptions: ['Natural Linen', 'Slate Gray', 'Forest Green'],
    dimensions: { width: 39, depth: 32, height: 31 },
  },
  {
    id: 'prod-biltmore-loveseat',
    name: 'The Biltmore Loveseat',
    slug: 'biltmore-loveseat',
    category: 'futons',
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
  {
    id: 'prod-mountain-cover-full',
    name: 'Mountain Weave Futon Cover',
    slug: 'mountain-weave-cover',
    category: 'covers',
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
    id: 'prod-sunset-cover-queen',
    name: 'Sunset Cotton Cover - Queen',
    slug: 'sunset-cotton-cover-queen',
    category: 'covers',
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
    id: 'prod-premium-innerspring',
    name: 'Premium Innerspring Mattress',
    slug: 'premium-innerspring-mattress',
    category: 'mattresses',
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
    id: 'prod-memory-foam',
    name: 'Memory Foam Futon Mattress',
    slug: 'memory-foam-mattress',
    category: 'mattresses',
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
    id: 'prod-hardwood-frame',
    name: 'Solid Hardwood Frame',
    slug: 'solid-hardwood-frame',
    category: 'frames',
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
    id: 'prod-arm-pillows',
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
    id: 'prod-grip-strips',
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
    inStock: true,
    fabricOptions: [],
    dimensions: { width: 12, depth: 2, height: 0 },
  },
  {
    id: 'prod-furniture-polish',
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
