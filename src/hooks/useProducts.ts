import { useState, useMemo, useCallback } from 'react';
import {
  PRODUCTS,
  CATEGORIES,
  type Product,
  type ProductCategory,
  type SortOption,
  type CategoryInfo,
} from '@/data/products';

export type { Product, ProductCategory, SortOption, CategoryInfo };
import { fuzzySearch, getSuggestions } from '@/utils/fuzzySearch';

// Re-export types for screens — avoids direct src/data imports
export type { Product, ProductCategory, SortOption };

const PAGE_SIZE = 8;
const PRODUCT_NAMES = PRODUCTS.map((p) => p.name);

const getSearchableText = (p: Product) => [p.name, p.shortDescription, p.category];

interface UseProductsReturn {
  products: Product[];
  categories: CategoryInfo[];
  searchQuery: string;
  selectedCategory: ProductCategory | null;
  sortBy: SortOption;
  isLoading: boolean;
  hasMore: boolean;
  /** Autocomplete suggestions for current query */
  suggestions: string[];
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
 * Uses local mock data; designed for drop-in Wix CMS API replacement.
 */
export function useProducts(options?: UseProductsOptions): UseProductsReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(
    options?.initialCategory ?? null,
  );
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Autocomplete suggestions from product names
  const suggestions = useMemo(
    () => (searchQuery.trim().length >= 2 ? getSuggestions(searchQuery, PRODUCT_NAMES, 5) : []),
    [searchQuery],
  );

  // Filter and sort products
  const filteredSorted = useMemo(() => {
    let result: Product[];

    // Fuzzy search filter
    if (searchQuery.trim()) {
      result = fuzzySearch(PRODUCTS, searchQuery, getSearchableText).map((r) => r.item);
    } else {
      result = [...PRODUCTS];
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
  }, [searchQuery, selectedCategory, sortBy]);

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
    products,
    categories: CATEGORIES,
    searchQuery,
    selectedCategory,
    sortBy,
    isLoading,
    hasMore,
    suggestions,
    setSearchQuery: handleSearchQuery,
    setSelectedCategory: handleCategory,
    setSortBy: handleSort,
    loadMore,
    refresh,
  };
}
