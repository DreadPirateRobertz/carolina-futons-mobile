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
  videoUri?: string;
  /**
   * Lifestyle photography URI — a room-setting photo showing the product in context.
   * TODO(stilgar): Wire real lifestyle photo from Wix Media Manager once curated.
   * PLACEHOLDER: Using LIFESTYLE_PLACEHOLDER_URI constant — replace with CF product lifestyle imagery.
   * SOURCE: Will come from manufacturer image banks + Wix Media uploads.
   */
  lifestyleUri?: string;
  fabricOptions: string[];
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
  tags?: string[]; // style keywords: "modern", "rustic", "mid-century", etc.
  colorFamily?: string; // "neutral" | "warm" | "cool" | "dark" | "light"
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
  if (product.stockCount !== undefined && product.stockCount < LOW_STOCK_THRESHOLD)
    return 'low_stock';
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
        uri: 'https://static.wixstatic.com/media/cc389e_b524b0ad680c4c65b91c2339633c5208~mv2.jpg/v1/fit/w_2000,h_1330,q_90/file.jpg',
        alt: 'The Asheville Full Futon in room lifestyle shot',
        blurhash: 'LKJRq_~q9F%M00WB-;ay4nofRjWB',
      },
      {
        uri: 'https://static.wixstatic.com/media/cc389e_1224985805ba4f988eae2d6d93c6270b~mv2.jpg/v1/fit/w_640,h_480,q_90/file.jpg',
        alt: 'The Asheville Full Futon product shot',
        blurhash: DEFAULT_PRODUCT_BLURHASH,
      },
    ],
    badge: 'Bestseller',
    rating: 4.8,
    reviewCount: 234,
    inStock: true,
    videoUri:
      'https://video.wixstatic.com/video/e04e89_ea16ef6edfe64c03a5bfdd0ee468ab7f/1080p/mp4/file.mp4',
    fabricOptions: ['Natural Linen', 'Slate Gray', 'Mountain Blue', 'Sunset Coral'],
    dimensions: { width: 54, depth: 34, height: 33 },
    tags: ['modern', 'convertible', 'hardwood'],
    colorFamily: 'neutral',
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
        uri: 'https://static.wixstatic.com/media/cc389e_e399970838f741278d3ed89667f53bbc~mv2.jpg/v1/fit/w_2000,h_1330,q_90/file.jpg',
        alt: 'The Blue Ridge Queen Futon in room lifestyle shot',
        blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.',
      },
      {
        uri: 'https://static.wixstatic.com/media/cc389e_9fad425eab7b4ca388ed392523e2e8bf~mv2.jpg/v1/fit/w_2000,h_1330,q_90/file.jpg',
        alt: 'The Blue Ridge Queen Futon product shot',
        blurhash: DEFAULT_PRODUCT_BLURHASH,
      },
    ],
    badge: 'Premium',
    rating: 4.9,
    reviewCount: 156,
    inStock: true,
    videoUri:
      'https://video.wixstatic.com/video/e04e89_8483b56d2ef5417c95242c821934e2b2/1080p/mp4/file.mp4',
    fabricOptions: ['Natural Linen', 'Slate Gray', 'Mountain Blue', 'Espresso Brown', 'Charcoal'],
    dimensions: { width: 60, depth: 36, height: 35 },
    tags: ['modern', 'luxury', 'convertible'],
    colorFamily: 'cool',
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
        uri: 'https://static.wixstatic.com/media/cc389e_b77f29e803584b129bdbfa9d40cb49cc~mv2.jpg/v1/fit/w_640,h_426,q_90/file.jpg',
        alt: 'The Pisgah Twin Futon in room lifestyle shot',
        blurhash: 'LCEf;R~q4n%M-;WB9Fof00ay%MRj',
      },
      {
        uri: 'https://static.wixstatic.com/media/cc389e_8d58046b50394b18ab17888609e55a91~mv2.jpg/v1/fit/w_640,h_426,q_90/file.jpg',
        alt: 'The Pisgah Twin Futon product shot',
        blurhash: DEFAULT_PRODUCT_BLURHASH,
      },
    ],
    rating: 4.6,
    reviewCount: 89,
    inStock: true,
    stockCount: 3,
    fabricOptions: ['Natural Linen', 'Slate Gray', 'Forest Green'],
    dimensions: { width: 39, depth: 32, height: 31 },
    tags: ['compact', 'convertible', 'modern'],
    colorFamily: 'neutral',
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
        uri: 'https://static.wixstatic.com/media/cc389e_e891ed8b280d4d9f8c7562a5455744a6~mv2.jpg/v1/fit/w_640,h_426,q_90/file.jpg',
        alt: 'The Biltmore Loveseat in room lifestyle shot',
        blurhash: 'LMN],-xu9F~q_3WB%MRj4nofIUt7',
      },
      {
        uri: 'https://static.wixstatic.com/media/cc389e_020cf249fd9d444b899d981c74f1bbfd~mv2.jpg/v1/fit/w_640,h_426,q_90/file.jpg',
        alt: 'The Biltmore Loveseat product shot',
        blurhash: DEFAULT_PRODUCT_BLURHASH,
      },
    ],
    badge: 'Sale',
    rating: 4.7,
    reviewCount: 67,
    inStock: true,
    fabricOptions: ['Natural Linen', 'Mauve Blush', 'Espresso Brown'],
    dimensions: { width: 48, depth: 33, height: 32 },
    tags: ['traditional', 'elegant', 'loveseat'],
    colorFamily: 'warm',
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
        uri: 'https://static.wixstatic.com/media/cc389e_b4917a196a724e11bb77a4e059f30ebb~mv2.jpg/v1/fit/w_1999,h_1429,q_90/file.jpg',
        alt: 'The Hendersonville Queen Murphy Cabinet Bed in room lifestyle shot',
        blurhash: 'LJIh5}~q9F%M00WB-;WB4nRjRjWB',
      },
      {
        uri: 'https://static.wixstatic.com/media/cc389e_4abd23adf72a4ba3a6ee5d1107e98174~mv2.jpg/v1/fit/w_1999,h_1429,q_90/file.jpg',
        alt: 'The Hendersonville Queen Murphy Cabinet Bed product shot',
        blurhash: DEFAULT_PRODUCT_BLURHASH,
      },
    ],
    badge: 'Bestseller',
    rating: 4.9,
    reviewCount: 178,
    inStock: true,
    fabricOptions: ['Honey Oak', 'Espresso', 'Natural'],
    dimensions: { width: 64, depth: 24, height: 42 },
    tags: ['traditional', 'space-saving', 'hardwood'],
    colorFamily: 'warm',
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
        uri: 'https://static.wixstatic.com/media/cc389e_954d7e56d4d34e0b8e1f7d53dff2a346~mv2.jpg/v1/fit/w_2000,h_1428,q_90/file.jpg',
        alt: 'The Appalachian Full Horizontal Murphy Cabinet in room lifestyle shot',
        blurhash: 'LMN],-xu9F~q_3t7%MRj4nofIURj',
      },
      {
        uri: 'https://static.wixstatic.com/media/cc389e_f6b90a06940d41d5895782bf3025eac6~mv2.jpg/v1/fit/w_2000,h_1428,q_90/file.jpg',
        alt: 'The Appalachian Full Horizontal Murphy Cabinet product shot',
        blurhash: DEFAULT_PRODUCT_BLURHASH,
      },
    ],
    rating: 4.7,
    reviewCount: 92,
    inStock: true,
    fabricOptions: ['Maple Natural', 'Walnut Stain', 'White'],
    dimensions: { width: 78, depth: 20, height: 44 },
    tags: ['modern', 'space-saving', 'horizontal'],
    colorFamily: 'light',
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
        uri: 'https://static.wixstatic.com/media/cc389e_261b5d74dd204869a2c8092b7280bc2e~mv2.png/v1/fit/w_2000,h_1333,q_90/file.png',
        alt: 'The Smoky Mountain Queen Bookcase Murphy in room lifestyle shot',
        blurhash: 'LGF5]+Yk^6#M@-5c,1Ex@[or[Q6.',
      },
      {
        uri: 'https://static.wixstatic.com/media/cc389e_b1fad63605344fe69eca83037f832fae~mv2.jpg/v1/fit/w_2000,h_1333,q_90/file.jpg',
        alt: 'The Smoky Mountain Queen Bookcase Murphy product shot',
        blurhash: DEFAULT_PRODUCT_BLURHASH,
      },
    ],
    badge: 'Premium',
    rating: 4.8,
    reviewCount: 64,
    inStock: true,
    fabricOptions: ['Espresso', 'Honey Oak', 'Gray Wash'],
    dimensions: { width: 100, depth: 24, height: 84 },
    tags: ['traditional', 'storage', 'bookcase'],
    colorFamily: 'dark',
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
        uri: 'https://static.wixstatic.com/media/cc389e_53db53baec144dd4b9ff70dccc60631d~mv2.jpg/v1/fit/w_1999,h_1428,q_90/file.jpg',
        alt: 'The Brevard Twin Cabinet Bed in room lifestyle shot',
        blurhash: 'LCEf;R~q4n%M-;t79Fof00ay%MRj',
      },
      {
        uri: 'https://static.wixstatic.com/media/cc389e_ae3946ea9e884abfb61de5a74bacfad7~mv2.jpg/v1/fit/w_1999,h_1428,q_90/file.jpg',
        alt: 'The Brevard Twin Cabinet Bed product shot',
        blurhash: DEFAULT_PRODUCT_BLURHASH,
      },
    ],
    rating: 4.6,
    reviewCount: 143,
    inStock: true,
    fabricOptions: ['Natural Birch', 'Espresso', 'White'],
    dimensions: { width: 44, depth: 24, height: 38 },
    tags: ['compact', 'space-saving', 'modern'],
    colorFamily: 'neutral',
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
        uri: 'https://static.wixstatic.com/media/cc389e_29faae8dd38c48979d7a6be0e450ae9f~mv2.png/v1/fit/w_2000,h_1428,q_90/file.png',
        alt: 'The Chimney Rock Queen Desk Murphy in room lifestyle shot',
        blurhash: 'LHKB%|~q0KIU_3WB%MRj9Fof%MRj',
      },
      {
        uri: 'https://static.wixstatic.com/media/cc389e_5b1e78ca47dd4f6aa4ad162c09745d34~mv2.jpg/v1/fit/w_2000,h_1428,q_90/file.jpg',
        alt: 'The Chimney Rock Queen Desk Murphy product shot',
        blurhash: DEFAULT_PRODUCT_BLURHASH,
      },
    ],
    badge: 'Sale',
    rating: 4.9,
    reviewCount: 87,
    inStock: true,
    fabricOptions: ['Espresso', 'Walnut', 'Gray Wash'],
    dimensions: { width: 66, depth: 26, height: 84 },
    tags: ['modern', 'multifunctional', 'desk'],
    colorFamily: 'warm',
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
        uri: 'https://static.wixstatic.com/media/cc389e_135592f0201940519bc411c9ad4265aa~mv2.jpg/v1/fit/w_2000,h_1333,q_90/file.jpg',
        alt: 'The Nantahala Full Storage Murphy in room lifestyle shot',
        blurhash: 'LDG+h2~q4n%M-;WB9FRj00of%Mt7',
      },
      {
        uri: 'https://static.wixstatic.com/media/cc389e_fbd55db182574579a2582da2b4c3dca7~mv2.jpg/v1/fit/w_2000,h_1333,q_90/file.jpg',
        alt: 'The Nantahala Full Storage Murphy product shot',
        blurhash: DEFAULT_PRODUCT_BLURHASH,
      },
    ],
    rating: 4.7,
    reviewCount: 56,
    inStock: true,
    fabricOptions: ['Honey Oak', 'Espresso', 'Natural'],
    dimensions: { width: 60, depth: 24, height: 82 },
    tags: ['traditional', 'storage', 'hardwood'],
    colorFamily: 'warm',
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
        uri: 'https://static.wixstatic.com/media/cc389e_94729dcf772b426aadc8ffc703471d61~mv2.jpg/v1/fit/w_2000,h_1333,q_90/file.jpg',
        alt: 'Mountain Weave Futon Cover in room lifestyle shot',
        blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
      },
    ],
    rating: 4.5,
    reviewCount: 312,
    inStock: true,
    fabricOptions: ['Sand', 'Blue Ridge', 'Forest', 'Coral'],
    dimensions: { width: 54, depth: 34, height: 0 },
    tags: ['traditional', 'washable', 'cover'],
    colorFamily: 'neutral',
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
        uri: 'https://static.wixstatic.com/media/cc389e_a7d627de8d47491c8aefc2ada7690293~mv2.jpg/v1/fit/w_2000,h_1428,q_90/file.jpg',
        alt: 'Sunset Cotton Cover in room lifestyle shot',
        blurhash: 'LHKB%|~q0KIU_3of%MWB9Fay%MRj',
      },
    ],
    badge: 'Sale',
    rating: 4.4,
    reviewCount: 198,
    inStock: true,
    fabricOptions: ['Coral', 'Terracotta', 'Amber'],
    dimensions: { width: 60, depth: 36, height: 0 },
    tags: ['organic', 'washable', 'cover'],
    colorFamily: 'warm',
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
        uri: 'https://static.wixstatic.com/media/cc389e_e24e1143660b4361af00a9825ba3c417~mv2.jpg/v1/fit/w_2000,h_1330,q_90/file.jpg',
        alt: 'Premium Innerspring Mattress in room lifestyle shot',
        blurhash: 'LPO|x_~q9F%M00of-;WB4nayRjWB',
      },
    ],
    rating: 4.7,
    reviewCount: 145,
    inStock: true,
    fabricOptions: ['Natural', 'Gray'],
    dimensions: { width: 54, depth: 75, height: 8 },
    tags: ['innerspring', 'support', 'mattress'],
    colorFamily: 'neutral',
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
        uri: 'https://static.wixstatic.com/media/cc389e_bd4fe65dcec34605bf490f90dadbb3a2~mv2.jpg/v1/fit/w_1920,h_1080,q_90/file.jpg',
        alt: 'Memory Foam Mattress in room lifestyle shot',
        blurhash: 'LKH_$O~q9F%M00WB-;of4nayRjt7',
      },
    ],
    badge: 'New',
    rating: 4.8,
    reviewCount: 52,
    inStock: true,
    fabricOptions: ['White', 'Gray'],
    dimensions: { width: 54, depth: 75, height: 6 },
    tags: ['modern', 'cooling', 'mattress'],
    colorFamily: 'cool',
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
        uri: 'https://static.wixstatic.com/media/cc389e_f64bd95bfd3a486f9de4b7f0dca07d96~mv2.jpg/v1/fit/w_2000,h_1330,q_90/file.jpg',
        alt: 'Solid Hardwood Frame in room lifestyle shot',
        blurhash: 'LJIh5}~q9F%M00WBD%WB4nRjRjWB',
      },
    ],
    rating: 4.6,
    reviewCount: 203,
    inStock: true,
    fabricOptions: ['Honey Oak', 'Espresso', 'Natural'],
    dimensions: { width: 54, depth: 38, height: 33 },
    tags: ['traditional', 'hardwood', 'frame'],
    colorFamily: 'warm',
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
      {
        uri: 'https://static.wixstatic.com/media/cc389e_427363ff1bde4e4cab2ef97684a1e941~mv2.jpg/v1/fit/w_2000,h_1330,q_90/file.jpg',
        alt: 'Futon Arm Pillow Set in room lifestyle shot',
        blurhash: 'LMN],-xu9F~q_3WBD%Rj4nofIUt7',
      },
    ],
    rating: 4.3,
    reviewCount: 87,
    inStock: true,
    fabricOptions: ['Natural', 'Gray', 'Blue', 'Coral'],
    dimensions: { width: 24, depth: 8, height: 8 },
    tags: ['accent', 'pillow', 'accessory'],
    colorFamily: 'warm',
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
        uri: 'https://static.wixstatic.com/media/cc389e_430d493e0a5d4483b8cc71702aa6aa9f~mv2.jpg/v1/fit/w_2000,h_1330,q_90/file.jpg',
        alt: 'Non-Slip Grip Strips product shot',
        blurhash: 'L9ABV]~q00%M-;WB9Fof00of%MRj',
      },
    ],
    rating: 4.1,
    reviewCount: 456,
    inStock: false,
    stockCount: 0,
    fabricOptions: [],
    dimensions: { width: 12, depth: 2, height: 0 },
    tags: ['accessory', 'non-slip', 'utility'],
    colorFamily: 'neutral',
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
        uri: 'https://static.wixstatic.com/media/cc389e_b88e2a0390cf4364b22b947840c566df~mv2.jpg/v1/fit/w_2000,h_1330,q_90/file.jpg',
        alt: 'Natural Wood Polish product shot',
        blurhash: 'LJIh5}~q9F%M00WB-;ay4nRjofWB',
      },
    ],
    rating: 4.6,
    reviewCount: 89,
    inStock: true,
    fabricOptions: [],
    dimensions: { width: 3, depth: 3, height: 6 },
    tags: ['natural', 'care', 'accessory'],
    colorFamily: 'warm',
  },
];
