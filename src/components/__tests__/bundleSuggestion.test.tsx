/**
 * BundleSuggestion — deacon-y8lf / cm-bun
 *
 * TDD spec written BEFORE implementation.
 *
 * Covers:
 *  - Renders nothing when bundle is null (no match)
 *  - Loading state shows skeleton/activity indicator
 *  - Error state shows error message
 *  - Happy path: bundle name, product names, savings, coupon code, CTA
 *  - Add Bundle to Cart CTA calls addBundleToCart
 *  - isAddingToCart disables/shows loading on CTA
 *  - addSuccess shows confirmation
 *  - Accessibility: CTA role, savings announcement
 *  - testID forwarding
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { BundleSuggestion } from '../BundleSuggestion';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { PRODUCTS } from '@/data/products';

// ── Hook mock ──────────────────────────────────────────────────────────────────

const mockAddBundleToCart = jest.fn();
const mockUseBundleSuggestion = jest.fn();

jest.mock('@/hooks/useBundleSuggestion', () => ({
  useBundleSuggestion: (productId: string) => mockUseBundleSuggestion(productId),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const PRODUCT_A = PRODUCTS[0];
const PRODUCT_B = PRODUCTS[1];

const MOCK_BUNDLE = {
  bundleId: 'bundle-abc-123',
  name: 'Living Room Set',
  productIds: [PRODUCT_A.id, PRODUCT_B.id],
  discountPercent: 15,
};

const MOCK_PRICING = {
  originalTotal: 1200,
  bundlePrice: 1020,
  savings: 180,
  savingsPercent: 15,
  couponCode: 'CF-BUNDLE-A1B2C3D4',
};

const IDLE_STATE = {
  bundle: null,
  bundleProducts: [],
  pricing: null,
  isLoading: false,
  error: null,
  addBundleToCart: mockAddBundleToCart,
  isAddingToCart: false,
  addSuccess: false,
};

const LOADING_STATE = {
  ...IDLE_STATE,
  isLoading: true,
};

const HAPPY_STATE = {
  bundle: MOCK_BUNDLE,
  bundleProducts: [PRODUCT_A, PRODUCT_B],
  pricing: MOCK_PRICING,
  isLoading: false,
  error: null,
  addBundleToCart: mockAddBundleToCart,
  isAddingToCart: false,
  addSuccess: false,
};

const ERROR_STATE = {
  ...IDLE_STATE,
  error: 'API unreachable',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function renderComponent(productId = PRODUCT_A.id, testID = 'bundle-suggestion') {
  return render(
    <ThemeProvider>
      <BundleSuggestion productId={productId} testID={testID} />
    </ThemeProvider>,
  );
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseBundleSuggestion.mockReturnValue(IDLE_STATE);
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('BundleSuggestion', () => {
  describe('null bundle (no match)', () => {
    it('renders nothing when bundle is null and not loading', () => {
      mockUseBundleSuggestion.mockReturnValue(IDLE_STATE);
      const { queryByTestId } = renderComponent();
      expect(queryByTestId('bundle-suggestion')).toBeNull();
    });

    it('passes productId to useBundleSuggestion', () => {
      renderComponent(PRODUCT_A.id);
      expect(mockUseBundleSuggestion).toHaveBeenCalledWith(PRODUCT_A.id);
    });
  });

  describe('loading state', () => {
    it('renders the container when loading', () => {
      mockUseBundleSuggestion.mockReturnValue(LOADING_STATE);
      const { getByTestId } = renderComponent();
      expect(getByTestId('bundle-suggestion')).toBeTruthy();
    });

    it('shows a loading indicator while fetching', () => {
      mockUseBundleSuggestion.mockReturnValue(LOADING_STATE);
      const { getByTestId } = renderComponent();
      expect(getByTestId('bundle-suggestion-loading')).toBeTruthy();
    });

    it('does not show the add-to-cart button while loading', () => {
      mockUseBundleSuggestion.mockReturnValue(LOADING_STATE);
      const { queryByTestId } = renderComponent();
      expect(queryByTestId('bundle-suggestion-cta')).toBeNull();
    });
  });

  describe('error state', () => {
    it('renders nothing on error (fail silently in UI)', () => {
      mockUseBundleSuggestion.mockReturnValue(ERROR_STATE);
      const { queryByTestId } = renderComponent();
      expect(queryByTestId('bundle-suggestion')).toBeNull();
    });
  });

  describe('happy path', () => {
    beforeEach(() => {
      mockUseBundleSuggestion.mockReturnValue(HAPPY_STATE);
    });

    it('renders the container', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('bundle-suggestion')).toBeTruthy();
    });

    it('shows the bundle name', () => {
      const { getByText } = renderComponent();
      expect(getByText(MOCK_BUNDLE.name)).toBeTruthy();
    });

    it('shows all bundle product names', () => {
      const { getByText } = renderComponent();
      expect(getByText(PRODUCT_A.name)).toBeTruthy();
      expect(getByText(PRODUCT_B.name)).toBeTruthy();
    });

    it('shows the savings amount', () => {
      const { getByText } = renderComponent();
      // $180 savings
      expect(getByText(/\$180/)).toBeTruthy();
    });

    it('shows the savings percent', () => {
      const { getByText } = renderComponent();
      expect(getByText(/15%/)).toBeTruthy();
    });

    it('shows the coupon code', () => {
      const { getByText } = renderComponent();
      expect(getByText('CF-BUNDLE-A1B2C3D4')).toBeTruthy();
    });

    it('shows the bundle price', () => {
      const { getByText } = renderComponent();
      expect(getByText(/\$1,020|\$1020/)).toBeTruthy();
    });

    it('renders the add-to-cart CTA button', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('bundle-suggestion-cta')).toBeTruthy();
    });

    it('CTA has accessibilityRole="button"', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('bundle-suggestion-cta').props.accessibilityRole).toBe('button');
    });
  });

  describe('add to cart interaction', () => {
    it('calls addBundleToCart when CTA is pressed', () => {
      mockUseBundleSuggestion.mockReturnValue(HAPPY_STATE);
      const { getByTestId } = renderComponent();
      fireEvent.press(getByTestId('bundle-suggestion-cta'));
      expect(mockAddBundleToCart).toHaveBeenCalledTimes(1);
    });

    it('shows loading state on CTA while isAddingToCart=true', () => {
      mockUseBundleSuggestion.mockReturnValue({ ...HAPPY_STATE, isAddingToCart: true });
      const { getByTestId } = renderComponent();
      expect(getByTestId('bundle-suggestion-cta-loading')).toBeTruthy();
    });

    it('disables CTA while isAddingToCart=true', () => {
      mockUseBundleSuggestion.mockReturnValue({ ...HAPPY_STATE, isAddingToCart: true });
      const { getByTestId } = renderComponent();
      expect(getByTestId('bundle-suggestion-cta').props.accessibilityState?.disabled).toBe(true);
    });

    it('shows success confirmation when addSuccess=true', () => {
      mockUseBundleSuggestion.mockReturnValue({ ...HAPPY_STATE, addSuccess: true });
      const { getByTestId } = renderComponent();
      expect(getByTestId('bundle-suggestion-success')).toBeTruthy();
    });

    it('shows a success message text when addSuccess=true', () => {
      mockUseBundleSuggestion.mockReturnValue({ ...HAPPY_STATE, addSuccess: true });
      const { getByText } = renderComponent();
      expect(getByText(/added to cart/i)).toBeTruthy();
    });
  });

  describe('testID forwarding', () => {
    it('uses custom testID on root element', () => {
      mockUseBundleSuggestion.mockReturnValue(HAPPY_STATE);
      const { getByTestId } = renderComponent(PRODUCT_A.id, 'my-bundle-suggestion');
      expect(getByTestId('my-bundle-suggestion')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('savings text is accessible', () => {
      mockUseBundleSuggestion.mockReturnValue(HAPPY_STATE);
      const { getByTestId } = renderComponent();
      expect(getByTestId('bundle-suggestion-savings')).toBeTruthy();
    });

    it('coupon code has testID for accessibility', () => {
      mockUseBundleSuggestion.mockReturnValue(HAPPY_STATE);
      const { getByTestId } = renderComponent();
      expect(getByTestId('bundle-suggestion-coupon')).toBeTruthy();
    });
  });
});
