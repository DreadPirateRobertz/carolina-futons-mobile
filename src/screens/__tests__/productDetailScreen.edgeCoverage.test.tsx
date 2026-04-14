/**
 * ProductDetailScreen — deep edge-case coverage (cm-1cm)
 *
 * Covers gaps identified in the coverage audit:
 *   - Gallery placeholder rendered for each view
 *   - Out-of-stock: quantity selector absent, add-to-cart absent
 *   - Add-to-cart error: addItem throws → Alert suppressed
 *   - Dimension display — inch format values
 *   - Reviews: rating distribution zero-count rows
 *   - Reviews: submit error banner visible
 *   - Reviews: view-all invokes onViewAllReviews callback
 *   - Reviews: offline/error state falls back to empty-state
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ProductDetailScreen } from '../ProductDetailScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import { FUTON_MODELS } from '@/data/futons';
import type { ShippingEstimateResult } from '@/hooks/useShippingEstimate';

// ── Native bridge mocks ───────────────────────────────────────────────────────

jest.mock('expo-file-system', () => ({
  cacheDirectory: '/mock-cache/',
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: false })),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve('{}')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  downloadAsync: jest.fn(() =>
    Promise.resolve({ uri: '/mock-cache/product-img.jpg', status: 200 }),
  ),
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn(() =>
      Promise.resolve({ uri: '/mock-cache/models3d/model.glb', status: 200 }),
    ),
  })),
}));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/mock-cache/',
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: false })),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve('{}')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  downloadAsync: jest.fn(() =>
    Promise.resolve({ uri: '/mock-cache/product-img.jpg', status: 200 }),
  ),
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn(() =>
      Promise.resolve({ uri: '/mock-cache/models3d/model.glb', status: 200 }),
    ),
  })),
}));

jest.mock('@/services/uploadReviewPhoto', () => ({
  uploadReviewPhoto: jest.fn().mockResolvedValue('https://example.com/photo.jpg'),
}));

jest.mock('@/services/crossRigPushDispatch', () => ({
  dispatchCrossRigPush: jest.fn(() => Promise.resolve({ sent: 1, failed: 0 })),
  PUSH_EVENTS: { BADGE_EARNED: 'badge_earned', TIER_CHANGED: 'tier_changed' },
}));

// ── Controllable useReviews mock ──────────────────────────────────────────────

const mockReviewItems = Array.from({ length: 5 }, (_, i) => ({
  id: `edge-rev-${i}`,
  productId: 'asheville-full',
  authorName: `Reviewer ${i}`,
  rating: 5,
  title: 'Excellent',
  body: 'Great product.',
  createdAt: '2026-01-01T00:00:00Z',
  helpful: 0,
  verified: false,
  photos: [] as string[],
}));

const baseReviewsReturn = {
  reviews: mockReviewItems,
  summary: {
    averageRating: 4.2,
    totalReviews: 5,
    distribution: [0, 1, 0, 2, 2] as [number, number, number, number, number],
  },
  sort: 'helpful' as const,
  setSort: jest.fn(),
  isSubmitting: false,
  submitReview: jest.fn(),
  markHelpful: jest.fn(),
  showForm: false,
  setShowForm: jest.fn(),
  hasReviews: true,
  submitError: null as string | null,
  submitSuccess: false,
  clearSubmitStatus: jest.fn(),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUseReviews = jest.fn<any, [string]>(() => ({ ...baseReviewsReturn }));
jest.mock('@/hooks/useReviews', () => ({
  useReviews: (productId: string) => mockUseReviews(productId),
}));

// ── Other hook mocks ──────────────────────────────────────────────────────────

const mockShippingEstimateBase: ShippingEstimateResult = {
  icon: '🚚',
  label: '5–7 business days',
  badge: null,
  badgeStyle: null,
  options: [],
  isEstimate: true,
  isLoading: false,
  error: null,
};

jest.mock('@/hooks/useShippingEstimate', () => ({
  useShippingEstimate: jest.fn(() => ({ ...mockShippingEstimateBase })),
  SHIPPING_ZIP_STORAGE_KEY: '@shipping_estimate_zip',
}));

jest.mock('@/hooks/useProductReviews', () => ({
  useProductReviews: jest.fn(() => ({
    aggregate: { averageRating: 4.2, totalReviews: 5 },
    reviews: [],
    isLoading: false,
    error: null,
  })),
}));

jest.mock('@/hooks/useStampedReviews', () => ({
  useStampedReviews: jest.fn(() => ({
    reviews: [],
    summary: { averageRating: 0, totalReviews: 0, distribution: [0, 0, 0, 0, 0] },
    isLoading: false,
    error: null,
    hasMore: false,
    loadMore: jest.fn(),
    refresh: jest.fn(),
  })),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('@/hooks/usePremium', () => ({
  PremiumProvider: ({ children }: any) => children,
  usePremium: () => ({
    isPremium: true,
    isLoading: false,
    offerings: [],
    error: null,
    purchase: jest.fn(),
    restore: jest.fn(),
    refreshStatus: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'u1', email: 't@t.com', displayName: 'Tester' },
    loading: false,
    error: null,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signInWithGoogle: jest.fn(),
    signInWithApple: jest.fn(),
    resetPassword: jest.fn(),
    signOut: jest.fn(),
    clearError: jest.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}));

jest.mock('@/hooks/useRecommendations', () => ({
  useRecommendations: () => ({
    recentlyViewed: [],
    similarItems: [],
    alsoBoought: [],
    recommendedForYou: [],
    trackView: jest.fn(),
    trackPurchase: jest.fn(),
    clearHistory: jest.fn(),
  }),
  RecommendationsProvider: ({ children }: any) => children,
}));

jest.mock('@/hooks/useProductRecommendations', () => ({
  useProductRecommendations: () => ({ isLoading: false, recommendations: [], error: null }),
  clearRecommendationsCache: jest.fn(),
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

const mockAddItem = jest.fn();
jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    items: [],
    itemCount: 0,
    subtotal: 0,
    syncing: false,
    addItem: mockAddItem,
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    pendingSync: 0,
    isSyncing: false,
    loadItems: jest.fn(),
  }),
  CartProvider: ({ children }: any) => children,
}));

jest.mock('@/hooks/useProductResources', () => ({
  useProductResources: () => ({ resources: [], loading: false, error: null }),
}));

// Prevent useRecentlyViewed/Slugs state updates from leaking between renders
// and causing memory accumulation (same pattern as productDetailScreenARToast.test.tsx).
jest.mock('@/hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({
    recentProducts: [],
    addViewed: jest.fn(),
    clearAll: jest.fn(),
    count: 0,
  }),
}));

jest.mock('@/hooks/useRecentlyViewedSlugs', () => ({
  useRecentlyViewedSlugs: () => ({ slugs: [], addSlug: jest.fn() }),
}));

const mockAlert = jest.fn();
Alert.alert = mockAlert;

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderDetail(props: Partial<React.ComponentProps<typeof ProductDetailScreen>> = {}) {
  return render(
    <ThemeProvider>
      <CompareProvider>
        <WishlistProvider>
          <ProductDetailScreen {...props} />
        </WishlistProvider>
      </CompareProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseReviews.mockReturnValue({ ...baseReviewsReturn });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Gallery placeholder ───────────────────────────────────────────────────────

describe('ProductDetailScreen — gallery placeholders (image fallback)', () => {
  it('renders a futon-placeholder for each gallery view index (0–3)', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    for (let i = 0; i < 4; i++) {
      expect(getByTestId(`futon-placeholder-${i}`)).toBeTruthy();
    }
  });

  it('renders exactly 4 gallery slides', () => {
    const { getAllByTestId } = renderDetail({ productId: 'asheville-full' });
    const slides = getAllByTestId(/^gallery-slide-\d+$/);
    expect(slides.length).toBe(4);
  });
});

// ── Out-of-stock CTA ──────────────────────────────────────────────────────────

describe('ProductDetailScreen — out-of-stock CTA disabled', () => {
  // 'grip-strips' is a catalog product with inStock: false, stockCount: 0.
  // Using a real OOS product avoids Wix mock complexity.
  function renderOOS() {
    const result = renderDetail({ productId: 'grip-strips' });
    return result;
  }

  it('hides quantity selector when product is out of stock', async () => {
    const { queryByTestId } = renderOOS();
    await act(async () => {});
    expect(queryByTestId('quantity-selector')).toBeNull();
  });

  it('hides add-to-cart button when product is out of stock', async () => {
    const { queryByTestId } = renderOOS();
    await act(async () => {});
    expect(queryByTestId('add-to-cart-button')).toBeNull();
  });

  it('shows notify-back-in-stock button when product is out of stock', async () => {
    const { getByTestId } = renderOOS();
    await act(async () => {});
    expect(getByTestId('notify-back-in-stock-button')).toBeTruthy();
  });

  it('notify-me button default accessibility label is unsubscribed state', async () => {
    const { getByTestId } = renderOOS();
    await act(async () => {});
    const btn = getByTestId('notify-back-in-stock-button');
    expect(btn.props.accessibilityLabel).toBe('Notify me when back in stock');
  });
});

// ── Add-to-cart error ─────────────────────────────────────────────────────────

describe('ProductDetailScreen — add-to-cart error handling', () => {
  it('does not call Alert when addItem throws synchronously', () => {
    mockAddItem.mockImplementation(() => {
      throw new Error('cart storage full');
    });
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(() => fireEvent.press(getByTestId('add-to-cart-button'))).toThrow('cart storage full');
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('shows success Alert with product name when addItem succeeds', () => {
    mockAddItem.mockImplementation(() => {});
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    fireEvent.press(getByTestId('add-to-cart-button'));
    expect(mockAlert).toHaveBeenCalledWith(
      'Added to Cart',
      expect.stringContaining('Asheville'),
      expect.any(Array),
    );
  });

  it('resets quantity to 1 after successful add to cart', () => {
    mockAddItem.mockImplementation(() => {});
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    fireEvent.press(getByTestId('quantity-increment'));
    fireEvent.press(getByTestId('quantity-increment'));
    expect(getByTestId('quantity-value').props.children).toBe(3);
    fireEvent.press(getByTestId('add-to-cart-button'));
    expect(getByTestId('quantity-value').props.children).toBe(1);
  });
});

// ── Dimension display ─────────────────────────────────────────────────────────

describe('ProductDetailScreen — dimensions', () => {
  it('renders all four dimension fields', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('dimension-width')).toBeTruthy();
    expect(getByTestId('dimension-depth')).toBeTruthy();
    expect(getByTestId('dimension-height')).toBeTruthy();
    expect(getByTestId('dimension-seat')).toBeTruthy();
  });

  it('displays width and depth as inch-formatted strings for Asheville', () => {
    const { getByText } = renderDetail({ productId: 'asheville-full' });
    const model = FUTON_MODELS.find((m) => m.id === 'asheville-full')!;
    expect(getByText(`${model.dimensions.width}"`)).toBeTruthy();
    expect(getByText(`${model.dimensions.depth}"`)).toBeTruthy();
  });

  it('renders dimensions card', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('dimensions-card')).toBeTruthy();
  });
});

// ── Reviews: rating distribution zero-count ───────────────────────────────────

describe('ProductDetailScreen — reviews distribution zero-count', () => {
  it('renders distribution rows for all five star levels', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    for (const star of [5, 4, 3, 2, 1]) {
      expect(getByTestId(`distribution-row-${star}`)).toBeTruthy();
    }
  });

  it('distribution rows render when most star counts are zero', () => {
    // Only 3-star has a count; 1, 2, 4, 5 are zero
    mockUseReviews.mockReturnValue({
      ...baseReviewsReturn,
      summary: {
        averageRating: 3,
        totalReviews: 1,
        distribution: [0, 0, 1, 0, 0] as [number, number, number, number, number],
      },
    });
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    // All 5 rows should still render even when counts are zero
    for (const star of [1, 2, 3, 4, 5]) {
      expect(getByTestId(`distribution-row-${star}`)).toBeTruthy();
    }
  });
});

// ── Reviews: submit error banner ──────────────────────────────────────────────

describe('ProductDetailScreen — review submit error banner', () => {
  it('shows error banner when submitError is set and form is open', () => {
    mockUseReviews.mockReturnValue({
      ...baseReviewsReturn,
      submitError: 'Failed to submit review. Please try again.',
      showForm: true,
    });
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('review-submit-error')).toBeTruthy();
  });

  it('error banner has accessibility role of alert', () => {
    mockUseReviews.mockReturnValue({
      ...baseReviewsReturn,
      submitError: 'Network error',
      showForm: true,
    });
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('review-submit-error').props.accessibilityRole).toBe('alert');
  });

  it('does NOT show error banner when submitError is null', () => {
    mockUseReviews.mockReturnValue({
      ...baseReviewsReturn,
      submitError: null,
      showForm: true,
    });
    const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(queryByTestId('review-submit-error')).toBeNull();
  });

  it('does NOT show error banner when form is closed even if submitError is set', () => {
    mockUseReviews.mockReturnValue({
      ...baseReviewsReturn,
      submitError: 'stale error',
      showForm: false,
    });
    const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(queryByTestId('review-submit-error')).toBeNull();
  });
});

// ── Reviews: view-all callback ────────────────────────────────────────────────

describe('ProductDetailScreen — reviews view-all', () => {
  // baseReviewsReturn already has 5 reviews (mockReviewItems), so view-all renders by default.

  it('view-all button calls onViewAllReviews with the correct productId', () => {
    const onViewAllReviews = jest.fn();
    const { getByTestId } = renderDetail({ productId: 'asheville-full', onViewAllReviews });
    fireEvent.press(getByTestId('view-all-reviews'));
    expect(onViewAllReviews).toHaveBeenCalledWith('asheville-full');
  });

  it('view-all button absent when hasReviews is true but only 3 or fewer reviews', () => {
    mockUseReviews.mockReturnValue({
      ...baseReviewsReturn,
      reviews: mockReviewItems.slice(0, 2), // only 2 reviews
      hasReviews: true,
    });
    const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(queryByTestId('view-all-reviews')).toBeNull();
  });

  it('view-all button press does not throw when onViewAllReviews not provided', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(() => fireEvent.press(getByTestId('view-all-reviews'))).not.toThrow();
  });
});

// ── Reviews: offline / error state ───────────────────────────────────────────

describe('ProductDetailScreen — reviews offline / error state', () => {
  it('shows empty state when hasReviews is false (no network data)', () => {
    mockUseReviews.mockReturnValue({
      ...baseReviewsReturn,
      reviews: [],
      hasReviews: false,
    });
    const { getByTestId, queryByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('reviews-empty-state')).toBeTruthy();
    expect(queryByTestId('review-sort-options')).toBeNull();
  });

  it('shows reviews illustration inside empty state', () => {
    mockUseReviews.mockReturnValue({
      ...baseReviewsReturn,
      reviews: [],
      hasReviews: false,
    });
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('reviews-illustration')).toBeTruthy();
  });

  it('write-review button still appears in empty state for authenticated users', () => {
    mockUseReviews.mockReturnValue({
      ...baseReviewsReturn,
      reviews: [],
      hasReviews: false,
    });
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('write-review-button')).toBeTruthy();
  });
});
