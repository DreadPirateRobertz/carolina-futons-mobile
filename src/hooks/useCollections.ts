/**
 * Hook for accessing editorial collections.
 * Static data now; drop-in replacement for Wix CMS later.
 */

import { useMemo } from 'react';
import { COLLECTIONS, type EditorialCollection } from '@/data/collections';
import { PRODUCTS, type Product } from '@/data/products';

const productMap = new Map(PRODUCTS.map((p) => [p.id, p]));

/** Retrieves all collections and filters for featured ones (homepage carousel). */
export function useCollections() {
  return useMemo(
    () => ({
      collections: COLLECTIONS,
      featured: COLLECTIONS.filter((c) => c.featured),
    }),
    [],
  );
}

/** Resolves a single collection by URL slug and hydrates its product references. */
export function useCollection(slug: string): {
  collection: EditorialCollection | undefined;
  products: Product[];
} {
  return useMemo(() => {
    const collection = COLLECTIONS.find((c) => c.slug === slug);
    if (!collection) return { collection: undefined, products: [] };

    const products = collection.productIds
      .map((id) => productMap.get(id))
      .filter((p): p is Product => p !== undefined);

    return { collection, products };
  }, [slug]);
}
