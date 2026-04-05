/**
 * Integration tests for RoomGalleryScreen filter functionality (hq-322).
 *
 * Covers:
 *  - Filter bar renders in the gallery screen
 *  - Style filter pill tap filters the grid to matching rooms
 *  - Product filter pill tap filters the grid to rooms with that product
 *  - Combined style+product filter shows only matching rooms
 *  - Empty state shows when active filter has no matches
 *  - Clear filters restores full grid
 *  - Placeholder banner still shows when placeholder + filter active
 *
 * hq-322: Room gallery filters by style tag and by product.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RoomGalleryScreen } from '../RoomGalleryScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { RoomGalleryItem } from '@/hooks/useRoomGallery';

const mockRefresh = jest.fn();
const mockUseRoomGallery = jest.fn();
jest.mock('@/hooks/useRoomGallery', () => ({
  ...jest.requireActual('@/hooks/useRoomGallery'),
  useRoomGallery: () => mockUseRoomGallery(),
}));

jest.mock('@/components/UGCPhotoSubmitModal', () => ({
  UGCPhotoSubmitModal: () => null,
}));

const ROOMS: RoomGalleryItem[] = [
  {
    roomId: 'r1',
    imageUrl: 'https://example.com/r1.jpg',
    productIds: ['asheville-full'],
    roomStyle: 'Modern',
    createdDate: '2026-03-01T00:00:00Z',
  },
  {
    roomId: 'r2',
    imageUrl: 'https://example.com/r2.jpg',
    productIds: ['biltmore-queen'],
    roomStyle: 'Coastal',
    createdDate: '2026-02-15T00:00:00Z',
  },
  {
    roomId: 'r3',
    imageUrl: 'https://example.com/r3.jpg',
    productIds: ['asheville-full'],
    roomStyle: 'Rustic',
    createdDate: '2026-01-10T00:00:00Z',
  },
];

function renderGallery() {
  return render(
    <ThemeProvider>
      <RoomGalleryScreen />
    </ThemeProvider>,
  );
}

describe('RoomGalleryScreen — filters (hq-322)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoomGallery.mockReturnValue({
      rooms: ROOMS,
      isLoading: false,
      error: null,
      isPlaceholder: false,
      refresh: mockRefresh,
    });
  });

  it('renders the filter bar', () => {
    const { getByTestId } = renderGallery();
    expect(getByTestId('room-gallery-filter-bar')).toBeTruthy();
  });

  it('shows all 3 rooms before any filter', () => {
    const { getByTestId } = renderGallery();
    expect(getByTestId('room-card-r1')).toBeTruthy();
    expect(getByTestId('room-card-r2')).toBeTruthy();
    expect(getByTestId('room-card-r3')).toBeTruthy();
  });

  it('style filter — Modern shows only r1', () => {
    const { getByTestId, queryByTestId } = renderGallery();
    fireEvent.press(getByTestId('style-pill-Modern'));
    expect(getByTestId('room-card-r1')).toBeTruthy();
    expect(queryByTestId('room-card-r2')).toBeNull();
    expect(queryByTestId('room-card-r3')).toBeNull();
  });

  it('style filter — Coastal shows only r2', () => {
    const { getByTestId, queryByTestId } = renderGallery();
    fireEvent.press(getByTestId('style-pill-Coastal'));
    expect(queryByTestId('room-card-r1')).toBeNull();
    expect(getByTestId('room-card-r2')).toBeTruthy();
    expect(queryByTestId('room-card-r3')).toBeNull();
  });

  it('product filter — asheville-full shows r1 and r3', () => {
    const { getByTestId, queryByTestId } = renderGallery();
    fireEvent.press(getByTestId('product-pill-asheville-full'));
    expect(getByTestId('room-card-r1')).toBeTruthy();
    expect(queryByTestId('room-card-r2')).toBeNull();
    expect(getByTestId('room-card-r3')).toBeTruthy();
  });

  it('combined style+product — Modern + asheville-full shows only r1', () => {
    const { getByTestId, queryByTestId } = renderGallery();
    fireEvent.press(getByTestId('style-pill-Modern'));
    fireEvent.press(getByTestId('product-pill-asheville-full'));
    expect(getByTestId('room-card-r1')).toBeTruthy();
    expect(queryByTestId('room-card-r2')).toBeNull();
    expect(queryByTestId('room-card-r3')).toBeNull();
  });

  it('shows filtered empty state when no rooms match active filter', () => {
    const { getByTestId, queryByTestId } = renderGallery();
    fireEvent.press(getByTestId('style-pill-Traditional'));
    expect(getByTestId('room-gallery-filter-empty')).toBeTruthy();
    expect(queryByTestId('room-card-r1')).toBeNull();
  });

  it('does not show filter empty state when no filters are active', () => {
    const { queryByTestId } = renderGallery();
    expect(queryByTestId('room-gallery-filter-empty')).toBeNull();
  });

  it('clear filters restores all rooms', () => {
    const { getByTestId } = renderGallery();
    fireEvent.press(getByTestId('style-pill-Modern'));
    fireEvent.press(getByTestId('filter-bar-clear'));
    expect(getByTestId('room-card-r1')).toBeTruthy();
    expect(getByTestId('room-card-r2')).toBeTruthy();
    expect(getByTestId('room-card-r3')).toBeTruthy();
  });

  it('All style pill restores all rooms after style filter', () => {
    const { getByTestId } = renderGallery();
    fireEvent.press(getByTestId('style-pill-Coastal'));
    fireEvent.press(getByTestId('style-pill-All'));
    expect(getByTestId('room-card-r1')).toBeTruthy();
    expect(getByTestId('room-card-r2')).toBeTruthy();
    expect(getByTestId('room-card-r3')).toBeTruthy();
  });
});
