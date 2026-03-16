/**
 * 3D model asset catalog for AR "View in Your Room" feature.
 *
 * AUTO-GENERATED from shared/catalog-3d.json — do not edit manually.
 * Run: npx tsx scripts/sync-3d-catalog.ts
 *
 * Each product with AR support maps to a pair of 3D model files:
 * - USDZ for iOS AR Quick Look
 * - GLB for Android Scene Viewer / custom renderer
 *
 * Dimensions in meters (required by ARKit/ARCore for real-world scale).
 */

import { type ProductId, productId } from './productId';

/** CDN base URL for 3D model assets */
export const MODEL_CDN_BASE = 'https://cdn.carolinafutons.com/models';

export interface Model3DAsset {
  /** Product ID — matches Product.id from products.ts */
  productId: ProductId;
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
 * Only products with AR-suitable geometry are included (futons, frames, murphy-beds).
 * Covers, pillows, and small accessories are excluded from AR.
 */
export const MODELS_3D: Model3DAsset[] = [
  // --- Murphy Cabinet Beds ---
  {
    // PoC: Real 3D model — KhronosGroup SheenChair (Wayfair, CC-BY-4.0)
    productId: productId('prod-murphy-queen-vertical'),
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/AntiqueCamera/glTF-Binary/AntiqueCamera.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/murphy-queen-vertical-demo-q1r2s3.usdz`,
    dimensions: { width: inToM(64), depth: inToM(24), height: inToM(42) },
    fileSizeBytes: 1_800_000,
    contentHash: 'demo-q1r2s3',
    hasFabricVariants: false,
  },
  {
    // PoC: Real 3D model — KhronosGroup SheenChair (Wayfair, CC-BY-4.0)
    productId: productId('prod-murphy-full-horizontal'),
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/WaterBottle/glTF-Binary/WaterBottle.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/murphy-full-horizontal-demo-t4u5v6.usdz`,
    dimensions: { width: inToM(78), depth: inToM(20), height: inToM(44) },
    fileSizeBytes: 2_300_000,
    contentHash: 'demo-t4u5v6',
    hasFabricVariants: false,
  },
  {
    // PoC: Real 3D model — KhronosGroup SheenChair (Wayfair, CC-BY-4.0)
    productId: productId('prod-murphy-queen-bookcase'),
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Suzanne/glTF-Binary/Suzanne.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/murphy-queen-bookcase-demo-w7x8y9.usdz`,
    dimensions: { width: inToM(100), depth: inToM(24), height: inToM(84) },
    fileSizeBytes: 800_000,
    contentHash: 'demo-w7x8y9',
    hasFabricVariants: false,
  },
  {
    // PoC: Real 3D model — KhronosGroup SheenChair (Wayfair, CC-BY-4.0)
    productId: productId('prod-murphy-twin-cabinet'),
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoxAnimated/glTF-Binary/BoxAnimated.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/murphy-twin-cabinet-demo-z0a1b2.usdz`,
    dimensions: { width: inToM(44), depth: inToM(24), height: inToM(38) },
    fileSizeBytes: 12_000,
    contentHash: 'demo-z0a1b2',
    hasFabricVariants: false,
  },
  {
    // PoC: Real 3D model — KhronosGroup SheenChair (Wayfair, CC-BY-4.0)
    productId: productId('prod-murphy-queen-desk'),
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/murphy-queen-desk-demo-c3d4e5.usdz`,
    dimensions: { width: inToM(66), depth: inToM(26), height: inToM(84) },
    fileSizeBytes: 3_600_000,
    contentHash: 'demo-c3d4e5',
    hasFabricVariants: false,
  },
  {
    // PoC: Real 3D model — KhronosGroup SheenChair (Wayfair, CC-BY-4.0)
    productId: productId('prod-murphy-full-storage'),
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Lantern/glTF-Binary/Lantern.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/murphy-full-storage-demo-f6g7h8.usdz`,
    dimensions: { width: inToM(60), depth: inToM(24), height: inToM(82) },
    fileSizeBytes: 1_200_000,
    contentHash: 'demo-f6g7h8',
    hasFabricVariants: false,
  },

  // --- Futons & Frames ---
  {
    // PoC: Real 3D model — KhronosGroup SheenChair (Wayfair, CC-BY-4.0)
    productId: productId('prod-asheville-full'),
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SheenChair/glTF-Binary/SheenChair.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/asheville-full-14c9a033.usdz`,
    dimensions: { width: inToM(54), depth: inToM(34), height: inToM(33) },
    fileSizeBytes: 4_125_648,
    contentHash: '14c9a033',
    hasFabricVariants: true,
  },
  {
    // PoC: Real 3D model — KhronosGroup SheenChair (Wayfair, CC-BY-4.0)
    productId: productId('prod-blue-ridge-queen'),
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MaterialsVariantsShoe/glTF-Binary/MaterialsVariantsShoe.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/blue-ridge-queen-demo-d4e5f6.usdz`,
    dimensions: { width: inToM(60), depth: inToM(36), height: inToM(35) },
    fileSizeBytes: 4_400_000,
    contentHash: 'demo-d4e5f6',
    hasFabricVariants: true,
  },
  {
    // PoC: Real 3D model — KhronosGroup SheenChair (Wayfair, CC-BY-4.0)
    productId: productId('prod-pisgah-twin'),
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/pisgah-twin-demo-g7h8i9.usdz`,
    dimensions: { width: inToM(39), depth: inToM(32), height: inToM(31) },
    fileSizeBytes: 5_700_000,
    contentHash: 'demo-g7h8i9',
    hasFabricVariants: true,
  },
  {
    productId: productId('prod-biltmore-loveseat'),
    glbUrl:
      'https://raw.githubusercontent.com/nicferrier/glTF-Samples/main/Models/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/biltmore-loveseat-demo-j0k1l2.usdz`,
    dimensions: { width: inToM(48), depth: inToM(33), height: inToM(32) },
    fileSizeBytes: 420_000,
    contentHash: 'demo-j0k1l2',
    hasFabricVariants: true,
  },
  {
    // PoC: Real 3D model — KhronosGroup SheenChair (Wayfair, CC-BY-4.0)
    productId: productId('prod-hardwood-frame'),
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoomBox/glTF-Binary/BoomBox.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/hardwood-frame-demo-m3n4o5.usdz`,
    dimensions: { width: inToM(54), depth: inToM(38), height: inToM(33) },
    fileSizeBytes: 10_200_000,
    contentHash: 'demo-m3n4o5',
    hasFabricVariants: false,
  },
];

/** Look up 3D model asset for a product, returns undefined if no AR model exists */
export function getModel3DForProduct(pid: ProductId): Model3DAsset | undefined {
  return MODELS_3D.find((m) => m.productId === pid);
}

/** Check whether a product has an AR model available */
export function hasARModel(pid: ProductId): boolean {
  return MODELS_3D.some((m) => m.productId === pid);
}
