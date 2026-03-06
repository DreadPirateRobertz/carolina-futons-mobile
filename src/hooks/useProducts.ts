/**
 * @module useProducts
 *
 * Full-featured product catalog hook powering the Shop screen. Provides fuzzy
 * search with autocomplete suggestions, category filtering, multi-strategy sort,
 * cursor-style pagination, and SWR (Stale-While-Revalidate) caching via
 * AsyncStorage for offline-first browsing.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  PRODUCTS,
  CATEGORIES,
  type Product,
  type ProductCategory,
  type SortOption,
  type CategoryInfo,
} from '@/data/products';
import { fuzzySearch, getSuggestions } from '@/utils/fuzzySearch';
import { saveCatalog, loadCachedCatalog } from '@/services/productCache';

export type { Product, ProductCategory, SortOption, CategoryInfo };

const PAGE_SIZE = 8;

const getSearchableText = (p: Product) => [p.name, p.shortDescription, p.category];

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
 * Implements stale-while-revalidate caching:
 * - On mount: serves cached products immediately if available
 * - Fetches fresh data in background (currently mock, ready for API swap-in)
 * - Caches fresh data to AsyncStorage for offline access
 */
export function useProducts(options?: UseProductsOptions): UseProductsReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(
    options?.initialCategory ?? null,
  );
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isFromCache, setIsFromCache] = useState(false);
  const freshLoaded = useRef(false);

  // Step 1: Load cached catalog immediately (non-blocking, fire-and-forget)
  useEffect(() => {
    (async () => {
      const cached = await loadCachedCatalog();
      // Only use cache if fresh data hasn't arrived yet
      if (!freshLoaded.current && cached && cached.products.length > 0) {
        setAllProducts(cached.products);
        setIsFromCache(true);
        setIsInitialLoading(false);
      }
    })();
  }, []);

  // Step 2: "Fetch" fresh data after simulated network delay
  // (currently mock PRODUCTS; will be replaced by Wix API call)
  useEffect(() => {
    const timer = setTimeout(() => {
      freshLoaded.current = true;
      setAllProducts(PRODUCTS);
      setIsFromCache(false);
      setIsInitialLoading(false);
      // Cache fresh data for offline use
      saveCatalog(PRODUCTS);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Product names for autocomplete (derived from current product set)
  const productNames = useMemo(() => allProducts.map((p) => p.name), [allProducts]);

  // Autocomplete suggestions from product names
  const suggestions = useMemo(
    () => (searchQuery.trim().length >= 2 ? getSuggestions(searchQuery, productNames, 5) : []),
    [searchQuery, productNames],
  );

  // Filter and sort products
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
          // In mock, reverse order simulates newest
          result.reverse();
          break;
        case 'featured':
        default:
          // Default order (bestsellers first via badge, then by review count)
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

  // Paginated slice
  const products = useMemo(() => filteredSorted.slice(0, page * PAGE_SIZE), [filteredSorted, page]);

  const hasMore = products.length < filteredSorted.length;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    setIsLoading(true);
    // Simulate network delay for realistic feel
    setTimeout(() => {
      setPage((p) => p + 1);
      setIsLoading(false);
    }, 300);
  }, [hasMore, isLoading]);

  const refresh = useCallback(() => {
    setPage(1);
    setIsLoading(false);
    // Re-fetch and re-cache
    freshLoaded.current = true;
    setAllProducts(PRODUCTS);
    setIsFromCache(false);
    saveCatalog(PRODUCTS);
  }, []);

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
    products: isInitialLoading ? [] : products,
    categories: CATEGORIES,
    searchQuery,
    selectedCategory,
    sortBy,
    isLoading,
    isInitialLoading,
    hasMore,
    suggestions,
    isFromCache,
    setSearchQuery: handleSearchQuery,
    setSelectedCategory: handleCategory,
    setSortBy: handleSort,
    loadMore,
    refresh,
  };
}
