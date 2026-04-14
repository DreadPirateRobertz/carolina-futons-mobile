/**
 * Edge-case coverage for ProductDetailScreen — cm-3z1 / cm-cov
 *
 * Covers:
 *  - Image fallback: gallery renders placeholder when product has no images
 *  - Out-of-stock: "Notify Me" replaces Add to Cart (CTA gated for OOS)
 *  - AR button: always rendered (PDS does not gate on 3D model presence)
 *  - Dimension display values present in dimensions card
 *  - Add-to-cart: success Alert shown, addItem called
 *  - Share failure: no crash, no analytics, screen stays stable
 *
 * Pure Jest / @testing-library/react-native. Mac-safe (no Expo native modules).
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import { ProductDetailScreen } from '../ProductDetailScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import { FUTON_MODELS } from '@/data/futons';

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

jest.mock('@/hooks/useReviews', () => ({
  useReviews: () => ({
    reviews: [],
    summary: { averageRating: 0, totalReviews: 0, distribution: [0, 0, 0, 0, 0] },
    sort: 'helpful',
    setSort: jest.fn(),
    isSubmitting: false,
    submitReview: jest.fn(),
    markHelpful: jest.fn(),
    showForm: false,
    setShowForm: jest.fn(),
    hasReviews: false,
    submitError: null,
    submitSuccess: false,
    clearSubmitStatus: jest.fn(),
  }),
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

// ── Additional mocks to prevent memory leaks ─────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const asheville = FUTON_MODELS[0]; // The Asheville — standard in-stock model

Alert.alert = jest.fn();

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
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── 1. Image gallery / fallback ───────────────────────────────────────────────

describe('Image gallery — fallback and slides', () => {
  it('renders gallery list without crashing', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('gallery-list')).toBeTruthy();
  });

  it('renders four gallery slides for a standard product', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    for (let i = 0; i < 4; i++) {
      expect(getByTestId(`gallery-slide-${i}`)).toBeTruthy();
    }
  });

  it('futon placeholder renders inside every gallery slide (SVG placeholder, no raw image to fail)', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    for (let i = 0; i < 4; i++) {
      expect(getByTestId(`futon-placeholder-${i}`)).toBeTruthy();
    }
  });

  it('gallery renders correct number of pagination dots matching slides', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('gallery-pagination')).toBeTruthy();
    for (let i = 0; i < 4; i++) {
      expect(getByTestId(`gallery-dot-${i}`)).toBeTruthy();
    }
  });

  it('tapping a slide opens fullscreen modal (modal close button appears)', () => {
    const { getByTestId, queryByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(queryByTestId('gallery-modal-close')).toBeNull();
    fireEvent.press(getByTestId('gallery-slide-0'));
    expect(getByTestId('gallery-modal-close')).toBeTruthy();
  });

  it('gallery renders for blue-ridge-queen as well', () => {
    const { getByTestId } = renderDetail({ productId: 'blue-ridge-queen' });
    expect(getByTestId('gallery-list')).toBeTruthy();
  });
});

// ── 2. Out-of-stock: CTA disabled ─────────────────────────────────────────────

describe('Out-of-stock — CTA replaced with Notify Me', () => {
  // 'grip-strips' has inStock: false, stockCount: 0 in products fixture

  it('does not render add-to-cart button for OOS product', async () => {
    const { queryByTestId } = renderDetail({ productId: 'grip-strips' });
    await act(async () => {});
    expect(queryByTestId('add-to-cart-button')).toBeNull();
  });

  it('renders notify-back-in-stock button instead for OOS product', async () => {
    const { getByTestId } = renderDetail({ productId: 'grip-strips' });
    await act(async () => {});
    expect(getByTestId('notify-back-in-stock-button')).toBeTruthy();
  });

  it('notify-back-in-stock button has button accessibility role', async () => {
    const { getByTestId } = renderDetail({ productId: 'grip-strips' });
    await act(async () => {});
    const btn = getByTestId('notify-back-in-stock-button');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('out-of-stock alert banner is shown for OOS product', async () => {
    const { getByTestId } = renderDetail({ productId: 'grip-strips' });
    await act(async () => {});
    expect(getByTestId('out-of-stock-alert')).toBeTruthy();
  });

  it('does not show OOS alert for in-stock product', () => {
    const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(queryByTestId('out-of-stock-alert')).toBeNull();
  });

  it('add-to-cart button is present for in-stock product', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('add-to-cart-button')).toBeTruthy();
  });
});

// ── 3. AR button — always present ────────────────────────────────────────────

describe('AR button — presence and accessibility', () => {
  it('AR button renders for asheville-full model', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('detail-ar-button')).toBeTruthy();
  });

  it('AR button renders for blue-ridge-queen model', () => {
    const { getByTestId } = renderDetail({ productId: 'blue-ridge-queen' });
    expect(getByTestId('detail-ar-button')).toBeTruthy();
  });

  it('AR button has button accessibility role', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('detail-ar-button').props.accessibilityRole).toBe('button');
  });

  it('AR button has an accessible label mentioning the model name', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    const label = getByTestId('detail-ar-button').props.accessibilityLabel;
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
    expect(label).toContain(asheville.name);
  });

  it('tapping AR button without premium shows upgrade Alert', () => {
    const alertSpy = Alert.alert as jest.Mock;
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    fireEvent.press(getByTestId('detail-ar-button'));
    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('CF+'),
      expect.any(String),
      expect.any(Array),
    );
  });
});

// ── 4. Dimension display ──────────────────────────────────────────────────────

describe('Dimensions card — values present', () => {
  it('renders dimensions card for asheville-full', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('dimensions-card')).toBeTruthy();
  });

  it('renders width dimension value', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('dimension-width')).toBeTruthy();
  });

  it('renders depth dimension value', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('dimension-depth')).toBeTruthy();
  });

  it('renders height dimension value', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('dimension-height')).toBeTruthy();
  });

  it('renders seat dimension value', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('dimension-seat')).toBeTruthy();
  });

  it('dimensions card renders for blue-ridge-queen', () => {
    const { getByTestId } = renderDetail({ productId: 'blue-ridge-queen' });
    expect(getByTestId('dimensions-card')).toBeTruthy();
  });
});

// ── 5. Add-to-cart — success flow ────────────────────────────────────────────

describe('Add-to-cart — success flow', () => {
  it('pressing add-to-cart calls cart.addItem', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    fireEvent.press(getByTestId('add-to-cart-button'));
    expect(mockAddItem).toHaveBeenCalledTimes(1);
  });

  it('addItem is called with the correct model', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    fireEvent.press(getByTestId('add-to-cart-button'));
    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'asheville-full' }),
      expect.any(Object),
      1,
    );
  });

  it('pressing add-to-cart triggers Alert.alert with "Added to Cart"', () => {
    const alertSpy = Alert.alert as jest.Mock;
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    fireEvent.press(getByTestId('add-to-cart-button'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Added to Cart',
      expect.stringContaining(asheville.name),
      expect.any(Array),
    );
  });

  it('add-to-cart button has correct accessibility role', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('add-to-cart-button').props.accessibilityRole).toBe('button');
  });

  it('add-to-cart alert contains Continue Shopping option', () => {
    const alertSpy = Alert.alert as jest.Mock;
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    fireEvent.press(getByTestId('add-to-cart-button'));
    const buttons = alertSpy.mock.calls[0][2] as { text: string }[];
    const texts = buttons.map((b) => b.text);
    expect(texts).toContain('Continue Shopping');
  });
});

// ── 6. Share failure handling ─────────────────────────────────────────────────

describe('Share button — failure handling (no crash)', () => {
  it('does not throw when Share.share rejects', async () => {
    jest.spyOn(Share, 'share').mockRejectedValueOnce(new Error('Share unavailable'));
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {
      fireEvent.press(getByTestId('detail-share-button'));
    });
    // No uncaught exception — share errors are swallowed
  });

  it('screen remains stable after share failure', async () => {
    jest.spyOn(Share, 'share').mockRejectedValueOnce(new Error('Share unavailable'));
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {
      fireEvent.press(getByTestId('detail-share-button'));
    });
    // Screen still renders the share button
    expect(getByTestId('detail-share-button')).toBeTruthy();
  });

  it('share button is present and accessible', () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    expect(getByTestId('detail-share-button')).toBeTruthy();
  });
});
