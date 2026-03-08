/**
 * @module useProducts
 *
 * Full-featured product catalog hook powering the Shop screen. Provides fuzzy
 * search with autocomplete suggestions, category filtering, multi-strategy sort,
 * offset pagination, and SWR (Stale-While-Revalidate) caching via
 * AsyncStorage for offline-first browsing.
 *
 * When Wix is configured (env vars set + WixProvider mounted), product queries
 * are sent to the Wix Stores REST API with server-side search, sort, and
 * pagination. When Wix is unavailable, falls back to the static mock catalog
 * with client-side filtering. The exported interface is identical in both modes.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  PRODUCTS,
  CATEGORIES,
  type Product,
  type ProductCategory,
  type SortOption,
  type CategoryInfo,
  type StockStatus,
  getStockStatus,
  LOW_STOCK_THRESHOLD,
} from '@/data/products';
import { fuzzySearch, getSuggestions } from '@/utils/fuzzySearch';
import { useDataCache } from '@/hooks/useDataCache';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { isWixConfigured } from '@/services/wix/config';

export type { Product, ProductCategory, SortOption, CategoryInfo, StockStatus };
export { getStockStatus, LOW_STOCK_THRESHOLD };

const PAGE_SIZE = 8;
const PRODUCT_CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

const getSearchableText = (p: Product) => [p.name, p.shortDescription, p.category];

/** Mock fetcher — used when Wix is not configured */
async function fetchProducts(): Promise<Product[]> {
  return PRODUCTS;
}

/**
 * Maps local ProductCategory values to Wix collection IDs.
 * Populate with actual Wix collection UUIDs from the dashboard.
 * Categories without a mapped ID fall back to client-side post-filtering.
 */
const CATEGORY_COLLECTION_IDS: Partial<Record<ProductCategory, string>> = {
  // futons: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  // covers: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
};

interface UseProductsReturn {
  products: Product[];
  categories: CategoryInfo[];
  searchQuery: string;
  selectedCategory: ProductCategory | null;
  sortBy: SortOption;
  isLoading: boolean;
  /** True only during the initial page load (before first data arrives) */
  isInitialLoading: boolean;
  hasMore: boolean;
  /** Autocomplete suggestions for current query */
  suggestions: string[];
  /** Whether serving from cache (stale data) */
  isFromCache: boolean;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: ProductCategory | null) => void;
  setSortBy: (sort: SortOption) => void;
  loadMore: () => void;
  refresh: () => void;
}

interface UseProductsOptions {
  initialCategory?: ProductCategory;
}

/**
 * Product browsing hook with fuzzy search, autocomplete, filter, sort, and pagination.
 *
 * When Wix is configured, queries are sent to the Wix Stores API with server-side
 * search, sort, and pagination. Autocomplete suggestions remain client-side (fuzzy
 * matching over the locally cached product name corpus).
 *
 * When Wix is not configured, falls back to mock data with client-side filtering.
 */
export function useProducts(options?: UseProductsOptions): UseProductsReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(
    options?.initialCategory ?? null,
  );
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  // ── Wix mode detection ──────────────────────────────────────
  const wixClient = useOptionalWixClient();
  const useWix = isWixConfigured() && wixClient !== null;

  // ── Wix-specific state ──────────────────────────────────────
  const [wixProducts, setWixProducts] = useState<Product[]>([]);
  const [wixTotalResults, setWixTotalResults] = useState(0);
  const [wixIsLoading, setWixIsLoading] = useState(false);
  const [wixIsInitialLoading, setWixIsInitialLoading] = useState(useWix);
  const [refreshToken, setRefreshToken] = useState(0);
  const wixAbortRef = useRef<AbortController | null>(null);

  // ── Wix fetch effect ────────────────────────────────────────
  useEffect(() => {
    if (!useWix || !wixClient) return;

    wixAbortRef.current?.abort();
    const controller = new AbortController();
    wixAbortRef.current = controller;

    setWixIsLoading(true);

    const collectionId = selectedCategory
      ? CATEGORY_COLLECTION_IDS[selectedCategory]
      : undefined;

    wixClient
      .queryProducts({
        search: searchQuery.trim() || undefined,
        sort: sortBy,
        collectionId,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
      .then(({ products: fetched, totalResults }) => {
        if (controller.signal.aborted) return;
        setWixProducts((prev) => (page === 1 ? fetched : [...prev, ...fetched]));
        setWixTotalResults(totalResults);
        setWixIsInitialLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setWixIsInitialLoading(false);
        console.warn('[useProducts] Wix fetch error:', err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setWixIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [useWix, wixClient, searchQuery, selectedCategory, sortBy, page, refreshToken]);

  // ── Mock/offline path (SWR cache) ──────────────────────────
  const {
    data: cachedProducts,
    isLoading: isCacheLoading,
    isStale: isFromCache,
    refresh: cacheRefresh,
  } = useDataCache<Product[]>('products', fetchProducts, { maxAge: PRODUCT_CACHE_MAX_AGE });

  const allProducts = cachedProducts ?? [];
  const mockIsInitialLoading = isCacheLoading && cachedProducts === null;

  // Product names for autocomplete (derived from cached product set)
  const productNames = useMemo(() => allProducts.map((p) => p.name), [allProducts]);

  // Autocomplete suggestions — always client-side fuzzy for instant response
  const suggestions = useMemo(
    () => (searchQuery.trim().length >= 2 ? getSuggestions(searchQuery, productNames, 5) : []),
    [searchQuery, productNames],
  );

  // Filter and sort products (mock path only)
  const filteredSorted = useMemo(() => {
    let result: Product[];

    // Fuzzy search filter
    if (searchQuery.trim()) {
      result = fuzzySearch(allProducts, searchQuery, getSearchableText).map((r) => r.item);
    } else {
      result = [...allProducts];
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Sort (skip if search is active — fuzzy results are already relevance-sorted)
    if (!searchQuery.trim() || sortBy !== 'featured') {
      switch (sortBy) {
        case 'price-asc':
          result.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          result.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          result.sort((a, b) => b.rating - a.rating);
          break;
        case 'newest':
          result.reverse();
          break;
        case 'featured':
        default:
          result.sort((a, b) => {
            if (a.badge === 'Bestseller' && b.badge !== 'Bestseller') return -1;
            if (b.badge === 'Bestseller' && a.badge !== 'Bestseller') return 1;
            return b.reviewCount - a.reviewCount;
          });
          break;
      }
    }

    return result;
  }, [searchQuery, selectedCategory, sortBy, allProducts]);

  // Paginated slice (mock path only)
  const mockProducts = useMemo(
    () => filteredSorted.slice(0, page * PAGE_SIZE),
    [filteredSorted, page],
  );

  const mockHasMore = mockProducts.length < filteredSorted.length;

  // ── Mode-resolved values ────────────────────────────────────
  const wixHasMore = wixProducts.length < wixTotalResults;

  // Apply client-side category post-filter when Wix has no collection ID for this category
  const resolvedProducts = useWix
    ? selectedCategory && !CATEGORY_COLLECTION_IDS[selectedCategory]
      ? wixProducts.filter((p) => p.category === selectedCategory)
      : wixProducts
    : mockIsInitialLoading
      ? []
      : mockProducts;

  const resolvedIsLoading = useWix ? wixIsLoading : isLoading;
  const resolvedIsInitialLoading = useWix ? wixIsInitialLoading : mockIsInitialLoading;
  const resolvedHasMore = useWix ? wixHasMore : mockHasMore;

  // ── Actions ─────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (useWix) {
      if (!wixHasMore || wixIsLoading) return;
      setPage((p) => p + 1);
    } else {
      if (!mockHasMore || isLoading) return;
      setIsLoading(true);
      setTimeout(() => {
        setPage((p) => p + 1);
        setIsLoading(false);
      }, 300);
    }
  }, [useWix, wixHasMore, wixIsLoading, mockHasMore, isLoading]);

  const refresh = useCallback(() => {
    setPage(1);
    if (useWix) {
      setWixProducts([]);
      setWixTotalResults(0);
      setWixIsInitialLoading(true);
      setRefreshToken((t) => t + 1);
    } else {
      setIsLoading(false);
      cacheRefresh();
    }
  }, [useWix, cacheRefresh]);

  // Reset pagination when filters change
  const handleSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const handleCategory = useCallback((category: ProductCategory | null) => {
    setSelectedCategory(category);
    setPage(1);
  }, []);

  const handleSort = useCallback((sort: SortOption) => {
    setSortBy(sort);
    setPage(1);
  }, []);

  return {
    products: resolvedProducts,
    categories: CATEGORIES,
    searchQuery,
    selectedCategory,
    sortBy,
    isLoading: resolvedIsLoading,
    isInitialLoading: resolvedIsInitialLoading,
    hasMore: resolvedHasMore,
    suggestions,
    isFromCache: useWix ? false : isFromCache,
    setSearchQuery: handleSearchQuery,
    setSelectedCategory: handleCategory,
    setSortBy: handleSort,
    loadMore,
    refresh,
  };
}
