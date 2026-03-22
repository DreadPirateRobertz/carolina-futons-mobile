import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RoomGalleryScreen } from '../RoomGalleryScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { RoomGalleryItem } from '@/hooks/useRoomGallery';

// Mock useRoomGallery so screen tests control the data layer
const mockRefresh = jest.fn();
const mockUseRoomGallery = jest.fn();
jest.mock('@/hooks/useRoomGallery', () => ({
  useRoomGallery: () => mockUseRoomGallery(),
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

  describe('Empty state — product fallback', () => {
    beforeEach(() => {
      mockUseRoomGallery.mockReturnValue({
        rooms: [],
        isLoading: false,
        error: null,
        refresh: mockRefresh,
      });
    });

    it('shows the fallback grid when no rooms', () => {
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-gallery-fallback-grid')).toBeTruthy();
    });

    it('shows the fallback section header', () => {
      const { getByTestId } = renderGallery();
      expect(getByTestId('room-gallery-fallback-header')).toBeTruthy();
    });

    it('does NOT show room-gallery-grid in fallback mode', () => {
      const { queryByTestId } = renderGallery();
      expect(queryByTestId('room-gallery-grid')).toBeNull();
    });

    it('does NOT show old plain empty text in fallback mode', () => {
      const { queryByTestId } = renderGallery();
      expect(queryByTestId('room-gallery-empty')).toBeNull();
    });

    it('renders fallback product cards', () => {
      const { getByTestId } = renderGallery();
      // At least one product card from the static catalog
      expect(getByTestId('fallback-product-card-prod-asheville-full')).toBeTruthy();
    });

    it('renders multiple fallback product cards', () => {
      const { getByTestId } = renderGallery();
      expect(getByTestId('fallback-product-card-prod-asheville-full')).toBeTruthy();
      expect(getByTestId('fallback-product-card-prod-blue-ridge-queen')).toBeTruthy();
    });

    it('calls onProductPress with product id when fallback card tapped', () => {
      const onProductPress = jest.fn();
      const { getByTestId } = renderGallery({ onProductPress });
      fireEvent.press(getByTestId('fallback-product-card-prod-asheville-full'));
      expect(onProductPress).toHaveBeenCalledWith('prod-asheville-full');
    });

    it('does not throw when onProductPress not provided and fallback card tapped', () => {
      const { getByTestId } = renderGallery();
      expect(() =>
        fireEvent.press(getByTestId('fallback-product-card-prod-asheville-full')),
      ).not.toThrow();
    });

    it('fallback cards have accessibilityRole="button"', () => {
      const { getByTestId } = renderGallery();
      const card = getByTestId('fallback-product-card-prod-asheville-full');
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('fallback cards have an accessibilityLabel', () => {
      const { getByTestId } = renderGallery();
      const card = getByTestId('fallback-product-card-prod-asheville-full');
      expect(card.props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Fallback NOT shown when rooms exist or error/loading', () => {
    it('does not show fallback grid when rooms are loaded', () => {
      // default beforeEach returns SAMPLE_ROOMS
      const { queryByTestId } = renderGallery();
      expect(queryByTestId('room-gallery-fallback-grid')).toBeNull();
    });

    it('does not show fallback grid when loading', () => {
      mockUseRoomGallery.mockReturnValue({
        rooms: [],
        isLoading: true,
        error: null,
        refresh: mockRefresh,
      });
      const { queryByTestId } = renderGallery();
      expect(queryByTestId('room-gallery-fallback-grid')).toBeNull();
    });

    it('does not show fallback grid when error', () => {
      mockUseRoomGallery.mockReturnValue({
        rooms: [],
        isLoading: false,
        error: new Error('Network error'),
        refresh: mockRefresh,
      });
      const { queryByTestId } = renderGallery();
      expect(queryByTestId('room-gallery-fallback-grid')).toBeNull();
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
});
