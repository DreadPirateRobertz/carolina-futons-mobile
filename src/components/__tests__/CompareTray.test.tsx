/**
 * TDD tests for CompareTray — cm-b19
 *
 * Persistent floating tray at the bottom of ShopScreen.
 * Reads compareList from CompareContext; hidden when list is empty.
 * Shows mini cards per product with remove button.
 * CTA navigates to CompareScreen.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CompareTray } from '../CompareTray';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { Product } from '@/data/products';

// ── CompareContext mock ──────────────────────────────────────────────────────

const mockRemoveFromCompare = jest.fn();
const mockClearCompare = jest.fn();
const mockUseCompareContext = jest.fn();

jest.mock('@/contexts/CompareContext', () => ({
  useCompareContext: () => mockUseCompareContext(),
}));

// ── Fixture data ─────────────────────────────────────────────────────────────

const PRODUCT_A: Product = {
  id: 'prod-asheville-full',
  slug: 'asheville-full',
  name: 'Asheville Full',
  shortDescription: 'Solid frame futon',
  price: 349,
  images: [{ uri: 'https://example.com/a.jpg', alt: 'Asheville', blurhash: 'LEHV6n' }],
  inStock: true,
  rating: 4.5,
  reviewCount: 22,
  category: 'futons',
  badge: null,
  stockCount: 20,
} as unknown as Product;

const PRODUCT_B: Product = {
  id: 'prod-biltmore-queen',
  slug: 'biltmore-queen',
  name: 'Biltmore Queen',
  shortDescription: 'Wide sleeper',
  price: 499,
  images: [{ uri: 'https://example.com/b.jpg', alt: 'Biltmore', blurhash: 'LEHV6n' }],
  inStock: true,
  rating: 4.2,
  reviewCount: 15,
  category: 'futons',
  badge: null,
  stockCount: 10,
} as unknown as Product;

const PRODUCT_C: Product = {
  id: 'prod-blue-ridge-full',
  slug: 'blue-ridge-full',
  name: 'Blue Ridge Full',
  shortDescription: 'Mountain sleeper',
  price: 399,
  images: [{ uri: 'https://example.com/c.jpg', alt: 'Blue Ridge', blurhash: 'LEHV6n' }],
  inStock: true,
  rating: 4.8,
  reviewCount: 31,
  category: 'futons',
  badge: null,
  stockCount: 5,
} as unknown as Product;

// ── Helpers ───────────────────────────────────────────────────────────────────

function withCompare(compareList: Product[]) {
  mockUseCompareContext.mockReturnValue({
    compareList,
    count: compareList.length,
    removeFromCompare: mockRemoveFromCompare,
    clearCompare: mockClearCompare,
    addToCompare: jest.fn(),
    isInCompare: jest.fn(() => false),
    isFull: compareList.length >= 3,
  });
}

function renderTray(props: Partial<React.ComponentProps<typeof CompareTray>> = {}) {
  return render(
    <ThemeProvider>
      <CompareTray {...props} />
    </ThemeProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CompareTray', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    withCompare([]);
  });

  // ── Visibility ─────────────────────────────────────────────────────────────

  describe('visibility', () => {
    it('renders nothing when compare list is empty', () => {
      const { queryByTestId } = renderTray();
      expect(queryByTestId('compare-tray')).toBeNull();
    });

    it('renders tray when list has 1 product', () => {
      withCompare([PRODUCT_A]);
      const { getByTestId } = renderTray();
      expect(getByTestId('compare-tray')).toBeTruthy();
    });

    it('renders tray when list has 2 products', () => {
      withCompare([PRODUCT_A, PRODUCT_B]);
      const { getByTestId } = renderTray();
      expect(getByTestId('compare-tray')).toBeTruthy();
    });

    it('renders tray when list is full (3 products)', () => {
      withCompare([PRODUCT_A, PRODUCT_B, PRODUCT_C]);
      const { getByTestId } = renderTray();
      expect(getByTestId('compare-tray')).toBeTruthy();
    });
  });

  // ── Mini cards ─────────────────────────────────────────────────────────────

  describe('mini cards', () => {
    it('renders a mini card for each product in the list', () => {
      withCompare([PRODUCT_A, PRODUCT_B]);
      const { getByTestId } = renderTray();
      expect(getByTestId(`compare-tray-card-${PRODUCT_A.id}`)).toBeTruthy();
      expect(getByTestId(`compare-tray-card-${PRODUCT_B.id}`)).toBeTruthy();
    });

    it('shows product name on each mini card', () => {
      withCompare([PRODUCT_A]);
      const { getByText } = renderTray();
      expect(getByText(PRODUCT_A.name)).toBeTruthy();
    });

    it('shows product name for all three when list is full', () => {
      withCompare([PRODUCT_A, PRODUCT_B, PRODUCT_C]);
      const { getByText } = renderTray();
      expect(getByText(PRODUCT_A.name)).toBeTruthy();
      expect(getByText(PRODUCT_B.name)).toBeTruthy();
      expect(getByText(PRODUCT_C.name)).toBeTruthy();
    });

    it('shows remove button for each mini card', () => {
      withCompare([PRODUCT_A, PRODUCT_B]);
      const { getByTestId } = renderTray();
      expect(getByTestId(`compare-tray-remove-${PRODUCT_A.id}`)).toBeTruthy();
      expect(getByTestId(`compare-tray-remove-${PRODUCT_B.id}`)).toBeTruthy();
    });

    it('pressing remove calls removeFromCompare with correct productId', () => {
      withCompare([PRODUCT_A, PRODUCT_B]);
      const { getByTestId } = renderTray();
      fireEvent.press(getByTestId(`compare-tray-remove-${PRODUCT_A.id}`));
      expect(mockRemoveFromCompare).toHaveBeenCalledWith(PRODUCT_A.id);
    });

    it('pressing remove on second card calls removeFromCompare with correct id', () => {
      withCompare([PRODUCT_A, PRODUCT_B]);
      const { getByTestId } = renderTray();
      fireEvent.press(getByTestId(`compare-tray-remove-${PRODUCT_B.id}`));
      expect(mockRemoveFromCompare).toHaveBeenCalledWith(PRODUCT_B.id);
    });

    it('mini card image has testID', () => {
      withCompare([PRODUCT_A]);
      const { getByTestId } = renderTray();
      expect(getByTestId(`compare-tray-image-${PRODUCT_A.id}`)).toBeTruthy();
    });
  });

  // ── Compare CTA ────────────────────────────────────────────────────────────

  describe('compare CTA', () => {
    it('shows compare CTA button when list is non-empty', () => {
      withCompare([PRODUCT_A]);
      const { getByTestId } = renderTray();
      expect(getByTestId('compare-tray-cta')).toBeTruthy();
    });

    it('calls onNavigateToCompare when CTA pressed', () => {
      withCompare([PRODUCT_A, PRODUCT_B]);
      const onNavigateToCompare = jest.fn();
      const { getByTestId } = renderTray({ onNavigateToCompare });
      fireEvent.press(getByTestId('compare-tray-cta'));
      expect(onNavigateToCompare).toHaveBeenCalledTimes(1);
    });

    it('does not throw when onNavigateToCompare not provided', () => {
      withCompare([PRODUCT_A]);
      const { getByTestId } = renderTray();
      expect(() => fireEvent.press(getByTestId('compare-tray-cta'))).not.toThrow();
    });

    it('CTA has accessible button role', () => {
      withCompare([PRODUCT_A]);
      const { getByTestId } = renderTray();
      expect(getByTestId('compare-tray-cta').props.accessibilityRole).toBe('button');
    });

    it('CTA shows count of items being compared', () => {
      withCompare([PRODUCT_A, PRODUCT_B]);
      const { getByTestId } = renderTray();
      const cta = getByTestId('compare-tray-cta');
      expect(cta.props.accessibilityLabel).toContain('2');
    });
  });

  // ── Clear all ──────────────────────────────────────────────────────────────

  describe('clear all', () => {
    it('shows clear all button when list is non-empty', () => {
      withCompare([PRODUCT_A]);
      const { getByTestId } = renderTray();
      expect(getByTestId('compare-tray-clear')).toBeTruthy();
    });

    it('pressing clear all calls clearCompare', () => {
      withCompare([PRODUCT_A, PRODUCT_B]);
      const { getByTestId } = renderTray();
      fireEvent.press(getByTestId('compare-tray-clear'));
      expect(mockClearCompare).toHaveBeenCalledTimes(1);
    });
  });

  // ── Accessibility ──────────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('remove buttons have accessibility labels', () => {
      withCompare([PRODUCT_A]);
      const { getByTestId } = renderTray();
      const btn = getByTestId(`compare-tray-remove-${PRODUCT_A.id}`);
      expect(btn.props.accessibilityLabel).toBeTruthy();
      expect(btn.props.accessibilityLabel).toContain(PRODUCT_A.name);
    });

    it('remove buttons have button role', () => {
      withCompare([PRODUCT_A]);
      const { getByTestId } = renderTray();
      expect(getByTestId(`compare-tray-remove-${PRODUCT_A.id}`).props.accessibilityRole).toBe(
        'button',
      );
    });

    it('remove button hitSlop meets 44pt minimum tap target on each side (cm-a11y-shipping)', () => {
      withCompare([PRODUCT_A]);
      const { getByTestId } = renderTray();
      const btn = getByTestId(`compare-tray-remove-${PRODUCT_A.id}`);
      const { top, bottom, left, right } = btn.props.hitSlop ?? {};
      // Button is 20px; hitSlop must compensate to reach 44pt total (12 each side)
      expect(top).toBeGreaterThanOrEqual(12);
      expect(bottom).toBeGreaterThanOrEqual(12);
      expect(left).toBeGreaterThanOrEqual(12);
      expect(right).toBeGreaterThanOrEqual(12);
    });

    it('swipeable card has accessibilityHint describing swipe gesture (cm-a11y-shipping)', () => {
      withCompare([PRODUCT_A]);
      const { getByTestId } = renderTray();
      const swipeable = getByTestId(`compare-tray-swipeable-${PRODUCT_A.id}`);
      expect(swipeable.props.accessibilityHint).toBeTruthy();
    });
  });

  // ── Custom testID ──────────────────────────────────────────────────────────

  describe('testID', () => {
    it('uses default testID "compare-tray"', () => {
      withCompare([PRODUCT_A]);
      const { getByTestId } = renderTray();
      expect(getByTestId('compare-tray')).toBeTruthy();
    });

    it('accepts custom testID', () => {
      withCompare([PRODUCT_A]);
      const { getByTestId } = renderTray({ testID: 'my-tray' });
      expect(getByTestId('my-tray')).toBeTruthy();
    });
  });

  // ── Thumbnail size (cm-a9g) ─────────────────────────────────────────────────

  describe('thumbnail size', () => {
    it('mini card image renders at 140px height', () => {
      withCompare([PRODUCT_A]);
      const { getByTestId } = renderTray();
      const img = getByTestId(`compare-tray-image-${PRODUCT_A.id}`);
      expect(img.props.style).toEqual(expect.objectContaining({ height: 140 }));
    });

    it('mini card image renders at 140px height for all products', () => {
      withCompare([PRODUCT_A, PRODUCT_B, PRODUCT_C]);
      const { getByTestId } = renderTray();
      [PRODUCT_A, PRODUCT_B, PRODUCT_C].forEach((p) => {
        const img = getByTestId(`compare-tray-image-${p.id}`);
        expect(img.props.style).toEqual(expect.objectContaining({ height: 140 }));
      });
    });
  });

  // ── Swipe-to-remove (cm-a9g) ───────────────────────────────────────────────

  describe('swipe-to-remove', () => {
    it('renders swipeable wrapper for each mini card', () => {
      withCompare([PRODUCT_A, PRODUCT_B]);
      const { getByTestId } = renderTray();
      expect(getByTestId(`compare-tray-swipeable-${PRODUCT_A.id}`)).toBeTruthy();
      expect(getByTestId(`compare-tray-swipeable-${PRODUCT_B.id}`)).toBeTruthy();
    });

    it('swipeable wrapper has panHandlers attached', () => {
      withCompare([PRODUCT_A]);
      const { getByTestId } = renderTray();
      const wrapper = getByTestId(`compare-tray-swipeable-${PRODUCT_A.id}`);
      // PanResponder attaches onStartShouldSetResponder and related handlers
      expect(wrapper.props.onStartShouldSetResponder).toBeDefined();
    });

    it('remove button still calls removeFromCompare (both methods available)', () => {
      withCompare([PRODUCT_A]);
      const { getByTestId } = renderTray();
      fireEvent.press(getByTestId(`compare-tray-remove-${PRODUCT_A.id}`));
      expect(mockRemoveFromCompare).toHaveBeenCalledWith(PRODUCT_A.id);
    });

    it('swipeable wrapper renders all three cards when list is full', () => {
      withCompare([PRODUCT_A, PRODUCT_B, PRODUCT_C]);
      const { getByTestId } = renderTray();
      expect(getByTestId(`compare-tray-swipeable-${PRODUCT_A.id}`)).toBeTruthy();
      expect(getByTestId(`compare-tray-swipeable-${PRODUCT_B.id}`)).toBeTruthy();
      expect(getByTestId(`compare-tray-swipeable-${PRODUCT_C.id}`)).toBeTruthy();
    });
  });

  // ── Action spacing (cm-a9g) ────────────────────────────────────────────────

  describe('action spacing', () => {
    it('CTA button has marginTop of at least 16px', () => {
      withCompare([PRODUCT_A]);
      const { getByTestId } = renderTray();
      const cta = getByTestId('compare-tray-cta');
      // The static style on the CTA sets marginTop: 16
      const flatStyle = Array.isArray(cta.props.style)
        ? Object.assign({}, ...cta.props.style.filter(Boolean))
        : (cta.props.style ?? {});
      expect(flatStyle.marginTop).toBeGreaterThanOrEqual(16);
    });
  });
});
