import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RoomGalleryScreen } from '../RoomGalleryScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { RoomGalleryItem } from '@/hooks/useRoomGallery';
import { PLACEHOLDER_ROOMS } from '@/hooks/useRoomGallery';

// Mock useRoomGallery so screen tests control the data layer.
// Spread requireActual so PLACEHOLDER_ROOMS constant is available.
const mockRefresh = jest.fn();
const mockUseRoomGallery = jest.fn();
jest.mock('@/hooks/useRoomGallery', () => ({
  ...jest.requireActual('@/hooks/useRoomGallery'),
  useRoomGallery: () => mockUseRoomGallery(),
}));

// UGCPhotoSubmitModal is wired into RoomGalleryScreen — mock it out so
// RoomGalleryScreen tests don't need to set up its full dependency chain
// (useAuth, wixClient, expo-image-picker, etc.).
jest.mock('@/components/UGCPhotoSubmitModal', () => ({
  UGCPhotoSubmitModal: () => null,
}));

const SAMPLE_ROOMS: RoomGalleryItem[] = [
  {
    roomId: 'room-001',
    imageUrl: 'https://static.wixstatic.com/media/e04e89_abc123',
    productIds: ['asheville-full', 'biltmore-queen'],
    roomStyle: 'Modern',
    createdDate: '2026-03-01T00:00:00Z',
  },
  {
    roomId: 'room-002',
    imageUrl: 'https://static.wixstatic.com/media/e04e89_def456',
    productIds: ['blue-ridge-full'],
    roomStyle: 'Coastal',
    createdDate: '2026-02-15T00:00:00Z',
  },
];

function renderGallery(props: Partial<React.ComponentProps<typeof RoomGalleryScreen>> = {}) {
  return render(
    <ThemeProvider>
      <RoomGalleryScreen {...props} />
    </ThemeProvider>,
  );
}

describe('RoomGalleryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoomGallery.mockReturnValue({
      rooms: SAMPLE_ROOMS,
      isPlaceholder: false,
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
  });

  describe('Loading state', () => {
    it('shows loading indicator while fetching', () => {
      mockUseRoomGallery.mockReturnValue({
        rooms: [],
        isLoading: true,
        error: null,
        refresh: mockRefresh,
      });
      const { getByTestId } = renderGallery();
      expect(getByTestId('skeleton-room-grid')).toBeTruthy();
    });

    it('does not show grid while loading', () => {
      mockUseRoomGallery.mockReturnValue({
        rooms: [],
        isLoading: true,
        error: null,
        refresh: mockRefresh,
      });
      const { queryByTestId } = renderGallery();
      expect(queryByTestId('room-gallery-grid')).toBeNull();
    });
  });

  describe('Empty state', () => {
    it('shows empty state when no rooms', () => {
      mockUseRoomGallery.mockReturnValue({
        rooms: [],
        isLoading: false,
        error: null,
        refresh: mockRefresh,
      });
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-gallery-empty')).toBeTruthy();
    });

    it('does not show grid in empty state', () => {
      mockUseRoomGallery.mockReturnValue({
        rooms: [],
        isLoading: false,
        error: null,
        refresh: mockRefresh,
      });
      const { queryByTestId } = renderGallery();
      expect(queryByTestId('room-gallery-grid')).toBeNull();
    });
  });

  describe('Error state', () => {
    it('shows error message on API failure', () => {
      mockUseRoomGallery.mockReturnValue({
        rooms: [],
        isLoading: false,
        error: new Error('Network error'),
        refresh: mockRefresh,
      });
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-gallery-error')).toBeTruthy();
    });

    it('shows retry button on error', () => {
      mockUseRoomGallery.mockReturnValue({
        rooms: [],
        isLoading: false,
        error: new Error('Network error'),
        refresh: mockRefresh,
      });
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-gallery-retry')).toBeTruthy();
    });

    it('calls refresh when retry button pressed', () => {
      mockUseRoomGallery.mockReturnValue({
        rooms: [],
        isLoading: false,
        error: new Error('Network error'),
        refresh: mockRefresh,
      });
      const { getByTestId } = renderGallery();
      fireEvent.press(getByTestId('room-gallery-retry'));
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('shows branded mountain illustration on error', () => {
      mockUseRoomGallery.mockReturnValue({
        rooms: [],
        isLoading: false,
        error: new Error('Network error'),
        refresh: mockRefresh,
      });
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-gallery-error-illustration')).toBeTruthy();
    });

    it('does not show raw error string in error state', () => {
      mockUseRoomGallery.mockReturnValue({
        rooms: [],
        isLoading: false,
        error: new Error('Network error'),
        refresh: mockRefresh,
      });
      const { queryByText } = renderGallery();
      expect(queryByText('Unable to load gallery. Check your connection.')).toBeNull();
    });

    it('shows friendly error copy in error state', () => {
      mockUseRoomGallery.mockReturnValue({
        rooms: [],
        isLoading: false,
        error: new Error('Network error'),
        refresh: mockRefresh,
      });
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-gallery-error')).toBeTruthy();
    });
  });

  describe('Grid with rooms', () => {
    it('renders the gallery grid', () => {
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-gallery-grid')).toBeTruthy();
    });

    it('renders a card for each room', () => {
      const { getByTestId } = renderGallery();
      for (const room of SAMPLE_ROOMS) {
        expect(getByTestId(`room-card-${room.roomId}`)).toBeTruthy();
      }
    });

    it('renders room image for each card', () => {
      const { getByTestId } = renderGallery();
      for (const room of SAMPLE_ROOMS) {
        expect(getByTestId(`room-image-${room.roomId}`)).toBeTruthy();
      }
    });

    it('displays roomStyle label on each card', () => {
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-style-room-001').props.children).toBe('Modern');
      expect(getByTestId('room-style-room-002').props.children).toBe('Coastal');
    });

    it('shows product count badge on each card', () => {
      const { getByTestId } = renderGallery();
      // room-001 has 2 products
      expect(getByTestId('room-product-count-room-001')).toBeTruthy();
    });

    it('does not show placeholder banner when real rooms are displayed', () => {
      const { queryByTestId } = renderGallery();
      expect(queryByTestId('room-gallery-placeholder-banner')).toBeNull();
    });

    it('does not show CTA in empty state', () => {
      mockUseRoomGallery.mockReturnValue({
        rooms: [],
        isPlaceholder: false,
        isLoading: false,
        error: null,
        refresh: mockRefresh,
      });
      const { queryByTestId } = renderGallery();
      expect(queryByTestId('room-gallery-share-cta')).toBeNull();
    });
  });

  describe('Product tap navigation', () => {
    it('calls onProductPress with first productId when card tapped', () => {
      const onProductPress = jest.fn();
      const { getByTestId } = renderGallery({ onProductPress });
      fireEvent.press(getByTestId('room-card-room-001'));
      expect(onProductPress).toHaveBeenCalledWith('asheville-full');
    });

    it('calls onProductPress for second room with its productId', () => {
      const onProductPress = jest.fn();
      const { getByTestId } = renderGallery({ onProductPress });
      fireEvent.press(getByTestId('room-card-room-002'));
      expect(onProductPress).toHaveBeenCalledWith('blue-ridge-full');
    });

    it('does not throw when onProductPress not provided', () => {
      const { getByTestId } = renderGallery();
      expect(() => fireEvent.press(getByTestId('room-card-room-001'))).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('room cards have accessibility labels', () => {
      const { getByTestId } = renderGallery();
      const card = getByTestId('room-card-room-001');
      expect(card.props.accessibilityLabel).toBeDefined();
      expect(card.props.accessibilityLabel).toContain('Modern');
    });

    it('room cards have button accessibility role', () => {
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-card-room-001').props.accessibilityRole).toBe('button');
    });
  });

  describe('Default testID', () => {
    it('renders with default screen testID', () => {
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-gallery-screen')).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = renderGallery({ testID: 'my-gallery' });
      expect(getByTestId('my-gallery')).toBeTruthy();
    });
  });

  // ── cm-biz: placeholder rooms + upload CTA ─────────────────────────────────

  describe('Placeholder state', () => {
    beforeEach(() => {
      mockUseRoomGallery.mockReturnValue({
        rooms: PLACEHOLDER_ROOMS,
        isPlaceholder: true,
        isLoading: false,
        error: null,
        refresh: mockRefresh,
      });
    });

    it('renders placeholder room photos when no real data', () => {
      const { getByTestId } = renderGallery();
      expect(getByTestId(`room-card-${PLACEHOLDER_ROOMS[0].roomId}`)).toBeTruthy();
    });

    it('renders all placeholder rooms', () => {
      const { getByTestId } = renderGallery();
      for (const room of PLACEHOLDER_ROOMS) {
        expect(getByTestId(`room-card-${room.roomId}`)).toBeTruthy();
      }
    });

    it('shows placeholder banner label when isPlaceholder is true', () => {
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-gallery-placeholder-banner')).toBeTruthy();
    });

    it('does not show empty state when placeholder rooms present', () => {
      const { queryByTestId } = renderGallery();
      expect(queryByTestId('room-gallery-empty')).toBeNull();
    });

    it('placeholder rooms have non-empty imageUrl', () => {
      for (const room of PLACEHOLDER_ROOMS) {
        expect(room.imageUrl).toBeTruthy();
        expect(room.productIds.length).toBeGreaterThan(0);
      }
    });

    it('PLACEHOLDER_ROOMS contains exactly 4 items', () => {
      expect(PLACEHOLDER_ROOMS).toHaveLength(4);
    });

    it('placeholder banner shows expected copy', () => {
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-gallery-placeholder-banner').props.children).toContain(
        'Be the first to share your room!',
      );
    });
  });

  // ── cm-x6f: expo-image migration ───────────────────────────────────────────

  describe('expo-image migration', () => {
    it('room images use expo-image (contentFit prop instead of resizeMode)', () => {
      const { getByTestId } = renderGallery();
      const img = getByTestId('room-image-room-001');
      // expo-image mock passes props through; resizeMode is a react-native Image prop
      expect(img.props.resizeMode).toBeUndefined();
    });

    it('room images have cachePolicy="memory-disk"', () => {
      const { getByTestId } = renderGallery();
      const img = getByTestId('room-image-room-001');
      expect(img.props.cachePolicy).toBe('memory-disk');
    });

    it('room images have a placeholder prop', () => {
      const { getByTestId } = renderGallery();
      const img = getByTestId('room-image-room-001');
      expect(img.props.placeholder).toBeDefined();
    });

    it('room images have a truthy blurhash placeholder', () => {
      const { getByTestId } = renderGallery();
      const img = getByTestId('room-image-room-001');
      expect(img.props.placeholder?.blurhash).toBeTruthy();
    });

    it('room images have contentFit="cover"', () => {
      const { getByTestId } = renderGallery();
      // expo-image mock does NOT pass contentFit through (it's destructured out)
      // so we verify no resizeMode is present — the real component uses contentFit
      const img = getByTestId('room-image-room-001');
      expect(img.props.resizeMode).toBeUndefined();
    });

    it('second room also has cachePolicy set', () => {
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-image-room-002').props.cachePolicy).toBe('memory-disk');
    });
  });

  describe('Upload CTA', () => {
    it('renders Share Your Room CTA in populated gallery', () => {
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-gallery-share-cta')).toBeTruthy();
    });

    it('renders Share Your Room CTA when placeholder rooms shown', () => {
      mockUseRoomGallery.mockReturnValue({
        rooms: PLACEHOLDER_ROOMS,
        isPlaceholder: true,
        isLoading: false,
        error: null,
        refresh: mockRefresh,
      });
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-gallery-share-cta')).toBeTruthy();
    });

    it('calls onSharePress when CTA is tapped', () => {
      const onSharePress = jest.fn();
      const { getByTestId } = renderGallery({ onSharePress });
      fireEvent.press(getByTestId('room-gallery-share-cta'));
      expect(onSharePress).toHaveBeenCalledTimes(1);
    });

    it('does not throw when CTA pressed without onSharePress', () => {
      const { getByTestId } = renderGallery();
      expect(() => fireEvent.press(getByTestId('room-gallery-share-cta'))).not.toThrow();
    });

    it('does not show CTA during loading', () => {
      mockUseRoomGallery.mockReturnValue({
        rooms: [],
        isLoading: true,
        error: null,
        refresh: mockRefresh,
      });
      const { queryByTestId } = renderGallery();
      expect(queryByTestId('room-gallery-share-cta')).toBeNull();
    });

    it('does not show CTA during error state', () => {
      mockUseRoomGallery.mockReturnValue({
        rooms: [],
        isLoading: false,
        error: new Error('Network error'),
        refresh: mockRefresh,
      });
      const { queryByTestId } = renderGallery();
      expect(queryByTestId('room-gallery-share-cta')).toBeNull();
    });

    it('CTA has accessibility role button', () => {
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-gallery-share-cta').props.accessibilityRole).toBe('button');
    });
  });
});
