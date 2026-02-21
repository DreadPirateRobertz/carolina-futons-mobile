import { useState, useMemo, useCallback } from 'react';
import {
  PRODUCTS,
  CATEGORIES,
  type Product,
  type ProductCategory,
  type SortOption,
  type CategoryInfo,
} from '@/data/products';

const PAGE_SIZE = 8;

interface UseProductsReturn {
  products: Product[];
  categories: CategoryInfo[];
  searchQuery: string;
  selectedCategory: ProductCategory | null;
  sortBy: SortOption;
  isLoading: boolean;
  hasMore: boolean;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: ProductCategory | null) => void;
  setSortBy: (sort: SortOption) => void;
  loadMore: () => void;
  refresh: () => void;
}

/**
 * Product browsing hook with search, filter, sort, and pagination.
 * Uses local mock data; designed for drop-in Wix CMS API replacement.
 */
export function useProducts(): UseProductsReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Filter and sort products
  const filteredSorted = useMemo(() => {
    let result = [...PRODUCTS];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Sort
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
    setSearchQuery: handleSearchQuery,
    setSelectedCategory: handleCategory,
    setSortBy: handleSort,
    loadMore,
    refresh,
  };
}
