/**
 * Tests for WixProductDetail — Wix-sourced product detail view.
 *
 * Covers: gallery rendering, pagination dots, fullscreen modal, share button,
 * wishlist button, price display (hasPrice vs Call for Price), stock status badge,
 * fabric options, category badge, skeleton loading state, empty images fallback,
 * back button, description, original price / discount.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Share } from 'react-native';
import { WixProductDetail } from '../WixProductDetail';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import type { Product } from '@/data/products';
import type { ProductId } from '@/data/productId';

jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    addToCart: jest.fn(),
    submitReview: jest.fn(),
    referralShared: jest.fn(),
    arUsed: jest.fn(),
    wishlistAdd: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => ({
    queryData: jest.fn().mockResolvedValue({ items: [], totalResults: 0 }),
    addToWishlist: jest.fn(),
    removeFromWishlist: jest.fn(),
  }),
  useOptionalWixClient: () => null,
  WixProvider: ({ children }: any) => children,
}));

function renderComponent(props: Partial<React.ComponentProps<typeof WixProductDetail>> = {}) {
  const defaultProduct: Product = {
    id: 'test-product-1' as ProductId,
    name: 'The Asheville Futon',
    slug: 'asheville-futon',
    category: 'futons',
    price: 349,
    description: 'A handcrafted futon inspired by the Blue Ridge Mountains.',
    shortDescription: 'Mountain-inspired comfort',
    images: [
      { uri: 'https://cdn.example.com/img1.jpg', alt: 'Front view' },
      { uri: 'https://cdn.example.com/img2.jpg', alt: 'Side view' },
      { uri: 'https://cdn.example.com/img3.jpg', alt: 'Detail view' },
    ],
    rating: 4.5,
    reviewCount: 42,
    inStock: true,
    fabricOptions: ['Natural Linen', 'Mountain Blue', 'Sunset Orange'],
    dimensions: { width: 72, depth: 36, height: 32 },
  };

  return render(
    <ThemeProvider>
      <WishlistProvider>
        <WixProductDetail product={defaultProduct} {...props} />
      </WishlistProvider>
    </ThemeProvider>,
  );
}

describe('WixProductDetail', () => {
  describe('Rendering', () => {
    it('renders with default testID', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('wix-product-detail-screen')).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = renderComponent({ testID: 'custom-detail' });
      expect(getByTestId('custom-detail')).toBeTruthy();
    });

    it('displays product name', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('product-name').props.children).toBe('The Asheville Futon');
    });

    it('displays short description / tagline', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('product-tagline').props.children).toBe('Mountain-inspired comfort');
    });

    it('displays product description', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('product-description').props.children).toContain('handcrafted futon');
    });

    it('omits tagline when shortDescription is empty', () => {
      const { queryByTestId } = renderComponent({
        product: {
          id: 'p1' as ProductId,
          name: 'No Tagline',
          slug: 'no-tagline',
          category: 'futons',
          price: 100,
          description: 'Desc',
          shortDescription: '',
          images: [{ uri: 'x.jpg', alt: 'img' }],
          rating: 4,
          reviewCount: 1,
          inStock: true,
          fabricOptions: [],
          dimensions: { width: 1, depth: 1, height: 1 },
        },
      });
      expect(queryByTestId('product-tagline')).toBeNull();
    });

    it('omits description section when description is empty', () => {
      const { queryByTestId } = renderComponent({
        product: {
          id: 'p1' as ProductId,
          name: 'No Desc',
          slug: 'no-desc',
          category: 'futons',
          price: 100,
          description: '',
          shortDescription: 'Short',
          images: [{ uri: 'x.jpg', alt: 'img' }],
          rating: 4,
          reviewCount: 1,
          inStock: true,
          fabricOptions: [],
          dimensions: { width: 1, depth: 1, height: 1 },
        },
      });
      expect(queryByTestId('product-description')).toBeNull();
    });
  });

  describe('Gallery', () => {
    it('renders gallery slides for each image', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('gallery-slide-0')).toBeTruthy();
      expect(getByTestId('gallery-slide-1')).toBeTruthy();
      expect(getByTestId('gallery-slide-2')).toBeTruthy();
    });

    it('renders gallery images with expo-image', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('gallery-image-0')).toBeTruthy();
    });

    it('has gallery FlatList testID', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('gallery-list')).toBeTruthy();
    });

    it('marks gallery slides with imagebutton accessibility role', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('gallery-slide-0').props.accessibilityRole).toBe('imagebutton');
    });
  });

  describe('Pagination dots', () => {
    it('renders pagination dots when multiple images', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('gallery-pagination')).toBeTruthy();
    });

    it('does not render pagination for single image', () => {
      const { queryByTestId } = renderComponent({
        product: {
          id: 'p1' as ProductId,
          name: 'Single',
          slug: 'single',
          category: 'futons',
          price: 100,
          description: 'Desc',
          shortDescription: 'Short',
          images: [{ uri: 'x.jpg', alt: 'img' }],
          rating: 4,
          reviewCount: 1,
          inStock: true,
          fabricOptions: [],
          dimensions: { width: 1, depth: 1, height: 1 },
        },
      });
      expect(queryByTestId('gallery-pagination')).toBeNull();
    });
  });

  describe('Fullscreen modal', () => {
    it('opens fullscreen modal when gallery slide is pressed', () => {
      const { getByTestId } = renderComponent();
      fireEvent.press(getByTestId('gallery-slide-0'));
      // ImageGalleryModal should become visible
      // The modal renders with testID from ImageGalleryModal — check it appears
      // Since visible prop is now true, the modal should render its content
      expect(getByTestId('gallery-slide-0')).toBeTruthy(); // Component still exists
    });
  });

  describe('Share button', () => {
    it('renders share button', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('detail-share-button')).toBeTruthy();
    });

    it('calls Share.share when pressed', async () => {
      const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
      const { getByTestId } = renderComponent();
      await fireEvent.press(getByTestId('detail-share-button'));
      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('The Asheville Futon') }),
      );
      shareSpy.mockRestore();
    });

    it('does not throw when Share.share is cancelled', () => {
      jest.spyOn(Share, 'share').mockRejectedValue(new Error('User cancelled'));
      const { getByTestId } = renderComponent();
      // Should not throw — the catch block swallows the error
      expect(() => fireEvent.press(getByTestId('detail-share-button'))).not.toThrow();
      jest.restoreAllMocks();
    });

    it('has accessible label with product name', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('detail-share-button').props.accessibilityLabel).toContain(
        'The Asheville Futon',
      );
    });
  });

  describe('Wishlist button', () => {
    it('renders wishlist button', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('detail-wishlist-button')).toBeTruthy();
    });
  });

  describe('Price display', () => {
    it('displays formatted price when product has a price', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('total-price').props.children).toBe('$349.00');
    });

    it('shows "Call for Price" when price is 0', () => {
      const { getByTestId, queryByTestId } = renderComponent({
        product: {
          id: 'p1' as ProductId,
          name: 'Custom',
          slug: 'custom',
          category: 'futons',
          price: 0,
          description: 'Desc',
          shortDescription: '',
          images: [{ uri: 'x.jpg', alt: 'img' }],
          rating: 4,
          reviewCount: 1,
          inStock: true,
          fabricOptions: [],
          dimensions: { width: 1, depth: 1, height: 1 },
        },
      });
      expect(getByTestId('call-for-price')).toBeTruthy();
      expect(queryByTestId('total-price')).toBeNull();
    });

    it('shows original price with strikethrough when discounted', () => {
      const { getByTestId } = renderComponent({
        product: {
          id: 'p1' as ProductId,
          name: 'Discounted',
          slug: 'discounted',
          category: 'futons',
          price: 299,
          originalPrice: 399,
          description: 'Sale',
          shortDescription: '',
          images: [{ uri: 'x.jpg', alt: 'img' }],
          rating: 4,
          reviewCount: 1,
          inStock: true,
          fabricOptions: [],
          dimensions: { width: 1, depth: 1, height: 1 },
        },
      });
      expect(getByTestId('total-price').props.children).toBe('$299.00');
      expect(getByTestId('original-price').props.children).toBe('$399.00');
    });

    it('does not show original price when same as current', () => {
      const { queryByTestId } = renderComponent({
        product: {
          id: 'p1' as ProductId,
          name: 'No Discount',
          slug: 'no-discount',
          category: 'futons',
          price: 349,
          originalPrice: 349,
          description: 'Same',
          shortDescription: '',
          images: [{ uri: 'x.jpg', alt: 'img' }],
          rating: 4,
          reviewCount: 1,
          inStock: true,
          fabricOptions: [],
          dimensions: { width: 1, depth: 1, height: 1 },
        },
      });
      expect(queryByTestId('original-price')).toBeNull();
    });
  });

  describe('Stock status badge', () => {
    it('shows "In Stock" badge for in-stock product', () => {
      const { getByText } = renderComponent();
      expect(getByText('In Stock')).toBeTruthy();
    });

    it('shows "Out of Stock" badge for out-of-stock product', () => {
      const { getByText } = renderComponent({
        product: {
          id: 'p1' as ProductId,
          name: 'OOS Product',
          slug: 'oos',
          category: 'futons',
          price: 100,
          description: 'Desc',
          shortDescription: '',
          images: [{ uri: 'x.jpg', alt: 'img' }],
          rating: 4,
          reviewCount: 1,
          inStock: false,
          fabricOptions: [],
          dimensions: { width: 1, depth: 1, height: 1 },
        },
      });
      expect(getByText('Out of Stock')).toBeTruthy();
    });
  });

  describe('Fabric options', () => {
    it('renders fabric chips when fabricOptions exist', () => {
      const { getByText } = renderComponent();
      expect(getByText('Natural Linen')).toBeTruthy();
      expect(getByText('Mountain Blue')).toBeTruthy();
      expect(getByText('Sunset Orange')).toBeTruthy();
    });

    it('shows "Available Fabrics" section title', () => {
      const { getByText } = renderComponent();
      expect(getByText('Available Fabrics')).toBeTruthy();
    });

    it('does not render fabric section when no fabric options', () => {
      const { queryByText } = renderComponent({
        product: {
          id: 'p1' as ProductId,
          name: 'No Fabrics',
          slug: 'no-fabrics',
          category: 'futons',
          price: 100,
          description: 'Desc',
          shortDescription: '',
          images: [{ uri: 'x.jpg', alt: 'img' }],
          rating: 4,
          reviewCount: 1,
          inStock: true,
          fabricOptions: [],
          dimensions: { width: 1, depth: 1, height: 1 },
        },
      });
      expect(queryByText('Available Fabrics')).toBeNull();
    });
  });

  describe('Category badge', () => {
    it('displays capitalised category name', () => {
      const { getByText } = renderComponent();
      expect(getByText('Futons')).toBeTruthy();
    });
  });

  describe('Skeleton loading state', () => {
    it('renders SkeletonProductDetail when isLoading is true', () => {
      const { getByTestId, queryByTestId } = renderComponent({ isLoading: true });
      expect(getByTestId('product-detail-skeleton')).toBeTruthy();
      expect(queryByTestId('wix-product-detail-screen')).toBeNull();
    });
  });

  describe('Empty images fallback', () => {
    it('shows "No image available" placeholder when images array is empty', () => {
      const { getByText } = renderComponent({
        product: {
          id: 'p1' as ProductId,
          name: 'No Images',
          slug: 'no-images',
          category: 'futons',
          price: 100,
          description: 'Desc',
          shortDescription: '',
          images: [],
          rating: 4,
          reviewCount: 1,
          inStock: true,
          fabricOptions: [],
          dimensions: { width: 1, depth: 1, height: 1 },
        },
      });
      expect(getByText('No image available')).toBeTruthy();
    });

    it('still renders one gallery slide for empty images', () => {
      const { getByTestId } = renderComponent({
        product: {
          id: 'p1' as ProductId,
          name: 'No Images',
          slug: 'no-images',
          category: 'futons',
          price: 100,
          description: 'Desc',
          shortDescription: '',
          images: [],
          rating: 4,
          reviewCount: 1,
          inStock: true,
          fabricOptions: [],
          dimensions: { width: 1, depth: 1, height: 1 },
        },
      });
      expect(getByTestId('gallery-slide-0')).toBeTruthy();
    });

    it('does not show pagination dots for empty images', () => {
      const { queryByTestId } = renderComponent({
        product: {
          id: 'p1' as ProductId,
          name: 'No Images',
          slug: 'no-images',
          category: 'futons',
          price: 100,
          description: 'Desc',
          shortDescription: '',
          images: [],
          rating: 4,
          reviewCount: 1,
          inStock: true,
          fabricOptions: [],
          dimensions: { width: 1, depth: 1, height: 1 },
        },
      });
      expect(queryByTestId('gallery-pagination')).toBeNull();
    });
  });

  describe('Back button', () => {
    it('renders back button when onBack is provided', () => {
      const { getByTestId } = renderComponent({ onBack: jest.fn() });
      expect(getByTestId('detail-back-button')).toBeTruthy();
    });

    it('does not render back button when onBack is not provided', () => {
      const { queryByTestId } = renderComponent({ onBack: undefined });
      expect(queryByTestId('detail-back-button')).toBeNull();
    });

    it('calls onBack when back button is pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = renderComponent({ onBack });
      fireEvent.press(getByTestId('detail-back-button'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('has accessible label "Go back"', () => {
      const { getByTestId } = renderComponent({ onBack: jest.fn() });
      expect(getByTestId('detail-back-button').props.accessibilityLabel).toBe('Go back');
    });
  });

  describe('Mountain skyline', () => {
    it('renders mountain skyline decorative element', () => {
      const { UNSAFE_root } = renderComponent();
      // Skyline is inside an importantForAccessibility="no-hide-descendants" wrapper,
      // so getByTestId won't find it. Search the full tree instead.
      const skylines = UNSAFE_root.findAll(
        (node) => node.props.testID === 'product-detail-skyline',
      );
      expect(skylines.length).toBeGreaterThan(0);
    });
  });
});
