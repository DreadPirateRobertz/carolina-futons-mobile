/**
 * @module wix
 *
 * Barrel file re-exporting the entire Wix integration surface:
 * REST client, React provider/hooks, SDK auth client, config helpers,
 * and secure token storage.
 */
export {
  WixClient,
  WixApiError,
  transformWixProduct,
  transformWixCollection,
  setCollectionCategoryMap,
  getCollectionCategoryMap,
  resolveCategory,
  type WixClientConfig,
  type WixProduct,
  type WixCollection,
  type WixCollectionInfo,
  type InventoryStatus,
  type QueryProductsOptions,
  type QueryCollectionsOptions,
} from './wixClient';

export { WixProvider, useWixClient, useWixProducts, useWixCollections } from './wixProvider';

export { getWixConfig, isWixConfigured } from './config';

export { getWixClientInstance, resetWixClientInstance } from './singleton';

export { getWixSdkClient, resetWixSdkClient } from './wixSdkClient';

export { WixAuthService, type AuthResult, type AuthUser } from './wixAuth';

export { saveTokens, loadTokens, clearTokens, type WixTokens } from './tokenStorage';

export { replayOfflineQueue, type ReplayResult, type ReplayError } from './replayOfflineQueue';
