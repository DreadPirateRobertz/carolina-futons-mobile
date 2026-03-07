/**
 * Editorial collection data and types.
 * "Shop the Look" curated room scenes linking to existing products.
 * Mock data now; designed for Wix CMS API integration later.
 */

export interface EditorialCollection {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  heroImage: { uri: string; alt: string; blurhash?: string };
  mood: string[];
  season?: string;
  featured: boolean;
  earlyAccess?: boolean;
  productIds: string[];
}

/** Warm-toned fallback blurhash for collection hero images. */
export const DEFAULT_COLLECTION_BLURHASH = 'LKO2:N%2Tw=w]~RBVZRi};RPxuwH';

export const COLLECTIONS: EditorialCollection[] = [
  {
    id: 'col-mountain-lodge',
    slug: 'mountain-lodge-living',
    title: 'Mountain Lodge Living',
    subtitle: 'Warm tones, solid wood, peak comfort',
    description:
      'Inspired by the cozy lodges of the Blue Ridge, this collection pairs our bestselling hardwood futons with rich earth-toned covers and handcrafted accessories. Every piece is designed to make your living room feel like a mountain retreat.',
    heroImage: {
      uri: 'https://placeholder.co/800x500/5C4033/F2E8D5?text=Mountain+Lodge+Living',
      alt: 'A cozy mountain lodge living room with a futon and warm lighting',
    },
    mood: ['cozy', 'rustic', 'warm'],
    season: 'fall',
    featured: true,
    productIds: [
      'prod-asheville-full',
      'prod-mountain-cover-full',
      'prod-premium-innerspring',
      'prod-hardwood-frame',
      'prod-arm-pillows',
      'prod-furniture-polish',
    ],
  },
  {
    id: 'col-modern-minimalist',
    slug: 'modern-minimalist',
    title: 'Modern Minimalist',
    subtitle: 'Clean lines, maximum function',
    description:
      'Less is more. Our Modern Minimalist collection highlights space-saving Murphy beds and sleek futon designs that disappear when not in use. Perfect for those who believe great design means nothing wasted.',
    heroImage: {
      uri: 'https://placeholder.co/800x500/A8CCD8/3A2518?text=Modern+Minimalist',
      alt: 'A minimalist room with a Murphy bed and clean white walls',
    },
    mood: ['clean', 'modern', 'sleek'],
    featured: false,
    productIds: [
      'prod-murphy-queen-desk',
      'prod-murphy-queen-vertical',
      'prod-pisgah-twin',
      'prod-memory-foam',
      'prod-grip-strips',
    ],
  },
  {
    id: 'col-studio-essentials',
    slug: 'studio-apartment-essentials',
    title: 'Studio Apartment Essentials',
    subtitle: 'Everything for small-space living',
    description:
      'Studio living demands furniture that works double duty. This collection brings together our most compact, convertible pieces — from twin futons that become beds in seconds to cabinet beds that vanish into stylish consoles.',
    heroImage: {
      uri: 'https://placeholder.co/800x500/E8845C/FFFFFF?text=Studio+Essentials',
      alt: 'A bright studio apartment with convertible furniture',
    },
    mood: ['compact', 'versatile', 'bright'],
    featured: false,
    productIds: [
      'prod-pisgah-twin',
      'prod-murphy-twin-cabinet',
      'prod-sunset-cover-queen',
      'prod-memory-foam',
      'prod-arm-pillows',
      'prod-grip-strips',
    ],
  },
  {
    id: 'col-guest-room',
    slug: 'guest-room-ready',
    title: 'Guest Room Ready',
    subtitle: 'Impress every overnight visitor',
    description:
      'Turn any spare room into a five-star guest suite. Our queen-size futons and Murphy beds pair with premium mattresses and luxe covers to create sleeping spaces your guests will actually look forward to.',
    heroImage: {
      uri: 'https://placeholder.co/800x500/C9A0A0/3A2518?text=Guest+Room+Ready',
      alt: 'An inviting guest room with a queen futon and decorative pillows',
    },
    mood: ['welcoming', 'luxe', 'comfortable'],
    season: 'all-year',
    featured: true,
    productIds: [
      'prod-blue-ridge-queen',
      'prod-murphy-queen-bookcase',
      'prod-premium-innerspring',
      'prod-sunset-cover-queen',
      'prod-arm-pillows',
    ],
  },
  {
    id: 'col-reading-nook',
    slug: 'reading-nook-retreat',
    title: 'Reading Nook Retreat',
    subtitle: 'Your perfect cozy corner',
    description:
      'Carve out a quiet corner for yourself. The Biltmore loveseat, cloud-soft pillows, and a warm cover create the ultimate reading nook — a small space that feels endlessly inviting.',
    heroImage: {
      uri: 'https://placeholder.co/800x500/E8D5B7/5C4033?text=Reading+Nook',
      alt: 'A cozy reading nook with a loveseat and soft throw pillows',
    },
    mood: ['cozy', 'intimate', 'quiet'],
    featured: false,
    productIds: [
      'prod-biltmore-loveseat',
      'prod-mountain-cover-full',
      'prod-arm-pillows',
      'prod-furniture-polish',
    ],
  },
  {
    id: 'col-spring-preview',
    slug: 'spring-2026-preview',
    title: 'Spring 2026 Preview',
    subtitle: 'First look — CF+ members only',
    description:
      'Get an exclusive first look at our Spring 2026 line. New organic fabrics, refreshed colorways, and a brand-new daybed design — available to CF+ members before the public launch.',
    heroImage: {
      uri: 'https://placeholder.co/800x500/B8D8BA/3A2518?text=Spring+2026+Preview',
      alt: 'A bright living room with new spring collection furniture',
    },
    mood: ['fresh', 'exclusive', 'seasonal'],
    season: 'spring',
    featured: true,
    earlyAccess: true,
    productIds: [
      'prod-asheville-full',
      'prod-blue-ridge-queen',
      'prod-sunset-cover-queen',
      'prod-memory-foam',
    ],
  },
];
