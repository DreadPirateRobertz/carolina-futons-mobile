/**
 * @module utils
 *
 * Barrel file for shared utility functions: price formatting, AR (Augmented
 * Reality) viewer helpers, fuzzy search, store-hours/distance calculations,
 * and dimension display conversion.
 */
export { formatPrice } from './formatPrice';
export { openARViewer, getARModelAssets, buildSceneViewerUrl } from './openARViewer';
export { fuzzyScore, fuzzySearch, getSuggestions } from './fuzzySearch';
export type { FuzzyResult } from './fuzzySearch';
export { isStoreOpen, calculateDistance, formatPhone } from './storeUtils';
export { inchesToFeetDisplay } from './dimensions';
export {
  calculateMonthlyPayment,
  isFinancingEligible,
  getFinancingTerms,
  FINANCING_THRESHOLD,
  FINANCING_APR,
} from './financing';
export {
  type ProductId,
  type FutonModelId,
  productId,
  productIdToModelId,
  modelIdToProductId,
} from '@/data/productId';
