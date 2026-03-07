/**
 * Hook for accessing editorial collections.
 * Tries Wix CMS API, falls back to static data.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { COLLECTIONS, type EditorialCollection } from '@/data/collections';
import { PRODUCTS, type Product } from '@/data/products';
import { getWixClientInstance } from '@/services/wix/singleton';

const productMap = new Map(PRODUCTS.map((p) => [p.id, p]));

interface WixCmsEditorialCollection {
  _id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  heroImage: { uri: string; alt: string };
  mood: string[];
  season?: string;
  featured: boolean;
  productIds: string[];
}

function transformCmsCollection(item: WixCmsEditorialCollection): EditorialCollection {
  return {
    id: item._id,
    slug: item.slug ?? '',
    title: item.title ?? '',
    subtitle: item.subtitle ?? '',
    description: item.description ?? '',
    heroImage: item.heroImage ?? { uri: '', alt: '' },
    mood: item.mood ?? [],
    season: item.season,
    featured: item.featured ?? false,
    productIds: item.productIds ?? [],
  };
}

export function useCollections() {
  const [collections, setCollections] = useState<EditorialCollection[]>(COLLECTIONS);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const client = getWixClientInstance();
    if (client) {
      (async () => {
        try {
          const result = await client.queryData<WixCmsEditorialCollection>('EditorialCollections', {
            limit: 100,
          });
          if (mounted.current && result.items.length > 0) {
            setCollections(result.items.map(transformCmsCollection));
          }
        } catch {
          // Keep mock data on failure
        }
      })();
    }

    return () => {
      mounted.current = false;
    };
  }, []);

  return useMemo(
    () => ({
      collections,
      featured: collections.filter((c) => c.featured),
    }),
    [collections],
  );
}

/** Resolves a single collection by URL slug and hydrates its product references. */
export function useCollection(slug: string): {
  collection: EditorialCollection | undefined;
  products: Product[];
} {
  const { collections } = useCollections();
  const [wixProducts, setWixProducts] = useState<Map<string, Product>>(productMap);

  // Try to fetch products from Wix if configured
  useEffect(() => {
    const client = getWixClientInstance();
    if (!client) return;

    (async () => {
      try {
        const result = await client.queryProducts({ limit: 100 });
        const map = new Map(result.products.map((p) => [p.id, p]));
        setWixProducts(map);
      } catch {
        // Keep using mock product map
      }
    })();
  }, []);

  return useMemo(() => {
    const collection = collections.find((c) => c.slug === slug);
    if (!collection) return { collection: undefined, products: [] };

    const products = collection.productIds
      .map((id) => wixProducts.get(id))
      .filter((p): p is Product => p !== undefined);

    return { collection, products };
  }, [slug, collections, wixProducts]);
}
