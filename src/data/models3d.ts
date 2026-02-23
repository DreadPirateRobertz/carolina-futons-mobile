/**
 * 3D model asset catalog for AR "View in Your Room" feature.
 *
 * Each product with AR support maps to a pair of 3D model files:
 * - USDZ for iOS AR Quick Look
 * - GLB for Android Scene Viewer / custom renderer
 *
 * Dimensions in meters (required by ARKit/ARCore for real-world scale).
 * Placeholder CDN URLs now; replaced with real assets when 3D models ship.
 */

/** CDN base URL for 3D model assets */
export const MODEL_CDN_BASE = 'https://cdn.carolinafutons.com/models';

export interface Model3DAsset {
  /** Product ID — matches Product.id from products.ts */
  productId: string;
  /** GLB model URL (Android / cross-platform) */
  glbUrl: string;
  /** USDZ model URL (iOS AR Quick Look) */
  usdzUrl: string;
  /** Real-world dimensions in meters */
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
  /** Approximate file size in bytes (GLB) for download progress */
  fileSizeBytes: number;
  /** Content hash for cache busting */
  contentHash: string;
  /** Whether this model supports fabric variant swapping */
  hasFabricVariants: boolean;
}

/** Convert inches to meters */
function inToM(inches: number): number {
  return Math.round(inches * 0.0254 * 1000) / 1000;
}

/**
 * 3D model catalog.
 * Only products with AR-suitable geometry are included (futons, frames).
 * Covers, pillows, and small accessories are excluded from AR.
 */
export const MODELS_3D: Model3DAsset[] = [
  {
    productId: 'prod-asheville-full',
    glbUrl: `${MODEL_CDN_BASE}/glb/asheville-full-a1b2c3.glb`,
    usdzUrl: `${MODEL_CDN_BASE}/usdz/asheville-full-a1b2c3.usdz`,
    dimensions: { width: inToM(54), depth: inToM(34), height: inToM(33) },
    fileSizeBytes: 6_800_000,
    contentHash: 'a1b2c3',
    hasFabricVariants: true,
  },
  {
    productId: 'prod-blue-ridge-queen',
    glbUrl: `${MODEL_CDN_BASE}/glb/blue-ridge-queen-d4e5f6.glb`,
    usdzUrl: `${MODEL_CDN_BASE}/usdz/blue-ridge-queen-d4e5f6.usdz`,
    dimensions: { width: inToM(60), depth: inToM(36), height: inToM(35) },
    fileSizeBytes: 7_500_000,
    contentHash: 'd4e5f6',
    hasFabricVariants: true,
  },
  {
    productId: 'prod-pisgah-twin',
    glbUrl: `${MODEL_CDN_BASE}/glb/pisgah-twin-g7h8i9.glb`,
    usdzUrl: `${MODEL_CDN_BASE}/usdz/pisgah-twin-g7h8i9.usdz`,
    dimensions: { width: inToM(39), depth: inToM(32), height: inToM(31) },
    fileSizeBytes: 5_200_000,
    contentHash: 'g7h8i9',
    hasFabricVariants: true,
  },
  {
    productId: 'prod-biltmore-loveseat',
    glbUrl: `${MODEL_CDN_BASE}/glb/biltmore-loveseat-j0k1l2.glb`,
    usdzUrl: `${MODEL_CDN_BASE}/usdz/biltmore-loveseat-j0k1l2.usdz`,
    dimensions: { width: inToM(48), depth: inToM(33), height: inToM(32) },
    fileSizeBytes: 5_800_000,
    contentHash: 'j0k1l2',
    hasFabricVariants: true,
  },
  {
    productId: 'prod-hardwood-frame',
    glbUrl: `${MODEL_CDN_BASE}/glb/hardwood-frame-m3n4o5.glb`,
    usdzUrl: `${MODEL_CDN_BASE}/usdz/hardwood-frame-m3n4o5.usdz`,
    dimensions: { width: inToM(54), depth: inToM(38), height: inToM(33) },
    fileSizeBytes: 4_100_000,
    contentHash: 'm3n4o5',
    hasFabricVariants: false,
  },
];

/** Look up 3D model asset for a product, returns undefined if no AR model exists */
export function getModel3DForProduct(productId: string): Model3DAsset | undefined {
  return MODELS_3D.find((m) => m.productId === productId);
}

/** Check whether a product has an AR model available */
export function hasARModel(productId: string): boolean {
  return MODELS_3D.some((m) => m.productId === productId);
}
