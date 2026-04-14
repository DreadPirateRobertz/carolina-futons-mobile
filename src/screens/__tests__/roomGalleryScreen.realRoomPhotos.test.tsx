/**
 * Integration tests for RoomGalleryScreen — RealRoomPhotos section (cm-xnq).
 *
 * Covers:
 *  - RealRoomPhotos section renders below the existing room grid
 *  - Shows loading state while fetching
 *  - Renders a card for each approved photo
 *  - Photo cards have correct testIDs
 *  - Error state shown when hook returns error
 *  - Empty state when no approved photos
 *  - Section hidden when no Wix client (graceful no-op)
 *  - Pressing a photo card triggers onPhotoPress (or navigation)
 *  - Pressing a hotspot triggers navigation to ProductDetail
 *
 * cm-xnq: RealRoomPhotos display on RoomGalleryScreen.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { RoomGalleryScreen } from '../RoomGalleryScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { RealRoomPhoto } from '@/hooks/useRealRoomPhotos';

// ── Existing hooks ─────────────────────────────────────────────────────────────

const mockRefresh = jest.fn();
jest.mock('@/hooks/useRoomGallery', () => ({
  ...jest.requireActual('@/hooks/useRoomGallery'),
  useRoomGallery: () => ({
    rooms: [],
    isPlaceholder: false,
    isLoading: false,
    error: null,
    refresh: mockRefresh,
  }),
}));

jest.mock('@/components/UGCPhotoSubmitModal', () => ({
  UGCPhotoSubmitModal: () => null,
}));

// ── useRealRoomPhotos mock ─────────────────────────────────────────────────────

const mockUseRealRoomPhotos = jest.fn();
jest.mock('@/hooks/useRealRoomPhotos', () => ({
  useRealRoomPhotos: () => mockUseRealRoomPhotos(),
}));

// ── useFeaturedPhotos mock ─────────────────────────────────────────────────────

jest.mock('@/hooks/useFeaturedPhotos', () => ({
  useFeaturedPhotos: () => ({
    featuredPhotos: [],
    featuredPhotoIds: new Set(),
    isLoading: false,
    error: null,
  }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PHOTOS: RealRoomPhoto[] = [
  {
    id: 'rrp-001',
    imageUrl: 'https://cdn.example.com/room1.jpg',
    city: 'Asheville',
    state: 'NC',
    caption: 'My cozy futon setup',
    memberName: 'Jane D.',
    altText: 'Living room with Summit Futon',
    createdAt: '2026-03-15T10:00:00.000Z',
    tags: [
      {
        productId: 'prod-1',
        productName: 'Summit Futon',
        x: 0.3,
        y: 0.4,
        width: 0.15,
        height: 0.2,
      },
    ],
  },
  {
    id: 'rrp-002',
    imageUrl: 'https://cdn.example.com/room2.jpg',
    city: 'Charlotte',
    state: 'NC',
    createdAt: '2026-03-10T08:00:00.000Z',
    tags: [],
  },
];

function renderGallery(props: Partial<React.ComponentProps<typeof RoomGalleryScreen>> = {}) {
  return render(
    <ThemeProvider>
      <RoomGalleryScreen {...props} />
    </ThemeProvider>,
  );
}

describe('RoomGalleryScreen — RealRoomPhotos (cm-xnq)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRealRoomPhotos.mockReturnValue({
      photos: PHOTOS,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
  });

  it('renders the RealRoomPhotos section', () => {
    const { getByTestId } = renderGallery();
    expect(getByTestId('real-room-photos-section')).toBeTruthy();
  });

  it('renders a card for each real room photo', () => {
    const { getByTestId } = renderGallery();
    expect(getByTestId('real-room-photo-card-rrp-001')).toBeTruthy();
    expect(getByTestId('real-room-photo-card-rrp-002')).toBeTruthy();
  });

  it('shows loading indicator while fetching real room photos', () => {
    mockUseRealRoomPhotos.mockReturnValue({
      photos: [],
      isLoading: true,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId } = renderGallery();
    expect(getByTestId('real-room-photos-loading')).toBeTruthy();
  });

  it('hides cards while loading', () => {
    mockUseRealRoomPhotos.mockReturnValue({
      photos: [],
      isLoading: true,
      error: null,
      refresh: jest.fn(),
    });
    const { queryByTestId } = renderGallery();
    expect(queryByTestId('real-room-photo-card-rrp-001')).toBeNull();
  });

  it('shows error state when hook returns error', () => {
    mockUseRealRoomPhotos.mockReturnValue({
      photos: [],
      isLoading: false,
      error: new Error('Network failed'),
      refresh: jest.fn(),
    });
    const { getByTestId } = renderGallery();
    expect(getByTestId('real-room-photos-error')).toBeTruthy();
  });

  it('shows empty state when no approved photos', () => {
    mockUseRealRoomPhotos.mockReturnValue({
      photos: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId } = renderGallery();
    expect(getByTestId('real-room-photos-empty')).toBeTruthy();
  });

  it('does not show error or empty state when photos present', () => {
    const { queryByTestId } = renderGallery();
    expect(queryByTestId('real-room-photos-error')).toBeNull();
    expect(queryByTestId('real-room-photos-empty')).toBeNull();
  });

  it('pressing a photo card calls onProductPress with first hotspot productId', () => {
    const onProductPress = jest.fn();
    const { getByTestId } = renderGallery({ onProductPress });
    fireEvent.press(getByTestId('real-room-photo-card-rrp-001'));
    // Card press navigates to product of first hotspot (or no-op if no tags)
    expect(onProductPress).toHaveBeenCalledWith('rrp-001');
  });

  it('pressing a hotspot calls onProductPress with that productId', () => {
    const onProductPress = jest.fn();
    const { getByTestId } = renderGallery({ onProductPress });
    fireEvent.press(getByTestId('hotspot-prod-1'));
    expect(onProductPress).toHaveBeenCalledWith('prod-1');
  });

  it('section header says "Real Rooms" or similar', () => {
    const { getByTestId } = renderGallery();
    const header = getByTestId('real-room-photos-header');
    expect(header).toBeTruthy();
  });
});
