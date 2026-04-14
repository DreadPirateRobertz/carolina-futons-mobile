/**
 * TDD tests for useRoomGalleryFilters hook.
 *
 * Covers:
 *  - No filters → returns all rooms unchanged
 *  - Filter by style — matches, no matches, partial matches
 *  - Filter by productId — matches rooms whose productIds include it
 *  - Combined style + productId filter (AND logic)
 *  - setStyleFilter / setProductFilter update filteredRooms
 *  - clearFilters resets both active filters
 *  - hasActiveFilters true when any filter set, false when both clear
 *  - isEmpty true when filtered result is empty, false otherwise
 *  - Re-filters when source rooms array changes
 *  - Style values: Modern | Coastal | Rustic | Traditional
 *
 * hq-322: Room gallery filters by style tag and by product.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useRoomGalleryFilters, type RoomGalleryStyle } from '../useRoomGalleryFilters';
import type { RoomGalleryItem } from '../useRoomGallery';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeRoom(roomId: string, roomStyle: string, productIds: string[]): RoomGalleryItem {
  return {
    roomId,
    imageUrl: `https://example.com/${roomId}.jpg`,
    productIds,
    roomStyle,
    createdDate: '2026-01-01T00:00:00Z',
    memberName: 'Test User',
    city: 'Charlotte',
    state: 'NC',
    caption: roomStyle,
    slug: roomId,
    altText: '',
    tags: productIds.map((pid) => ({
      productId: pid,
      productName: pid,
      x: 0.5,
      y: 0.5,
      width: 0.1,
      height: 0.1,
    })),
  };
}

const MODERN_P1 = makeRoom('r1', 'Modern', ['p1', 'p2']);
const COASTAL_P1 = makeRoom('r2', 'Coastal', ['p1', 'p3']);
const RUSTIC_P2 = makeRoom('r3', 'Rustic', ['p2']);
const TRADITIONAL_P3 = makeRoom('r4', 'Traditional', ['p3']);
const MODERN_P3 = makeRoom('r5', 'Modern', ['p3']);

const ALL_ROOMS = [MODERN_P1, COASTAL_P1, RUSTIC_P2, TRADITIONAL_P3, MODERN_P3];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useRoomGalleryFilters', () => {
  describe('initial state', () => {
    it('returns all rooms when no filters are active', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      expect(result.current.filteredRooms).toEqual(ALL_ROOMS);
    });

    it('starts with no active filters', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      expect(result.current.filters.style).toBeNull();
      expect(result.current.filters.productId).toBeNull();
    });

    it('hasActiveFilters is false initially', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      expect(result.current.hasActiveFilters).toBe(false);
    });

    it('isEmpty is false when rooms array is non-empty and no filter set', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      expect(result.current.isEmpty).toBe(false);
    });

    it('isEmpty is false when rooms array is empty and no filter set', () => {
      const { result } = renderHook(() => useRoomGalleryFilters([]));
      expect(result.current.isEmpty).toBe(false);
    });
  });

  describe('setStyleFilter', () => {
    it('filters by Modern style', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setStyleFilter('Modern'));
      expect(result.current.filteredRooms).toEqual([MODERN_P1, MODERN_P3]);
    });

    it('filters by Coastal style', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setStyleFilter('Coastal'));
      expect(result.current.filteredRooms).toEqual([COASTAL_P1]);
    });

    it('filters by Rustic style', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setStyleFilter('Rustic'));
      expect(result.current.filteredRooms).toEqual([RUSTIC_P2]);
    });

    it('filters by Traditional style', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setStyleFilter('Traditional'));
      expect(result.current.filteredRooms).toEqual([TRADITIONAL_P3]);
    });

    it('sets isEmpty when no rooms match the style', () => {
      const rooms = [MODERN_P1, RUSTIC_P2];
      const { result } = renderHook(() => useRoomGalleryFilters(rooms));
      act(() => result.current.setStyleFilter('Coastal'));
      expect(result.current.filteredRooms).toEqual([]);
      expect(result.current.isEmpty).toBe(true);
    });

    it('sets hasActiveFilters to true', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setStyleFilter('Modern'));
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('updates filters.style', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setStyleFilter('Rustic'));
      expect(result.current.filters.style).toBe('Rustic');
    });

    it('calling setStyleFilter(null) clears the style filter', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setStyleFilter('Modern'));
      act(() => result.current.setStyleFilter(null));
      expect(result.current.filteredRooms).toEqual(ALL_ROOMS);
      expect(result.current.filters.style).toBeNull();
    });
  });

  describe('setProductFilter', () => {
    it('filters rooms whose productIds include the given productId', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setProductFilter('p1'));
      expect(result.current.filteredRooms).toEqual([MODERN_P1, COASTAL_P1]);
    });

    it('filters by p2', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setProductFilter('p2'));
      expect(result.current.filteredRooms).toEqual([MODERN_P1, RUSTIC_P2]);
    });

    it('filters by p3', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setProductFilter('p3'));
      expect(result.current.filteredRooms).toEqual([COASTAL_P1, TRADITIONAL_P3, MODERN_P3]);
    });

    it('sets isEmpty when no rooms match the productId', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setProductFilter('p999'));
      expect(result.current.filteredRooms).toEqual([]);
      expect(result.current.isEmpty).toBe(true);
    });

    it('sets hasActiveFilters to true', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setProductFilter('p1'));
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('updates filters.productId', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setProductFilter('p2'));
      expect(result.current.filters.productId).toBe('p2');
    });

    it('calling setProductFilter(null) clears the product filter', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setProductFilter('p1'));
      act(() => result.current.setProductFilter(null));
      expect(result.current.filteredRooms).toEqual(ALL_ROOMS);
      expect(result.current.filters.productId).toBeNull();
    });
  });

  describe('combined style + product filters (AND logic)', () => {
    it('applies both filters — intersection of matches', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setStyleFilter('Modern'));
      act(() => result.current.setProductFilter('p1'));
      // Only MODERN_P1 matches both Modern style AND has p1
      expect(result.current.filteredRooms).toEqual([MODERN_P1]);
    });

    it('is empty when no room matches both filters', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setStyleFilter('Rustic'));
      act(() => result.current.setProductFilter('p3'));
      // RUSTIC_P2 has p2 (not p3); TRADITIONAL_P3 + MODERN_P3 have p3 (not Rustic)
      expect(result.current.filteredRooms).toEqual([]);
      expect(result.current.isEmpty).toBe(true);
    });

    it('hasActiveFilters true when both set', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setStyleFilter('Coastal'));
      act(() => result.current.setProductFilter('p1'));
      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  describe('clearFilters', () => {
    it('resets style filter to null', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setStyleFilter('Modern'));
      act(() => result.current.clearFilters());
      expect(result.current.filters.style).toBeNull();
    });

    it('resets productId filter to null', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setProductFilter('p1'));
      act(() => result.current.clearFilters());
      expect(result.current.filters.productId).toBeNull();
    });

    it('returns all rooms after clearing combined filters', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setStyleFilter('Modern'));
      act(() => result.current.setProductFilter('p1'));
      act(() => result.current.clearFilters());
      expect(result.current.filteredRooms).toEqual(ALL_ROOMS);
    });

    it('sets hasActiveFilters to false after clear', () => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      act(() => result.current.setStyleFilter('Rustic'));
      act(() => result.current.clearFilters());
      expect(result.current.hasActiveFilters).toBe(false);
    });

    it('sets isEmpty to false after clearing filter that produced empty result', () => {
      const rooms = [MODERN_P1];
      const { result } = renderHook(() => useRoomGalleryFilters(rooms));
      act(() => result.current.setStyleFilter('Coastal'));
      expect(result.current.isEmpty).toBe(true);
      act(() => result.current.clearFilters());
      expect(result.current.isEmpty).toBe(false);
    });
  });

  describe('source rooms array changes', () => {
    it('re-applies active filter when rooms prop changes', () => {
      const { result, rerender } = renderHook(
        ({ rooms }: { rooms: RoomGalleryItem[] }) => useRoomGalleryFilters(rooms),
        { initialProps: { rooms: [MODERN_P1, COASTAL_P1] } },
      );
      act(() => result.current.setStyleFilter('Modern'));
      expect(result.current.filteredRooms).toEqual([MODERN_P1]);

      // New rooms loaded (e.g. after Wix refresh)
      rerender({ rooms: [MODERN_P1, RUSTIC_P2, MODERN_P3] });
      // Filter still 'Modern', should now match MODERN_P1 and MODERN_P3
      expect(result.current.filteredRooms).toEqual([MODERN_P1, MODERN_P3]);
    });

    it('isEmpty updates when source rooms change', () => {
      const { result, rerender } = renderHook(
        ({ rooms }: { rooms: RoomGalleryItem[] }) => useRoomGalleryFilters(rooms),
        { initialProps: { rooms: [COASTAL_P1] } },
      );
      act(() => result.current.setStyleFilter('Modern'));
      expect(result.current.isEmpty).toBe(true);

      rerender({ rooms: [COASTAL_P1, MODERN_P1] });
      expect(result.current.isEmpty).toBe(false);
    });
  });

  describe('style values', () => {
    const styles: RoomGalleryStyle[] = ['Modern', 'Coastal', 'Rustic', 'Traditional'];

    it.each(styles)('accepts %s as a valid style filter', (style) => {
      const { result } = renderHook(() => useRoomGalleryFilters(ALL_ROOMS));
      expect(() => act(() => result.current.setStyleFilter(style))).not.toThrow();
      expect(result.current.filters.style).toBe(style);
    });
  });
});
