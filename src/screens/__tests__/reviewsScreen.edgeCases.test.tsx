/**
 * Edge-case coverage for the Reviews section within ProductDetailScreen — cm-3z1 / cm-cov
 *
 * Covers:
 *  - Empty state (no reviews from either Stamped or local hook)
 *  - Load-more pagination: Stamped returns > 3 reviews → view-all shown
 *  - Rating distribution zero-count: all bars render with 0 count text
 *  - Submit review error banner rendered when submitError set
 *  - Offline: Stamped error falls back to local useReviews data
 *
 * Pure Jest / @testing-library/react-native. Mac-safe.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ProductDetailScreen } from '../ProductDetailScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';

// ── Standard mocks (complete set to prevent memory leaks) ─────────────────────

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

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

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/hooks/usePremium', () => ({
  PremiumProvider: ({ children }: any) => children,
  usePremium: () => ({
    isPremium: false,
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
    user: { id: 'user-1', email: 'test@example.com', displayName: 'Test User' },
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

jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    items: [],
    itemCount: 0,
    subtotal: 0,
    syncing: false,
    addItem: jest.fn(),
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    pendingSync: 0,
    isSyncing: false,
    loadItems: jest.fn(),
  }),
  CartProvider: ({ children }: any) => children,
}));

jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    addToCart: jest.fn(),
    submitReview: jest.fn(),
    referralShared: jest.fn(),
    arUsed: jest.fn(),
    wishlistAdd: jest.fn(),
  }),
}));

jest.mock('@/hooks/useProductResources', () => ({
  useProductResources: () => ({ resources: [], loading: false, error: null }),
}));

jest.mock('@/hooks/useProductReviews', () => ({
  useProductReviews: () => ({
    aggregate: { averageRating: 0, totalReviews: 0 },
    reviews: [],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@/hooks/useShippingEstimate', () => ({
  useShippingEstimate: () => ({
    icon: '🚚',
    label: '5–7 business days',
    badge: null,
    badgeStyle: null,
    options: [],
    isEstimate: true,
    isLoading: false,
    error: null,
  }),
  SHIPPING_ZIP_STORAGE_KEY: '@shipping_estimate_zip',
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
  }),
  useOptionalWixClient: () => null,
  WixProvider: ({ children }: any) => children,
}));

jest.mock('@/hooks/useBackInStockSubscription', () => ({
  useBackInStockSubscription: () => ({ isSubscribed: false, loading: false, toggle: jest.fn() }),
}));

jest.mock('@/hooks/useInventoryBadge', () => ({
  useInventoryBadge: () => ({ label: null, color: null }),
}));

jest.mock('@/hooks/useProductQA', () => ({
  useProductQA: () => ({
    questions: [],
    loading: false,
    fetchError: null,
    isSubmitting: false,
    submitError: null,
    submitSuccess: false,
    submitQuestion: jest.fn(),
    clearSubmitStatus: jest.fn(),
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('@/hooks/useReferral', () => ({
  useReferral: () => ({
    code: null,
    loading: false,
    error: null,
    creditsEarned: 0,
    referralCount: 0,
    shareUrl: null,
    referredByCode: null,
    storeReferredByCode: jest.fn(),
  }),
}));

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

jest.mock('@/services/arSupport', () => ({
  isARSupported: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/services/wix/config', () => ({ isWixConfigured: () => false }));

jest.mock('@/hooks/useAffirmDeepLink', () => ({
  useAffirmDeepLink: () => ({ deepLink: null, isLoading: false }),
}));

jest.mock('@/hooks/useAfterpayDeepLink', () => ({
  useAfterpayDeepLink: () => ({ deepLink: null, isLoading: false }),
}));

jest.mock('@/hooks/useBundleDeals', () => ({
  useBundleDeals: () => ({ bundles: [], isLoading: false, error: null }),
}));

jest.mock('@/hooks/useLoyaltyEarnEstimate', () => ({
  useLoyaltyEarnEstimate: () => ({
    pts: 0,
    tier: {
      id: 'trail-blazer',
      name: 'Trail Blazer',
      earnRate: 0.06,
      minPoints: 0,
      maxPoints: 999,
      color: '#888',
      badge: '',
    },
    loading: false,
    error: null,
  }),
}));

jest.mock('@/hooks/useCompleteTheLook', () => ({
  useCompleteTheLook: () => ({ products: [], isLoading: false, error: null }),
}));

jest.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

// ── Controllable mocks for reviews ────────────────────────────────────────────

const mockSubmitReview = jest.fn();
const mockSetShowForm = jest.fn();
const mockClearSubmitStatus = jest.fn();
const mockUseReviews = jest.fn();
const mockLoadMore = jest.fn();
const mockRefreshStamped = jest.fn();
const mockUseStampedReviews = jest.fn();

jest.mock('@/hooks/useReviews', () => ({
  useReviews: (...args: any[]) => mockUseReviews(...args),
}));

jest.mock('@/hooks/useStampedReviews', () => ({
  useStampedReviews: (...args: any[]) => mockUseStampedReviews(...args),
}));

// ── Shared fixtures ───────────────────────────────────────────────────────────

const ZERO_DIST_SUMMARY = {
  averageRating: 0,
  totalReviews: 0,
  distribution: [0, 0, 0, 0, 0],
};

const NO_REVIEWS_STAMPED = {
  reviews: [],
  summary: ZERO_DIST_SUMMARY,
  isLoading: false,
  error: null,
  hasMore: false,
  loadMore: mockLoadMore,
  refresh: mockRefreshStamped,
};

const FOUR_REVIEWS_STAMPED = {
  reviews: [
    {
      id: 'r1',
      productId: 'asheville-full',
      rating: 5,
      title: 'Great futon',
      body: 'Really love it',
      authorName: 'Alice',
      createdDate: '2026-01-01T00:00:00Z',
      helpfulCount: 3,
      photos: [],
      verifiedPurchase: true,
    },
    {
      id: 'r2',
      productId: 'asheville-full',
      rating: 4,
      title: 'Good value',
      body: 'Would buy again',
      authorName: 'Bob',
      createdDate: '2026-01-02T00:00:00Z',
      helpfulCount: 1,
      photos: [],
      verifiedPurchase: false,
    },
    {
      id: 'r3',
      productId: 'asheville-full',
      rating: 3,
      title: 'Decent',
      body: 'Nothing special',
      authorName: 'Charlie',
      createdDate: '2026-01-03T00:00:00Z',
      helpfulCount: 0,
      photos: [],
      verifiedPurchase: false,
    },
    {
      id: 'r4',
      productId: 'asheville-full',
      rating: 5,
      title: 'Amazing',
      body: 'Perfect for our apartment',
      authorName: 'Diane',
      createdDate: '2026-01-04T00:00:00Z',
      helpfulCount: 5,
      photos: [],
      verifiedPurchase: true,
    },
  ],
  summary: {
    averageRating: 4.2,
    totalReviews: 4,
    distribution: [0, 0, 1, 1, 2],
  },
  isLoading: false,
  error: null,
  hasMore: true,
  loadMore: mockLoadMore,
  refresh: mockRefreshStamped,
};

const BASE_REVIEWS_HOOK = {
  reviews: [],
  summary: ZERO_DIST_SUMMARY,
  sort: 'helpful' as const,
  setSort: jest.fn(),
  isSubmitting: false,
  submitReview: mockSubmitReview,
  markHelpful: jest.fn(),
  showForm: false,
  setShowForm: mockSetShowForm,
  hasReviews: false,
  submitError: null,
  submitSuccess: false,
  clearSubmitStatus: mockClearSubmitStatus,
};

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
  mockUseStampedReviews.mockReturnValue(NO_REVIEWS_STAMPED);
  mockUseReviews.mockReturnValue(BASE_REVIEWS_HOOK);
  mockLoadMore.mockResolvedValue(undefined);
  mockRefreshStamped.mockResolvedValue(undefined);
  mockSubmitReview.mockResolvedValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── 1. Empty state ────────────────────────────────────────────────────────────

describe('Reviews section — empty state', () => {
  it('shows reviews-empty-state when both Stamped and local hooks have no reviews', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('reviews-empty-state')).toBeTruthy();
  });

  it('shows "No Reviews Yet" message in empty state', () => {
    const { getByText } = renderDetail({ productId: 'asheville-full' });
    expect(getByText('No Reviews Yet')).toBeTruthy();
  });

  it('does not show review-summary in empty state', () => {
    const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(queryByTestId('review-summary')).toBeNull();
  });

  it('does not show sort options in empty state', () => {
    const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(queryByTestId('review-sort-options')).toBeNull();
  });

  it('does not show view-all-reviews button in empty state', () => {
    const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(queryByTestId('view-all-reviews')).toBeNull();
  });

  it('still shows write-review button when authenticated and no reviews yet', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('write-review-button')).toBeTruthy();
  });

  it('renders reviews illustration in empty state', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('reviews-illustration')).toBeTruthy();
  });
});

// ── 2. Load-more pagination ───────────────────────────────────────────────────

describe('Reviews — load-more pagination (Stamped)', () => {
  beforeEach(() => {
    mockUseStampedReviews.mockReturnValue(FOUR_REVIEWS_STAMPED);
  });

  it('renders review cards when Stamped returns reviews', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('review-card-r1')).toBeTruthy();
  });

  it('shows view-all-reviews when Stamped returns more than 3 reviews', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('view-all-reviews')).toBeTruthy();
  });

  it('pressing view-all-reviews calls onViewAllReviews prop', () => {
    const onViewAllReviews = jest.fn();
    const { getByTestId } = renderDetail({
      productId: 'asheville-full',
      onViewAllReviews,
    });
    fireEvent.press(getByTestId('view-all-reviews'));
    expect(onViewAllReviews).toHaveBeenCalledWith('asheville-full');
  });

  it('preview shows at most 3 review cards even when Stamped returns 4', () => {
    const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(queryByTestId('review-card-r1')).toBeTruthy();
    expect(queryByTestId('review-card-r2')).toBeTruthy();
    expect(queryByTestId('review-card-r3')).toBeTruthy();
    // r4 is beyond the 3-preview slice
    expect(queryByTestId('review-card-r4')).toBeNull();
  });

  it('does NOT show view-all when reviews count is exactly 3', () => {
    mockUseStampedReviews.mockReturnValue({
      ...FOUR_REVIEWS_STAMPED,
      reviews: FOUR_REVIEWS_STAMPED.reviews.slice(0, 3),
      summary: { ...FOUR_REVIEWS_STAMPED.summary, totalReviews: 3 },
    });
    const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
    // ProductDetailScreen only shows view-all when effectiveReviews.length > 3
    expect(queryByTestId('view-all-reviews')).toBeNull();
  });

  it('review-summary is shown when Stamped has reviews', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('review-summary')).toBeTruthy();
  });
});

// ── 3. Rating distribution — zero-count display ───────────────────────────────

describe('Reviews — rating distribution zero-count', () => {
  beforeEach(() => {
    // Stamped returns a review but all distribution counts are 0 (corrupted summary edge case)
    mockUseStampedReviews.mockReturnValue({
      reviews: [
        {
          id: 'r-only',
          productId: 'asheville-full',
          rating: 5,
          title: 'Good',
          body: 'Nice',
          authorName: 'Test',
          createdDate: '2026-01-01T00:00:00Z',
          helpfulCount: 0,
          photos: [],
          verifiedPurchase: false,
        },
      ],
      summary: {
        averageRating: 5.0,
        totalReviews: 1,
        distribution: [0, 0, 0, 0, 0], // all zero — edge case
      },
      isLoading: false,
      error: null,
      hasMore: false,
      loadMore: mockLoadMore,
      refresh: mockRefreshStamped,
    });
  });

  it('renders review-summary when reviews present even with zero-count distribution', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('review-summary')).toBeTruthy();
  });

  it('renders all five distribution rows (stars 1–5)', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    for (const star of [1, 2, 3, 4, 5]) {
      expect(getByTestId(`distribution-row-${star}`)).toBeTruthy();
    }
  });

  it('does not crash with all-zero distribution', () => {
    expect(() => renderDetail({ productId: 'asheville-full' })).not.toThrow();
  });

  it('zero-count bars display "0" as count text for all five star levels', () => {
    const { getAllByText } = renderDetail({ productId: 'asheville-full' });
    const zeros = getAllByText('0');
    // 5 distribution bars all show 0
    expect(zeros.length).toBeGreaterThanOrEqual(5);
  });
});

// ── 4. Submit review error banner ─────────────────────────────────────────────

describe('Reviews — submit error banner', () => {
  beforeEach(() => {
    mockUseStampedReviews.mockReturnValue(NO_REVIEWS_STAMPED);
    // Form is open, error is set
    mockUseReviews.mockReturnValue({
      ...BASE_REVIEWS_HOOK,
      showForm: true,
      submitError: 'Failed to submit your review. Please try again.',
    });
  });

  it('shows review-submit-error banner when submitError is set', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('review-submit-error')).toBeTruthy();
  });

  it('error banner has alert accessibility role', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('review-submit-error').props.accessibilityRole).toBe('alert');
  });

  it('review form still renders alongside error banner', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('review-form')).toBeTruthy();
  });

  it('no error banner when submitError is null', () => {
    mockUseReviews.mockReturnValue({
      ...BASE_REVIEWS_HOOK,
      showForm: true,
      submitError: null,
    });
    const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(queryByTestId('review-submit-error')).toBeNull();
  });
});

// ── 5. Offline / Stamped network error ───────────────────────────────────────

describe('Reviews — offline / Stamped network error fallback', () => {
  it('falls back to local useReviews data when Stamped has an error', () => {
    mockUseStampedReviews.mockReturnValue({
      ...NO_REVIEWS_STAMPED,
      error: 'Network request failed',
    });
    mockUseReviews.mockReturnValue({
      ...BASE_REVIEWS_HOOK,
      reviews: [
        {
          id: 'local-1',
          productId: 'asheville-full',
          rating: 5,
          title: 'Offline review',
          body: 'Written while offline',
          authorName: 'User',
          createdDate: '2026-01-01T00:00:00Z',
          helpfulCount: 0,
          photos: [],
          verifiedPurchase: false,
        },
      ],
      hasReviews: true,
    });

    const { queryByTestId, getByTestId } = renderDetail({ productId: 'asheville-full' });
    // Stamped error → stampedReady=false → falls back to useReviews local data
    expect(queryByTestId('reviews-empty-state')).toBeNull();
    expect(getByTestId('review-card-local-1')).toBeTruthy();
  });

  it('shows empty state when both Stamped errors and local hook has no reviews', () => {
    mockUseStampedReviews.mockReturnValue({
      ...NO_REVIEWS_STAMPED,
      error: 'Network request failed',
    });
    mockUseReviews.mockReturnValue({
      ...BASE_REVIEWS_HOOK,
      hasReviews: false,
    });

    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('reviews-empty-state')).toBeTruthy();
  });

  it('falls back to empty state when Stamped is loading and local has no reviews', () => {
    mockUseStampedReviews.mockReturnValue({
      ...NO_REVIEWS_STAMPED,
      isLoading: true,
      error: null,
    });
    mockUseReviews.mockReturnValue({
      ...BASE_REVIEWS_HOOK,
      hasReviews: false,
    });

    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    // stampedReady=false (isLoading=true) → falls through to useReviews → empty
    expect(getByTestId('reviews-empty-state')).toBeTruthy();
  });

  it('does not crash the screen when Stamped throws a network error', () => {
    mockUseStampedReviews.mockReturnValue({
      ...NO_REVIEWS_STAMPED,
      error: 'Connection refused',
    });
    expect(() => renderDetail({ productId: 'asheville-full' })).not.toThrow();
  });
});
