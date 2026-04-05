/**
 * @module useRoomGalleryFilters
 *
 * Client-side filter state for the Room Gallery.
 *
 * Takes the full list of `RoomGalleryItem`s fetched by `useRoomGallery` and
 * applies active filters in memory. Supports two independent filters:
 *   - style  — one of Modern | Coastal | Rustic | Traditional (case-sensitive,
 *              matches RoomGalleryItem.roomStyle)
 *   - product — a productId string; matches rooms whose productIds array
 *              contains that ID
 *
 * Both filters are applied with AND logic (a room must satisfy all active
 * filters to be included). Either filter can be cleared independently or
 * both cleared at once via clearFilters().
 *
 * hq-322: Room gallery filters by style tag and by product.
 */

import { useState, useMemo, useCallback } from 'react';
import type { RoomGalleryItem } from './useRoomGallery';

export type RoomGalleryStyle = 'Modern' | 'Coastal' | 'Rustic' | 'Traditional';

export interface RoomGalleryFilters {
  style: RoomGalleryStyle | null;
  productId: string | null;
}

export interface UseRoomGalleryFiltersResult {
  filters: RoomGalleryFilters;
  filteredRooms: RoomGalleryItem[];
  setStyleFilter: (style: RoomGalleryStyle | null) => void;
  setProductFilter: (productId: string | null) => void;
  clearFilters: () => void;
  /** True when at least one filter is active. */
  hasActiveFilters: boolean;
  /**
   * True when active filters produce zero results (no rooms match the current
   * filter combination). Always false when no filters are active.
   */
  isEmpty: boolean;
}

const INITIAL_FILTERS: RoomGalleryFilters = { style: null, productId: null };

/**
 * Manages room gallery filter state and derives the filtered room list.
 *
 * @param rooms — the full, unfiltered list from useRoomGallery
 */
export function useRoomGalleryFilters(rooms: RoomGalleryItem[]): UseRoomGalleryFiltersResult {
  const [filters, setFilters] = useState<RoomGalleryFilters>(INITIAL_FILTERS);

  const setStyleFilter = useCallback((style: RoomGalleryStyle | null) => {
    setFilters((prev) => ({ ...prev, style }));
  }, []);

  const setProductFilter = useCallback((productId: string | null) => {
    setFilters((prev) => ({ ...prev, productId }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const filteredRooms = useMemo(() => {
    let result = rooms;

    if (filters.style !== null) {
      result = result.filter((r) => r.roomStyle === filters.style);
    }

    if (filters.productId !== null) {
      result = result.filter((r) => r.productIds.includes(filters.productId!));
    }

    return result;
  }, [rooms, filters]);

  const hasActiveFilters = filters.style !== null || filters.productId !== null;
  const isEmpty = hasActiveFilters && filteredRooms.length === 0;

  return {
    filters,
    filteredRooms,
    setStyleFilter,
    setProductFilter,
    clearFilters,
    hasActiveFilters,
    isEmpty,
  };
}
