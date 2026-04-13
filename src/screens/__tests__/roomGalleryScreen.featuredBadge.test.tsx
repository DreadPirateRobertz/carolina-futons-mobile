/**
 * Tests for hq-s25: Featured badge overlay + featured-only filter toggle
 * in RoomGalleryScreen.
 *
 * AC:
 *  - Featured badge shows on featured rooms
 *  - Filter toggle for featured-only view
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RoomGalleryScreen } from '../RoomGalleryScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { RoomGalleryItem } from '@/hooks/useRoomGallery';

const mockRefresh = jest.fn();

jest.mock('@/hooks/useRoomGallery', () => ({
  useRoomGallery: () => ({
    rooms: MOCK_ROOMS,
    isLoading: false,
    error: null,
    refresh: mockRefresh,
    isPlaceholder: false,
  }),
}));

jest.mock('@/hooks/useFeaturedPhotos', () => ({
  useFeaturedPhotos: () => ({
    featuredPhotos: [],
    featuredPhotoIds: new Set<string>(),
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@/components/UGCPhotoSubmitModal', () => ({
  UGCPhotoSubmitModal: () => null,
}));

jest.mock('@/hooks/useRoomGalleryFilters', () =>
  jest.requireActual('@/hooks/useRoomGalleryFilters'),
);

function makeRoom(overrides: Partial<RoomGalleryItem>): RoomGalleryItem {
  return {
    roomId: 'r0',
    imageUrl: 'https://cdn.example.com/room0.jpg',
    productIds: [],
    roomStyle: '',
    createdDate: '2026-01-01T00:00:00Z',
    memberName: 'Test User',
    city: 'Charlotte',
    state: 'NC',
    caption: '',
    slug: 'r0',
    altText: '',
    tags: [],
    ...overrides,
  };
}

const MOCK_ROOMS: RoomGalleryItem[] = [
  makeRoom({
    roomId: 'room-001',
    imageUrl: 'https://cdn.example.com/room1.jpg',
    productIds: ['asheville-full'],
    roomStyle: 'Modern',
    createdDate: '2026-03-01T00:00:00Z',
    featured: true,
    tags: [{ productId: 'asheville-full', productName: 'Asheville Full', x: 0.5, y: 0.5, width: 0.1, height: 0.1 }],
  }),
  makeRoom({
    roomId: 'room-002',
    imageUrl: 'https://cdn.example.com/room2.jpg',
    productIds: ['biltmore-queen'],
    roomStyle: 'Coastal',
    createdDate: '2026-03-02T00:00:00Z',
    featured: false,
    tags: [{ productId: 'biltmore-queen', productName: 'Biltmore Queen', x: 0.5, y: 0.5, width: 0.1, height: 0.1 }],
  }),
  makeRoom({
    roomId: 'room-003',
    imageUrl: 'https://cdn.example.com/room3.jpg',
    productIds: ['blue-ridge-full'],
    roomStyle: 'Rustic',
    createdDate: '2026-03-03T00:00:00Z',
    featured: true,
    tags: [{ productId: 'blue-ridge-full', productName: 'Blue Ridge Full', x: 0.5, y: 0.5, width: 0.1, height: 0.1 }],
  }),
];

function renderGallery(props: Partial<React.ComponentProps<typeof RoomGalleryScreen>> = {}) {
  return render(
    <ThemeProvider>
      <RoomGalleryScreen {...props} />
    </ThemeProvider>,
  );
}

describe('RoomGalleryScreen — featured badge + filter (hq-s25)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Featured badge rendering', () => {
    it('shows featured badge on room-001 (featured=true)', () => {
      const { getByTestId } = renderGallery();
      expect(getByTestId('featured-badge-room-001')).toBeTruthy();
    });

    it('shows featured badge on room-003 (featured=true)', () => {
      const { getByTestId } = renderGallery();
      expect(getByTestId('featured-badge-room-003')).toBeTruthy();
    });

    it('does NOT show featured badge on room-002 (featured=false)', () => {
      const { queryByTestId } = renderGallery();
      expect(queryByTestId('featured-badge-room-002')).toBeNull();
    });

    it('featured badge has accessible label', () => {
      const { getByTestId } = renderGallery();
      const badge = getByTestId('featured-badge-room-001');
      expect(badge.props.accessibilityLabel).toMatch(/featured/i);
    });
  });

  describe('Featured-only filter toggle', () => {
    it('renders featured filter toggle', () => {
      const { getByTestId } = renderGallery();
      expect(getByTestId('filter-featured-toggle')).toBeTruthy();
    });

    it('featured toggle is inactive by default', () => {
      const { getByTestId } = renderGallery();
      const toggle = getByTestId('filter-featured-toggle');
      expect(toggle.props.accessibilityState?.selected).toBe(false);
    });

    it('tapping featured toggle activates it', () => {
      const { getByTestId } = renderGallery();
      fireEvent.press(getByTestId('filter-featured-toggle'));
      const toggle = getByTestId('filter-featured-toggle');
      expect(toggle.props.accessibilityState?.selected).toBe(true);
    });

    it('shows only featured rooms when toggle is active', () => {
      const { getByTestId, queryByTestId } = renderGallery();
      fireEvent.press(getByTestId('filter-featured-toggle'));
      expect(getByTestId('room-card-room-001')).toBeTruthy();
      expect(getByTestId('room-card-room-003')).toBeTruthy();
      expect(queryByTestId('room-card-room-002')).toBeNull();
    });

    it('shows all rooms when featured toggle is inactive', () => {
      const { getByTestId } = renderGallery();
      // Default: all rooms visible
      expect(getByTestId('room-card-room-001')).toBeTruthy();
      expect(getByTestId('room-card-room-002')).toBeTruthy();
      expect(getByTestId('room-card-room-003')).toBeTruthy();
    });

    it('tapping active toggle deactivates it and restores all rooms', () => {
      const { getByTestId } = renderGallery();
      fireEvent.press(getByTestId('filter-featured-toggle'));
      fireEvent.press(getByTestId('filter-featured-toggle'));
      expect(getByTestId('room-card-room-001')).toBeTruthy();
      expect(getByTestId('room-card-room-002')).toBeTruthy();
      expect(getByTestId('room-card-room-003')).toBeTruthy();
    });

    it('featured filter combines with style filter', () => {
      const { getByTestId, queryByTestId } = renderGallery();
      fireEvent.press(getByTestId('filter-featured-toggle'));
      fireEvent.press(getByTestId('style-pill-Modern'));
      // Only featured AND Modern
      expect(getByTestId('room-card-room-001')).toBeTruthy();
      expect(queryByTestId('room-card-room-003')).toBeNull(); // Rustic, not Modern
      expect(queryByTestId('room-card-room-002')).toBeNull(); // not featured
    });
  });

  describe('Empty state when featured filter yields nothing', () => {
    it('shows empty state when no featured rooms match', () => {
      const nonFeaturedRooms: RoomGalleryItem[] = [
        { ...MOCK_ROOMS[1], roomId: 'only-non-featured' },
      ];
      jest.spyOn(require('@/hooks/useRoomGallery'), 'useRoomGallery').mockReturnValue({
        rooms: nonFeaturedRooms,
        isLoading: false,
        error: null,
        refresh: mockRefresh,
        isPlaceholder: false,
      });
      const { getByTestId } = renderGallery();
      fireEvent.press(getByTestId('filter-featured-toggle'));
      expect(getByTestId('room-gallery-filter-empty')).toBeTruthy();
    });
  });
});
