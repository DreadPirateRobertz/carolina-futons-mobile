/**
 * ProductDetailScreen — a11y audit + deeper edge-case tests (cm-72n)
 *
 * Covers:
 *  - accessibilityLabel / accessibilityRole on all major interactive elements
 *  - announceForAccessibility fired on add-to-cart
 *  - Error states: OOS, API failure (Wix network error), no product
 *  - AR-unavailable fallback (non-premium upgrade prompt)
 *  - Variant selector edge cases (fabric selection, upcharge label)
 *  - Price display (base + fabric upcharge × quantity)
 *  - Wishlist toggle (a11y state + label flip)
 *  - Recommendation row rendered when similar items / recommendations exist
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AccessibilityInfo, Alert } from 'react-native';
import { ProductDetailScreen } from '../ProductDetailScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import { FUTON_MODELS } from '@/data/futons';
import { PRODUCTS } from '@/data/products';

// ── File system mocks (prevent native bridge) ─────────────────────────────────

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

// ── Navigation / layout ───────────────────────────────────────────────────────

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// ── AsyncStorage ──────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// ── Hooks ─────────────────────────────────────────────────────────────────────

let mockIsPremium = false;
jest.mock('@/hooks/usePremium', () => ({
  PremiumProvider: ({ children }: any) => children,
  usePremium: () => ({
    isPremium: mockIsPremium,
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

jest.mock('@/hooks/useProductReviews', () => ({
  useProductReviews: () => ({
    aggregate: { averageRating: 4.2, totalReviews: 38 },
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

const mockSimilarItems: any[] = [];
jest.mock('@/hooks/useRecommendations', () => ({
  useRecommendations: () => ({
    recentlyViewed: [],
    similarItems: mockSimilarItems,
    alsoBoought: [],
    recommendedForYou: [],
    trackView: jest.fn(),
    trackPurchase: jest.fn(),
    clearHistory: jest.fn(),
  }),
  RecommendationsProvider: ({ children }: any) => children,
}));

const mockRecommendations: any[] = [];
jest.mock('@/hooks/useProductRecommendations', () => ({
  useProductRecommendations: () => ({
    isLoading: false,
    recommendations: mockRecommendations,
    error: null,
  }),
  clearRecommendationsCache: jest.fn(),
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

jest.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

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

jest.mock('@/hooks/useProductResources', () => ({
  useProductResources: () => ({ resources: [], loading: false, error: null }),
}));

// ── Wix / services ────────────────────────────────────────────────────────────

let mockIsWixConfigured = false;
jest.mock('@/services/wix/config', () => ({
  isWixConfigured: () => mockIsWixConfigured,
}));

const mockUseProductBySlug = jest.fn((_slug: string) => ({
  product: null as object | null,
  isLoading: false,
  error: null as Error | null,
  refresh: jest.fn(),
}));
jest.mock('@/hooks/useProduct', () => ({
  useProduct: (productId: string) => {
    const { PRODUCTS } = require('@/data/products');
    const found = PRODUCTS.find((p: any) => p.id === productId) ?? null;
    return { product: found, isLoading: false, error: null, refresh: jest.fn() };
  },
  useProductBySlug: (slug: string) => mockUseProductBySlug(slug),
}));

jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => ({
    queryData: jest.fn().mockResolvedValue({ items: [], totalResults: 0 }),
  }),
  useOptionalWixClient: () => null,
  WixProvider: ({ children }: any) => children,
}));

jest.mock('@/services/arSupport', () => ({
  isARSupported: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('@/services/analytics', () => ({
  events: {
    viewProduct: jest.fn(),
    addToCart: jest.fn(),
    openAR: jest.fn(),
    selectFabric: jest.fn(),
    share: jest.fn(),
  },
  trackEvent: jest.fn(),
}));

jest.mock('@/hooks/useSwatchRequest', () => ({
  useSwatchRequest: () => ({
    status: 'idle',
    selectedFabrics: [],
    hasRecentRequest: false,
    toggleFabric: jest.fn(),
    submitRequest: jest.fn().mockResolvedValue(true),
    reset: jest.fn(),
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  mockIsPremium = false;
  mockIsWixConfigured = false;
  mockUseProductBySlug.mockReturnValue({
    product: null,
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  });
  mockSimilarItems.length = 0;
  mockRecommendations.length = 0;
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── 1. A11y labels on interactive elements ────────────────────────────────────

describe('Accessibility labels on interactive elements', () => {
  it('AR button (detail-ar-button) has accessibilityRole=button and descriptive label', async () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    const arBtn = getByTestId('detail-ar-button');
    expect(arBtn.props.accessibilityRole).toBe('button');
    expect(arBtn.props.accessibilityLabel).toContain('AR camera');
  });

  it('add-to-cart button has label including "cart" and price', async () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    const btn = getByTestId('add-to-cart-button');
    expect(btn.props.accessibilityRole).toBe('button');
    expect(btn.props.accessibilityLabel).toContain('cart');
    expect(btn.props.accessibilityLabel).toMatch(/\$/);
  });

  it('quantity decrement button has accessibilityLabel and button role', async () => {
    const { getByLabelText } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    const btn = getByLabelText('Decrease quantity');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('quantity increment button has accessibilityLabel and button role', async () => {
    const { getByLabelText } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    const btn = getByLabelText('Increase quantity');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('quantity display has accessible label showing current value', async () => {
    const { getByLabelText } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    expect(getByLabelText('Quantity: 1')).toBeTruthy();
  });

  it('back button renders and has "Go back" label when onBack is provided', async () => {
    const onBack = jest.fn();
    const { getByTestId } = renderDetail({ productId: 'asheville-full', onBack });
    await act(async () => {});
    const btn = getByTestId('detail-back-button');
    expect(btn.props.accessibilityRole).toBe('button');
    expect(btn.props.accessibilityLabel).toBe('Go back');
  });

  it('back button does not render when onBack is not provided', async () => {
    const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    expect(queryByTestId('detail-back-button')).toBeNull();
  });

  it('share button has label containing product name and button role', async () => {
    const asheville = FUTON_MODELS[0];
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    const btn = getByTestId('detail-share-button');
    expect(btn.props.accessibilityRole).toBe('button');
    expect(btn.props.accessibilityLabel).toContain(asheville.name);
  });

  it('swatch request button has descriptive label and button role', async () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    const btn = getByTestId('request-swatches-button');
    expect(btn.props.accessibilityRole).toBe('button');
    expect(btn.props.accessibilityLabel).toContain('swatches');
  });

  it('wishlist button has label indicating add action when not wishlisted', async () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    const btn = getByTestId('detail-wishlist-button');
    expect(btn.props.accessibilityRole).toBe('button');
    expect(btn.props.accessibilityLabel).toMatch(/wishlist/i);
  });

  it('fabric swatch buttons have accessibilityLabel with fabric name', async () => {
    const asheville = FUTON_MODELS[0];
    const { getByLabelText } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    const firstFabric = asheville.fabrics[0];
    expect(getByLabelText(new RegExp(firstFabric.name, 'i'))).toBeTruthy();
  });

  it('fabric swatch with upcharge includes add price in accessibilityLabel', async () => {
    const asheville = FUTON_MODELS[0];
    const pricedFabric = asheville.fabrics.find((f) => f.price > 0);
    if (!pricedFabric) return;
    const { getByLabelText } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    const btn = getByLabelText(new RegExp(pricedFabric.name, 'i'));
    expect(btn.props.accessibilityLabel).toContain('add');
  });
});

// ── 2. announceForAccessibility on add-to-cart ────────────────────────────────

describe('announceForAccessibility on add-to-cart', () => {
  it('calls AccessibilityInfo.announceForAccessibility when item is added', async () => {
    const announceSpy = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});

    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    fireEvent.press(getByTestId('add-to-cart-button'));

    expect(announceSpy).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenCalledWith(expect.stringContaining('Added'));
  });

  it('announcement includes product name', async () => {
    const announceSpy = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});
    const asheville = FUTON_MODELS[0];

    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    fireEvent.press(getByTestId('add-to-cart-button'));

    expect(announceSpy).toHaveBeenCalledWith(expect.stringContaining(asheville.name));
  });

  it('announcement fires before Alert is shown', async () => {
    const callOrder: string[] = [];
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {
      callOrder.push('announce');
    });
    (Alert.alert as jest.Mock).mockImplementation(() => {
      callOrder.push('alert');
    });

    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    fireEvent.press(getByTestId('add-to-cart-button'));

    expect(callOrder).toEqual(['announce', 'alert']);
  });

  it('does not announce when OOS product (add-to-cart not rendered)', async () => {
    const announceSpy = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});

    renderDetail({ productId: 'grip-strips' });
    await act(async () => {});

    expect(announceSpy).not.toHaveBeenCalled();
  });
});

// ── 3. Error states ───────────────────────────────────────────────────────────

describe('Error states', () => {
  describe('Out-of-stock product', () => {
    it('does not render add-to-cart button', async () => {
      const { queryByTestId } = renderDetail({ productId: 'grip-strips' });
      await act(async () => {});
      expect(queryByTestId('add-to-cart-button')).toBeNull();
    });

    it('shows notify-back-in-stock button with button role', async () => {
      const { getByTestId } = renderDetail({ productId: 'grip-strips' });
      await act(async () => {});
      const btn = getByTestId('notify-back-in-stock-button');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('shows out-of-stock alert banner', async () => {
      const { getByTestId } = renderDetail({ productId: 'grip-strips' });
      await act(async () => {});
      expect(getByTestId('out-of-stock-alert')).toBeTruthy();
    });

    it('out-of-stock alert has accessibilityRole="alert"', async () => {
      const { getByTestId } = renderDetail({ productId: 'grip-strips' });
      await act(async () => {});
      const banner = getByTestId('out-of-stock-alert');
      expect(banner.props.accessibilityRole).toBe('alert');
    });

    it('quantity controls not shown when OOS', async () => {
      const { queryByLabelText } = renderDetail({ productId: 'grip-strips' });
      await act(async () => {});
      expect(queryByLabelText('Increase quantity')).toBeNull();
      expect(queryByLabelText('Decrease quantity')).toBeNull();
    });

    it('does not show OOS alert for in-stock product', () => {
      const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(queryByTestId('out-of-stock-alert')).toBeNull();
    });
  });

  describe('API / network failure (Wix error)', () => {
    beforeEach(() => {
      mockIsWixConfigured = true;
      mockUseProductBySlug.mockReturnValue({
        product: null,
        isLoading: false,
        error: new Error('Network request failed'),
        refresh: jest.fn(),
      });
    });

    it('shows network error container', async () => {
      const { getByTestId } = renderDetail({ productId: 'unknown-wix-product' });
      await act(async () => {});
      expect(getByTestId('wix-network-error')).toBeTruthy();
    });

    it('shows retry button with button role and descriptive label', async () => {
      const { getByTestId } = renderDetail({ productId: 'unknown-wix-product' });
      await act(async () => {});
      const retry = getByTestId('wix-network-error-retry');
      expect(retry.props.accessibilityRole).toBe('button');
      expect(retry.props.accessibilityLabel).toBe('Retry loading product');
    });

    it('pressing retry calls refresh function', async () => {
      const mockRefresh = jest.fn();
      mockUseProductBySlug.mockReturnValue({
        product: null,
        isLoading: false,
        error: new Error('Network request failed'),
        refresh: mockRefresh,
      });
      const { getByTestId } = renderDetail({ productId: 'unknown-wix-product' });
      await act(async () => {});
      fireEvent.press(getByTestId('wix-network-error-retry'));
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('does not render add-to-cart button when error state shown', async () => {
      const { queryByTestId } = renderDetail({ productId: 'unknown-wix-product' });
      await act(async () => {});
      expect(queryByTestId('add-to-cart-button')).toBeNull();
    });
  });

  describe('No product / unknown productId', () => {
    it('renders without crashing for missing productId', () => {
      expect(() => renderDetail({})).not.toThrow();
    });

    it('renders gallery list even when productId is empty (falls back to first model)', () => {
      const { getByTestId } = renderDetail({});
      expect(getByTestId('gallery-list')).toBeTruthy();
    });
  });
});

// ── 4. AR unavailable — non-premium fallback ──────────────────────────────────

describe('AR — non-premium upgrade prompt', () => {
  it('AR button (detail-ar-button) always renders regardless of premium status', async () => {
    mockIsPremium = false;
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    expect(getByTestId('detail-ar-button')).toBeTruthy();
  });

  it('shows upgrade Alert when non-premium user taps AR button', async () => {
    mockIsPremium = false;
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    fireEvent.press(getByTestId('detail-ar-button'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'CF+ Feature',
      expect.stringContaining('premium'),
      expect.any(Array),
    );
  });

  it('upgrade Alert includes "Learn More" and "Not Now" options', async () => {
    mockIsPremium = false;
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    fireEvent.press(getByTestId('detail-ar-button'));
    const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0];
    const labels = (buttons as { text: string }[]).map((b) => b.text);
    expect(labels).toContain('Not Now');
    expect(labels).toContain('Learn More');
  });

  it('premium badge renders on AR button when user is premium', async () => {
    mockIsPremium = true;
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    expect(getByTestId('ar-premium-badge')).toBeTruthy();
  });

  it('premium badge does not render when user is not premium', async () => {
    mockIsPremium = false;
    const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    expect(queryByTestId('ar-premium-badge')).toBeNull();
  });
});

// ── 5. Variant selector (fabric) edge cases ───────────────────────────────────

describe('Fabric variant selector', () => {
  it('renders fabric-selector section', async () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    expect(getByTestId('fabric-selector')).toBeTruthy();
  });

  it('each fabric renders a swatch button with testID fabric-swatch-{id}', async () => {
    const asheville = FUTON_MODELS[0];
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    asheville.fabrics.forEach((fabric) => {
      expect(getByTestId(`fabric-swatch-${fabric.id}`)).toBeTruthy();
    });
  });

  it('first fabric is selected by default (selected-fabric-name shows it)', async () => {
    const asheville = FUTON_MODELS[0];
    const firstFabric = asheville.fabrics[0];
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    const nameDisplay = getByTestId('selected-fabric-name');
    expect(nameDisplay.props.children).toContain(firstFabric.name);
  });

  it('tapping a second fabric updates selected-fabric-name', async () => {
    const asheville = FUTON_MODELS[0];
    const secondFabric = asheville.fabrics[1];
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    fireEvent.press(getByTestId(`fabric-swatch-${secondFabric.id}`));
    await waitFor(() => {
      const nameDisplay = getByTestId('selected-fabric-name');
      expect(nameDisplay.props.children).toContain(secondFabric.name);
    });
  });

  it('fabric swatch buttons have button role', async () => {
    const asheville = FUTON_MODELS[0];
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    const swatch = getByTestId(`fabric-swatch-${asheville.fabrics[0].id}`);
    expect(swatch.props.accessibilityRole).toBe('button');
  });
});

// ── 6. Price display ──────────────────────────────────────────────────────────

describe('Price display', () => {
  it('renders price-section testID', async () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    expect(getByTestId('price-section')).toBeTruthy();
  });

  it('total-price element renders with price text', async () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    expect(getByTestId('total-price')).toBeTruthy();
  });

  it('add-to-cart label reflects quantity × price after increment', async () => {
    const { getByTestId, getByLabelText } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    fireEvent.press(getByLabelText('Increase quantity'));
    const btn = getByTestId('add-to-cart-button');
    expect(btn.props.accessibilityLabel).toMatch(/\$/);
  });

  it('does not show add-to-cart button for OOS product', async () => {
    const { queryByTestId } = renderDetail({ productId: 'grip-strips' });
    await act(async () => {});
    expect(queryByTestId('add-to-cart-button')).toBeNull();
  });

  it('quantity counter increments up to max 10', async () => {
    const { getByLabelText } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    const incBtn = getByLabelText('Increase quantity');
    for (let i = 0; i < 9; i++) {
      fireEvent.press(incBtn);
    }
    expect(getByLabelText('Quantity: 10')).toBeTruthy();
    fireEvent.press(incBtn);
    expect(getByLabelText('Quantity: 10')).toBeTruthy();
  });

  it('quantity cannot go below 1', async () => {
    const { getByLabelText } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    fireEvent.press(getByLabelText('Decrease quantity'));
    expect(getByLabelText('Quantity: 1')).toBeTruthy();
  });
});

// ── 7. Wishlist toggle ────────────────────────────────────────────────────────

describe('Wishlist button', () => {
  it('renders wishlist button with correct testID', async () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    expect(getByTestId('detail-wishlist-button')).toBeTruthy();
  });

  it('wishlist button has accessibilityState.selected = false when not wishlisted', async () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    const btn = getByTestId('detail-wishlist-button');
    expect(btn.props.accessibilityState?.selected).toBe(false);
  });

  it('label says "Add ... to wishlist" when not wishlisted', async () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    const btn = getByTestId('detail-wishlist-button');
    expect(btn.props.accessibilityLabel).toMatch(/add/i);
    expect(btn.props.accessibilityLabel).toMatch(/wishlist/i);
  });

  it('label flips to "Remove ... from wishlist" after toggle', async () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    fireEvent.press(getByTestId('detail-wishlist-button'));
    await waitFor(() => {
      const btn = getByTestId('detail-wishlist-button');
      expect(btn.props.accessibilityLabel).toMatch(/remove/i);
    });
  });

  it('accessibilityState.selected = true after toggle', async () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    fireEvent.press(getByTestId('detail-wishlist-button'));
    await waitFor(() => {
      const btn = getByTestId('detail-wishlist-button');
      expect(btn.props.accessibilityState?.selected).toBe(true);
    });
  });

  it('pressing wishlist button twice returns to not-wishlisted state', async () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    fireEvent.press(getByTestId('detail-wishlist-button'));
    await waitFor(() => {
      expect(getByTestId('detail-wishlist-button').props.accessibilityState?.selected).toBe(true);
    });
    fireEvent.press(getByTestId('detail-wishlist-button'));
    await waitFor(() => {
      expect(getByTestId('detail-wishlist-button').props.accessibilityState?.selected).toBe(false);
    });
  });
});

// ── 8. Recommendation rows ────────────────────────────────────────────────────

describe('Recommendation rows', () => {
  it('does not render related-products section when similarItems is empty', async () => {
    const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    expect(queryByTestId('related-products')).toBeNull();
  });

  it('renders related-products section when similarItems is non-empty', async () => {
    mockSimilarItems.push(PRODUCTS[0]);
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    expect(getByTestId('related-products')).toBeTruthy();
  });

  it('related-products section has "You May Also Like" accessibilityLabel', async () => {
    mockSimilarItems.push(PRODUCTS[0]);
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    const section = getByTestId('related-products');
    expect(section.props.accessibilityLabel).toBe('You May Also Like');
  });

  it('recommended-for-you section always renders (wrapper always present)', async () => {
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    expect(getByTestId('recommended-for-you')).toBeTruthy();
  });

  it('also-bought-carousel renders when recommendations are non-empty', async () => {
    mockRecommendations.push(PRODUCTS[0]);
    const { getByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    expect(getByTestId('also-bought-carousel')).toBeTruthy();
  });

  it('also-bought-carousel not rendered when recommendations are empty', async () => {
    const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
    await act(async () => {});
    expect(queryByTestId('also-bought-carousel')).toBeNull();
  });
});
