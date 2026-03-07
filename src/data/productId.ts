/**
 * Branded ID types for type-safe product/model references.
 *
 * Product.id uses 'prod-' prefix (e.g. 'prod-asheville-full').
 * FutonModel.id omits it (e.g. 'asheville-full').
 * These branded types prevent accidentally mixing them up.
 */

export type ProductId = string & { readonly __brand: 'ProductId' };
export type FutonModelId = string & { readonly __brand: 'FutonModelId' };

export function productId(id: string): ProductId {
  return id as ProductId;
}

export function futonModelId(id: string): FutonModelId {
  return id as FutonModelId;
}

/** Convert Product.id ('prod-foo') → FutonModel.id ('foo') */
export function productIdToModelId(pid: ProductId): FutonModelId {
  return futonModelId(pid.replace(/^prod-/, ''));
}

/** Convert FutonModel.id ('foo') → Product.id ('prod-foo') */
export function modelIdToProductId(mid: FutonModelId): ProductId {
  return productId(mid.startsWith('prod-') ? mid : `prod-${mid}`);
}
