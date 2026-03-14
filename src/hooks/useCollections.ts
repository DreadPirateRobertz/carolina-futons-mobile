/**
 * Hook for accessing editorial collections.
 * Fetches from Wix CMS Data API with SWR caching, falls back to static data.
 */

import { useMemo, useCallback } from 'react';
import { COLLECTIONS, type EditorialCollection } from '@/data/collections';
import { PRODUCTS, type Product } from '@/data/products';
import type { ProductId } from '@/data/productId';
import { useDataCache } from '@/hooks/useDataCache';
import { useOptionalWixClient } from '@/services/wix';
import type { WixClient } from '@/services/wix/wixClient';

const productMap = new Map(PRODUCTS.map((p) => [p.id, p]));
const COLLECTION_CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes

/** CMS collection ID for editorial collections in Wix Data. */
const CMS_COLLECTION_ID = 'EditorialCollections';

interface WixEditorialItem {
  _id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  heroImageUrl: string;
  heroImageAlt: string;
  heroImageBlurhash?: string;
  mood: string[];
  season?: string;
  featured: boolean;
  earlyAccess?: boolean;
  productIds: string[];
}

function transformCmsCollection(item: WixEditorialItem): EditorialCollection {
  return {
    id: item._id,
    slug: item.slug,
    title: item.title,
    subtitle: item.subtitle,
    description: item.description,
    heroImage: {
      uri: item.heroImageUrl,
      alt: item.heroImageAlt,
      blurhash: item.heroImageBlurhash,
    },
    mood: item.mood ?? [],
    season: item.season,
    featured: item.featured ?? false,
    earlyAccess: item.earlyAccess,
    productIds: item.productIds ?? [],
  };
}

function createFetcher(client: WixClient | null) {
  return async (): Promise<EditorialCollection[]> => {
    if (client) {
      try {
        const result = await client.queryData<WixEditorialItem>(CMS_COLLECTION_ID, {
          limit: 50,
          sort: [{ fieldName: 'featured', order: 'DESC' }],
        });
        if (result.items.length > 0) {
          return result.items.map(transformCmsCollection);
        }
      } catch {
        // CMS fetch failed — fall back to static data
      }
    }
    return COLLECTIONS;
  };
}

/** Retrieves all collections with SWR caching, filters for featured (homepage carousel). */
export function useCollections() {
  const client = useOptionalWixClient();
  const fetcher = useCallback(() => createFetcher(client)(), [client]);

  const { data, isLoading, isStale, refresh } = useDataCache<EditorialCollection[]>(
    'editorial-collections',
    fetcher,
    { maxAge: COLLECTION_CACHE_MAX_AGE },
  );

  const collections = data ?? COLLECTIONS;

  return useMemo(
    () => ({
      collections,
      featured: collections.filter((c) => c.featured),
      isLoading,
      isStale,
      refresh,
    }),
    [collections, isLoading, isStale, refresh],
  );
}

/** Resolves a single collection by URL slug and hydrates its product references via Wix API. */
export function useCollection(slug: string): {
  collection: EditorialCollection | undefined;
  products: Product[];
  isLoading: boolean;
} {
  const { collections } = useCollections();
  const client = useOptionalWixClient();

  const collection = useMemo(() => collections.find((c) => c.slug === slug), [slug, collections]);

  const productFetcher = useCallback(async (): Promise<Product[]> => {
    if (!collection) return [];

    // Try Wix API first
    if (client && collection.productIds.length > 0) {
      try {
        const result = await client.queryProducts({
          productIds: collection.productIds,
          limit: collection.productIds.length,
        });
        if (result.products.length > 0) {
          return result.products;
        }
      } catch {
        // Wix fetch failed — fall through to static fallback
      }
    }

    // Static fallback
    return collection.productIds
      .map((id) => productMap.get(id as ProductId))
      .filter((p): p is Product => p !== undefined);
  }, [collection, client]);

  const { data, isLoading } = useDataCache<Product[]>(
    `collection-products-${slug}`,
    productFetcher,
    { maxAge: COLLECTION_CACHE_MAX_AGE },
  );

  return useMemo(
    () => ({
      collection,
      products: data ?? [],
      isLoading,
    }),
    [collection, data, isLoading],
  );
}
