/**
 * 3D model asset catalog for web platform.
 *
 * AUTO-GENERATED from shared/catalog-3d.json — do not edit manually.
 * Run: npx tsx scripts/sync-3d-catalog.ts
 */

const MODEL_CDN_BASE = 'https://cdn.carolinafutons.com/models';

function inToM(inches) {
  return Math.round(inches * 0.0254 * 1000) / 1000;
}

const MODELS_3D = [
  {
    productId: 'prod-murphy-queen-vertical',
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/AntiqueCamera/glTF-Binary/AntiqueCamera.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/murphy-queen-vertical-demo-q1r2s3.usdz`,
    dimensions: { width: inToM(64), depth: inToM(24), height: inToM(42) },
    fileSizeBytes: 1800000,
    contentHash: 'demo-q1r2s3',
    hasFabricVariants: false,
  },
  {
    productId: 'prod-murphy-full-horizontal',
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/WaterBottle/glTF-Binary/WaterBottle.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/murphy-full-horizontal-demo-t4u5v6.usdz`,
    dimensions: { width: inToM(78), depth: inToM(20), height: inToM(44) },
    fileSizeBytes: 2300000,
    contentHash: 'demo-t4u5v6',
    hasFabricVariants: false,
  },
  {
    productId: 'prod-murphy-queen-bookcase',
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Suzanne/glTF-Binary/Suzanne.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/murphy-queen-bookcase-demo-w7x8y9.usdz`,
    dimensions: { width: inToM(100), depth: inToM(24), height: inToM(84) },
    fileSizeBytes: 800000,
    contentHash: 'demo-w7x8y9',
    hasFabricVariants: false,
  },
  {
    productId: 'prod-murphy-twin-cabinet',
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoxAnimated/glTF-Binary/BoxAnimated.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/murphy-twin-cabinet-demo-z0a1b2.usdz`,
    dimensions: { width: inToM(44), depth: inToM(24), height: inToM(38) },
    fileSizeBytes: 12000,
    contentHash: 'demo-z0a1b2',
    hasFabricVariants: false,
  },
  {
    productId: 'prod-murphy-queen-desk',
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/murphy-queen-desk-demo-c3d4e5.usdz`,
    dimensions: { width: inToM(66), depth: inToM(26), height: inToM(84) },
    fileSizeBytes: 3600000,
    contentHash: 'demo-c3d4e5',
    hasFabricVariants: false,
  },
  {
    productId: 'prod-murphy-full-storage',
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Lantern/glTF-Binary/Lantern.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/murphy-full-storage-demo-f6g7h8.usdz`,
    dimensions: { width: inToM(60), depth: inToM(24), height: inToM(82) },
    fileSizeBytes: 1200000,
    contentHash: 'demo-f6g7h8',
    hasFabricVariants: false,
  },
  {
    productId: 'prod-asheville-full',
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SheenChair/glTF-Binary/SheenChair.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/asheville-full-14c9a033.usdz`,
    dimensions: { width: inToM(54), depth: inToM(34), height: inToM(33) },
    fileSizeBytes: 4125648,
    contentHash: '14c9a033',
    hasFabricVariants: true,
  },
  {
    productId: 'prod-blue-ridge-queen',
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MaterialsVariantsShoe/glTF-Binary/MaterialsVariantsShoe.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/blue-ridge-queen-demo-d4e5f6.usdz`,
    dimensions: { width: inToM(60), depth: inToM(36), height: inToM(35) },
    fileSizeBytes: 4400000,
    contentHash: 'demo-d4e5f6',
    hasFabricVariants: true,
  },
  {
    productId: 'prod-pisgah-twin',
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/pisgah-twin-demo-g7h8i9.usdz`,
    dimensions: { width: inToM(39), depth: inToM(32), height: inToM(31) },
    fileSizeBytes: 5700000,
    contentHash: 'demo-g7h8i9',
    hasFabricVariants: true,
  },
  {
    productId: 'prod-biltmore-loveseat',
    glbUrl:
      'https://raw.githubusercontent.com/nicferrier/glTF-Samples/main/Models/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/biltmore-loveseat-demo-j0k1l2.usdz`,
    dimensions: { width: inToM(48), depth: inToM(33), height: inToM(32) },
    fileSizeBytes: 420000,
    contentHash: 'demo-j0k1l2',
    hasFabricVariants: true,
  },
  {
    productId: 'prod-hardwood-frame',
    glbUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoomBox/glTF-Binary/BoomBox.glb',
    usdzUrl: `${MODEL_CDN_BASE}/usdz/hardwood-frame-demo-m3n4o5.usdz`,
    dimensions: { width: inToM(54), depth: inToM(38), height: inToM(33) },
    fileSizeBytes: 10200000,
    contentHash: 'demo-m3n4o5',
    hasFabricVariants: false,
  },
];

function getModel3DForProduct(productId) {
  return MODELS_3D.find(function (m) {
    return m.productId === productId;
  });
}

function hasARModel(productId) {
  return MODELS_3D.some(function (m) {
    return m.productId === productId;
  });
}

module.exports = { MODEL_CDN_BASE, MODELS_3D, getModel3DForProduct, hasARModel };
