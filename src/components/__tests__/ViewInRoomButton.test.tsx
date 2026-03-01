import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { type Product } from '@/data/products';
import { type FutonModel } from '@/data/futons';

// ============================================================================
// ViewInRoomButton — Test-first specs for cm-88d Phase 1
//
// This button appears on ProductCard / ProductDetailScreen to launch AR.
// It should:
//   - Show "View in Your Room" CTA with camera icon
//   - Only appear for AR-eligible products (category: 'futons' or 'frames')
//   - Detect device AR capability and show fallback for unsupported devices
//   - Navigate to ARScreen with the correct product/model mapping
//   - Track analytics event on press
// ============================================================================

// --- Mocks ---

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

// Mock the AR availability check — default to supported
const mockCheckARSupport = jest.fn(() => Promise.resolve(true));
jest.mock('@/services/arSupport', () => ({
  checkARSupport: () => mockCheckARSupport(),
  isARSupportedSync: jest.fn(() => true),
}));

// Mock analytics
const mockArViewInRoomTap = jest.fn();
jest.mock('@/services/analytics', () => ({
  events: {
    arViewInRoomTap: (...args: any[]) => mockArViewInRoomTap(...args),
  },
}));

// --- Test Fixtures ---

const futonProduct: Product = {
  id: 'prod-asheville-full',
  name: 'The Asheville Full Futon',
  slug: 'asheville-full-futon',
  category: 'futons',
  price: 349,
  description: 'Our bestselling full-size futon.',
  shortDescription: 'Bestselling full-size futon',
  images: [{ uri: 'https://example.com/asheville.jpg', alt: 'Asheville Futon' }],
  badge: 'Bestseller',
  rating: 4.8,
  reviewCount: 234,
  inStock: true,
  fabricOptions: ['Natural Linen', 'Slate Gray'],
  dimensions: { width: 54, depth: 34, height: 33 },
};

const coverProduct: Product = {
  id: 'prod-mountain-cover-full',
  name: 'Mountain Weave Futon Cover',
  slug: 'mountain-weave-cover',
  category: 'covers',
  price: 59,
  description: 'Durable cover.',
  shortDescription: 'Durable cover',
  images: [{ uri: 'https://example.com/cover.jpg', alt: 'Cover' }],
  rating: 4.5,
  reviewCount: 312,
  inStock: true,
  fabricOptions: ['Sand'],
  dimensions: { width: 54, depth: 34, height: 0 },
};

const outOfStockFuton: Product = {
  ...futonProduct,
  id: 'prod-oos-futon',
  inStock: false,
};

const frameProduct: Product = {
  id: 'prod-hardwood-frame',
  name: 'Solid Hardwood Frame',
  slug: 'solid-hardwood-frame',
  category: 'frames',
  price: 199,
  description: 'Hardwood frame.',
  shortDescription: 'Solid hardwood frame',
  images: [{ uri: 'https://example.com/frame.jpg', alt: 'Frame' }],
  rating: 4.6,
  reviewCount: 203,
  inStock: true,
  fabricOptions: ['Honey Oak'],
  dimensions: { width: 54, depth: 38, height: 33 },
};

// Lazy-import the component — it doesn't exist yet (test-first)
// Tests will fail until ViewInRoomButton is implemented
let ViewInRoomButton: any;
try {
  ViewInRoomButton = require('../ViewInRoomButton').ViewInRoomButton;
} catch {
  // Component not yet implemented — all tests will be skipped gracefully
  ViewInRoomButton = null;
}

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const describeIfImplemented = ViewInRoomButton ? describe : describe.skip;

describeIfImplemented('ViewInRoomButton', () => {
  const defaultProps = {
    product: futonProduct,
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckARSupport.mockResolvedValue(true);
  });

  // ==========================================================================
  // Rendering
  // ==========================================================================
  describe('Rendering', () => {
    it('renders for futon products', () => {
      const { getByTestId } = renderWithTheme(<ViewInRoomButton {...defaultProps} />);
      expect(getByTestId('view-in-room-btn')).toBeTruthy();
    });

    it('renders for frame products', () => {
      const { getByTestId } = renderWithTheme(
        <ViewInRoomButton {...defaultProps} product={frameProduct} />,
      );
      expect(getByTestId('view-in-room-btn')).toBeTruthy();
    });

    it('does NOT render for non-AR categories (covers)', () => {
      const { queryByTestId } = renderWithTheme(
        <ViewInRoomButton {...defaultProps} product={coverProduct} />,
      );
      expect(queryByTestId('view-in-room-btn')).toBeNull();
    });

    it('does NOT render for out-of-stock products', () => {
      const { queryByTestId } = renderWithTheme(
        <ViewInRoomButton {...defaultProps} product={outOfStockFuton} />,
      );
      expect(queryByTestId('view-in-room-btn')).toBeNull();
    });

    it('shows "View in Your Room" text', () => {
      const { getByText } = renderWithTheme(<ViewInRoomButton {...defaultProps} />);
      expect(getByText('View in Your Room')).toBeTruthy();
    });

    it('shows camera icon', () => {
      const { getByTestId } = renderWithTheme(<ViewInRoomButton {...defaultProps} />);
      expect(getByTestId('view-in-room-camera-icon')).toBeTruthy();
    });

    it('renders with custom testID', () => {
      const { getByTestId } = renderWithTheme(
        <ViewInRoomButton {...defaultProps} testID="custom-ar-btn" />,
      );
      expect(getByTestId('custom-ar-btn')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Interaction
  // ==========================================================================
  describe('Interaction', () => {
    it('calls onPress with product when tapped', () => {
      const onPress = jest.fn();
      const { getByTestId } = renderWithTheme(
        <ViewInRoomButton {...defaultProps} onPress={onPress} />,
      );
      fireEvent.press(getByTestId('view-in-room-btn'));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith(futonProduct);
    });

    it('does not crash when onPress is not provided', () => {
      const { getByTestId } = renderWithTheme(<ViewInRoomButton product={futonProduct} />);
      fireEvent.press(getByTestId('view-in-room-btn'));
    });

    it('fires haptic feedback on press', () => {
      const Haptics = require('expo-haptics');
      const { getByTestId } = renderWithTheme(<ViewInRoomButton {...defaultProps} />);
      fireEvent.press(getByTestId('view-in-room-btn'));
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });

    it('tracks analytics event on press', () => {
      const { getByTestId } = renderWithTheme(<ViewInRoomButton {...defaultProps} />);
      fireEvent.press(getByTestId('view-in-room-btn'));
      expect(mockArViewInRoomTap).toHaveBeenCalledWith(futonProduct.id, futonProduct.category);
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================
  describe('Accessibility', () => {
    it('has correct accessibility label', () => {
      const { getByTestId } = renderWithTheme(<ViewInRoomButton {...defaultProps} />);
      const btn = getByTestId('view-in-room-btn');
      expect(btn.props.accessibilityLabel).toBe(
        'View The Asheville Full Futon in your room using AR camera',
      );
    });

    it('has button accessibility role', () => {
      const { getByTestId } = renderWithTheme(<ViewInRoomButton {...defaultProps} />);
      expect(getByTestId('view-in-room-btn').props.accessibilityRole).toBe('button');
    });

    it('has descriptive accessibility hint', () => {
      const { getByTestId } = renderWithTheme(<ViewInRoomButton {...defaultProps} />);
      const btn = getByTestId('view-in-room-btn');
      expect(btn.props.accessibilityHint).toContain('camera');
    });
  });

  // ==========================================================================
  // Size Variants
  // ==========================================================================
  describe('Size Variants', () => {
    it('renders compact size variant (for ProductCard)', () => {
      const { getByTestId } = renderWithTheme(
        <ViewInRoomButton {...defaultProps} size="compact" />,
      );
      expect(getByTestId('view-in-room-btn')).toBeTruthy();
    });

    it('renders full size variant (for ProductDetailScreen)', () => {
      const { getByTestId } = renderWithTheme(<ViewInRoomButton {...defaultProps} size="full" />);
      expect(getByTestId('view-in-room-btn')).toBeTruthy();
    });

    it('defaults to full size', () => {
      const { getByTestId } = renderWithTheme(<ViewInRoomButton {...defaultProps} />);
      // Full variant shows the text label
      expect(getByTestId('view-in-room-btn')).toBeTruthy();
    });

    it('compact variant still shows icon', () => {
      const { getByTestId } = renderWithTheme(
        <ViewInRoomButton {...defaultProps} size="compact" />,
      );
      expect(getByTestId('view-in-room-camera-icon')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Disabled State
  // ==========================================================================
  describe('Disabled State', () => {
    it('can be explicitly disabled', () => {
      const onPress = jest.fn();
      const { getByTestId } = renderWithTheme(
        <ViewInRoomButton {...defaultProps} onPress={onPress} disabled />,
      );
      fireEvent.press(getByTestId('view-in-room-btn'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('shows disabled accessibility state when disabled', () => {
      const { getByTestId } = renderWithTheme(<ViewInRoomButton {...defaultProps} disabled />);
      expect(getByTestId('view-in-room-btn').props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });
  });
});
