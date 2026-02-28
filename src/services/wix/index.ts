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

export {
  WixProvider,
  useWixClient,
  useWixProducts,
  useWixCollections,
} from './wixProvider';

export { getWixConfig, isWixConfigured } from './config';
