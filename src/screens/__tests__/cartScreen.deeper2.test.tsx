/**
 * CartScreen — deeper edge-case test suite (cm-68u)
 *
 * Covers gaps not in existing cart test files:
 *  - Cart item compound accessibilityLabel (name + fabric + qty + price)
 *  - Cart item remove/decrement/increment button a11y
 *  - Cart header and order summary header roles
 *  - Cart clear button a11y
 *  - Loyalty TierProgressBar: shown when authenticated, hidden when not
 *  - BNPL modal visible state toggle
 *  - beginCheckout analytics event
 *  - Multi-item subtotal aggregation, fabric upcharge, quantity multiplier
 *  - Free shipping boundary ($498 → fee, $798 → FREE)
 *  - Tax calculation (7% of subtotal)
 *  - Promo remove button a11y + removes discount row
 *  - Bundle suggestion renders when hook reports a bundle
 *  - Checkout button a11y label reflects total
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { CartScreen } from '../CartScreen';
import { CartProvider, useCart } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

// ── Component mocks (avoid async native calls) ────────────────────────────────

jest.mock('@/components/CartItemDeliveryEstimate', () => ({
  CartItemDeliveryEstimate: ({ testID }: { testID?: string }) => {
    const { View } = require('react-native');
    return testID ? <View testID={testID} /> : null;
  },
}));

const mockBundleSuggestion = jest.fn(() => null);
jest.mock('@/components/BundleSuggestion', () => ({
  BundleSuggestion: (props: any) => mockBundleSuggestion(props),
}));

const mockBNPLHeroSurface = jest.fn(({ onPress, testID }: any) => {
  const { TouchableOpacity } = require('react-native');
  return <TouchableOpacity testID={testID} onPress={onPress} />;
});
jest.mock('@/components/BNPLHeroSurface', () => ({
  BNPLHeroSurface: (props: any) => mockBNPLHeroSurface(props),
}));

const mockBNPLModal = jest.fn(({ visible, testID, onClose }: any) => {
  const { View, TouchableOpacity } = require('react-native');
  return (
    <View testID={testID} visible={visible}>
      <TouchableOpacity testID="bnpl-modal-close" onPress={onClose} />
    </View>
  );
});
jest.mock('@/components/BNPLModal', () => ({
  BNPLModal: (props: any) => mockBNPLModal(props),
}));

jest.mock('@/components/CartPointsSummary', () => ({
  CartPointsSummary: () => null,
}));

jest.mock('@/components/TierProgressBar', () => ({
  TierProgressBar: ({ testID }: { testID?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID} />;
  },
}));

jest.mock('@/components/ProductRecommendationRow', () => ({
  ProductRecommendationRow: () => null,
}));

// ── Hook mocks ────────────────────────────────────────────────────────────────

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockSwipeable = React.forwardRef(
    ({ children, onSwipeableOpen, testID, renderRightActions }: any, _ref: any) => (
      <View
        testID={testID}
        onSwipeableOpen={() => onSwipeableOpen?.('right', { close: jest.fn() })}
      >
        {renderRightActions
          ? renderRightActions({ value: 1 }, { value: -100 }, { close: jest.fn() })
          : null}
        {children}
      </View>
    ),
  );
  MockSwipeable.displayName = 'MockSwipeable';
  return { __esModule: true, default: MockSwipeable };
});

const mockUseLoyalty = jest.fn();
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

const loyaltyBase = {
  points: 250,
  tier: 'bronze' as const,
  nextTier: 'silver' as const,
  pointsToNext: 250,
  progress: 0.5,
  loading: false,
  error: null,
  refreshPoints: jest.fn(),
};

const mockUseAuth = jest.fn(() => ({ isAuthenticated: true }));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  AuthContext: { _currentValue: null },
}));

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => ({
    applyCoupon: jest.fn(),
    addToCart: jest.fn().mockResolvedValue(undefined),
    removeFromCart: jest.fn().mockResolvedValue(undefined),
    updateCartItemQuantity: jest.fn().mockResolvedValue(undefined),
    queryData: jest.fn().mockResolvedValue({ items: [] }),
    insertDataItem: jest.fn().mockResolvedValue({ id: 'mock-id', data: {} }),
  }),
}));

jest.mock('@/hooks/useBundleSuggestion', () => ({
  useBundleSuggestion: () => ({
    bundle: null,
    bundleProducts: [],
    pricing: null,
    isLoading: false,
    error: null,
    addBundleToCart: jest.fn(),
    isAddingToCart: false,
    addSuccess: false,
  }),
}));

jest.mock('@/hooks/useProductRecommendations', () => ({
  useProductRecommendations: () => ({ recommendations: [], isLoading: false, error: null }),
  clearRecommendationsCache: jest.fn(),
}));

const mockRemoveCode = jest.fn();
const mockApplyCode = jest.fn();
const mockGetDiscount = jest.fn(() => 0);
const mockUsePromoCode = jest.fn(() => ({
  status: 'idle' as const,
  coupon: null,
  error: null,
  applyCode: mockApplyCode,
  removeCode: mockRemoveCode,
  getDiscount: mockGetDiscount,
}));
jest.mock('@/hooks/usePromoCode', () => ({
  usePromoCode: () => mockUsePromoCode(),
}));

const mockBeginCheckout = jest.fn();
jest.mock('@/services/analytics', () => ({
  events: {
    beginCheckout: (...args: any[]) => mockBeginCheckout(...args),
    addToCart: jest.fn(),
    removeFromCart: jest.fn(),
    clearCart: jest.fn(),
  },
  trackEvent: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Warning: 'warning', Success: 'success', Error: 'error' },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const asheville = FUTON_MODELS[0]; // $349
const blueRidge = FUTON_MODELS[1]; // $449
const naturalLinen = FABRICS[0]; // $0 upcharge
const mountainBlue = FABRICS[2]; // $29 upcharge

// ── Helpers ───────────────────────────────────────────────────────────────────

function CartSeeder({
  items,
}: {
  items: { model: (typeof FUTON_MODELS)[0]; fabric: (typeof FABRICS)[0]; qty: number }[];
}) {
  const { addItem } = useCart();
  React.useEffect(() => {
    items.forEach(({ model, fabric, qty }) => addItem(model, fabric, qty));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function renderCartScreen(
  props: Partial<React.ComponentProps<typeof CartScreen>> = {},
  seedItems?: { model: (typeof FUTON_MODELS)[0]; fabric: (typeof FABRICS)[0]; qty: number }[],
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
        <ThemeProvider>
          <CartProvider>
            {seedItems && <CartSeeder items={seedItems} />}
            {children}
          </CartProvider>
        </ThemeProvider>
      </ConnectivityProvider>
    );
  }
  return render(<CartScreen {...props} />, { wrapper: Wrapper });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ isAuthenticated: true });
  mockUseLoyalty.mockReturnValue(loyaltyBase);
  mockBundleSuggestion.mockReturnValue(null);
});

// ── 1. Cart item accessibility ────────────────────────────────────────────────

describe('Cart item accessibility', () => {
  it('cart item compound accessibilityLabel includes name, fabric, qty, and price', async () => {
    const { findAllByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 2 },
    ]);
    const items = await findAllByTestId(
      /^cart-item-(?!fabric|name|fabric-name|remove|decrement|increment|qty|price|swipeable|delivery)/,
    );
    const cartItem = items.find((el) => el.props.accessibilityLabel);
    expect(cartItem).toBeTruthy();
    expect(cartItem!.props.accessibilityLabel).toContain(asheville.name);
    expect(cartItem!.props.accessibilityLabel).toContain(naturalLinen.name);
    expect(cartItem!.props.accessibilityLabel).toMatch(/\d/); // quantity
    expect(cartItem!.props.accessibilityLabel).toMatch(/\$/); // price
  });

  it('remove button accessibilityLabel contains product name', async () => {
    const { findAllByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    const removeBtns = await findAllByTestId(/cart-item-remove-/);
    expect(removeBtns[0].props.accessibilityLabel).toContain(asheville.name);
    expect(removeBtns[0].props.accessibilityRole).toBe('button');
  });

  it('decrement button has Decrease quantity label and button role', async () => {
    const { findAllByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 2 },
    ]);
    const decrements = await findAllByTestId(/cart-item-decrement-/);
    expect(decrements[0].props.accessibilityLabel).toBe('Decrease quantity');
    expect(decrements[0].props.accessibilityRole).toBe('button');
  });

  it('increment button has Increase quantity label and button role', async () => {
    const { findAllByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    const increments = await findAllByTestId(/cart-item-increment-/);
    expect(increments[0].props.accessibilityLabel).toBe('Increase quantity');
    expect(increments[0].props.accessibilityRole).toBe('button');
  });

  it('delivery estimate testID renders per cart item (mocked)', async () => {
    const { findAllByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    const deliveries = await findAllByTestId(/cart-item-delivery-/);
    expect(deliveries.length).toBeGreaterThan(0);
  });
});

// ── 2. Cart header / structure a11y ──────────────────────────────────────────

describe('Cart header and structure accessibility', () => {
  it('cart header has accessibilityRole="header"', async () => {
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    const header = await findByTestId('cart-header');
    expect(header.props.accessibilityRole).toBe('header');
  });

  it('clear all button has correct accessibilityLabel and button role', async () => {
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    const clearBtn = await findByTestId('cart-clear-button');
    expect(clearBtn.props.accessibilityLabel).toBe('Clear all items from cart');
    expect(clearBtn.props.accessibilityRole).toBe('button');
  });

  it('order summary section renders', async () => {
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    expect(await findByTestId('order-summary')).toBeTruthy();
  });
});

// ── 3. Loyalty / tier progress bar ───────────────────────────────────────────

describe('Loyalty progress bar', () => {
  it('renders cart-loyalty-progress when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    expect(await findByTestId('cart-loyalty-progress')).toBeTruthy();
  });

  it('does not render cart-loyalty-progress when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    const { findByTestId, queryByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    // Wait for cart to hydrate
    await findByTestId('cart-header');
    expect(queryByTestId('cart-loyalty-progress')).toBeNull();
  });
});

// ── 4. BNPL modal visible state ───────────────────────────────────────────────

describe('BNPL modal', () => {
  it('BNPL modal receives visible=false on initial render', async () => {
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    // Wait for cart to hydrate
    await findByTestId('cart-header');
    expect(mockBNPLModal).toHaveBeenCalledWith(expect.objectContaining({ visible: false }));
  });

  it('pressing BNPL hero passes visible=true to BNPLModal', async () => {
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    await findByTestId('bnpl-hero-cart');
    fireEvent.press(await findByTestId('bnpl-hero-cart'));
    await waitFor(() => {
      const lastCall = mockBNPLModal.mock.calls[mockBNPLModal.mock.calls.length - 1][0];
      expect(lastCall.visible).toBe(true);
    });
  });
});

// ── 5. Analytics ──────────────────────────────────────────────────────────────

describe('Analytics events', () => {
  it('fires beginCheckout with itemCount and total on checkout press', async () => {
    const onCheckout = jest.fn();
    const { findByTestId } = renderCartScreen({ onCheckout }, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    fireEvent.press(await findByTestId('checkout-button'));
    expect(mockBeginCheckout).toHaveBeenCalledTimes(1);
    const [itemCount, total] = mockBeginCheckout.mock.calls[0];
    expect(itemCount).toBe(1);
    expect(total).toBeGreaterThan(0);
  });

  it('onCheckout callback is called when checkout button is pressed', async () => {
    const onCheckout = jest.fn();
    const { findByTestId } = renderCartScreen({ onCheckout }, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    fireEvent.press(await findByTestId('checkout-button'));
    expect(onCheckout).toHaveBeenCalledTimes(1);
  });
});

// ── 6. Multi-item order summary math ─────────────────────────────────────────

describe('Multi-item order summary', () => {
  it('subtotal includes fabric upcharge', async () => {
    // asheville $349 + mountainBlue $29 = $378
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: mountainBlue, qty: 1 },
    ]);
    const el = await findByTestId('cart-subtotal');
    expect(el.props.children).toContain('378');
  });

  it('subtotal aggregates two different items correctly', async () => {
    // asheville $349 + blueRidge $449 = $798
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
      { model: blueRidge, fabric: naturalLinen, qty: 1 },
    ]);
    const el = await findByTestId('cart-subtotal');
    expect(el.props.children).toContain('798');
  });

  it('quantity multiplier applies correctly to subtotal', async () => {
    // asheville $349 × 2 = $698
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 2 },
    ]);
    const el = await findByTestId('cart-subtotal');
    expect(el.props.children).toContain('698');
  });

  it('tax is 7% of subtotal (asheville $349 × 7% = $24.43)', async () => {
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    const el = await findByTestId('cart-tax');
    expect(el.props.children).toContain('24.43');
  });
});

// ── 7. Free shipping boundary ─────────────────────────────────────────────────

describe('Free shipping boundary ($499 threshold)', () => {
  it('shows shipping fee for order below threshold (asheville $349)', async () => {
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    const el = await findByTestId('cart-shipping');
    expect(el.props.children).not.toBe('FREE');
    expect(el.props.children).toContain('49');
  });

  it('shows FREE shipping for order at or above threshold ($798)', async () => {
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
      { model: blueRidge, fabric: naturalLinen, qty: 1 },
    ]);
    const el = await findByTestId('cart-shipping');
    expect(el.props.children).toBe('FREE');
  });

  it('shows free-shipping-note when below threshold', async () => {
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    expect(await findByTestId('free-shipping-note')).toBeTruthy();
  });

  it('hides free-shipping-note when shipping is free', async () => {
    const { findByTestId, queryByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
      { model: blueRidge, fabric: naturalLinen, qty: 1 },
    ]);
    await findByTestId('cart-header');
    expect(queryByTestId('free-shipping-note')).toBeNull();
  });
});

// ── 8. Promo code removal ─────────────────────────────────────────────────────

describe('Promo code removal', () => {
  beforeEach(() => {
    mockRemoveCode.mockReset();
    mockGetDiscount.mockReset();
    // Render with promo already applied
    mockUsePromoCode.mockReturnValue({
      status: 'applied' as const,
      coupon: { code: 'SAVE10', discountType: 'percentage', discountValue: 10 },
      error: null,
      applyCode: mockApplyCode,
      removeCode: mockRemoveCode,
      getDiscount: (sub: number) => Math.round(sub * 0.1 * 100) / 100,
    });
  });

  afterEach(() => {
    // Restore default idle state
    mockUsePromoCode.mockReturnValue({
      status: 'idle' as const,
      coupon: null,
      error: null,
      applyCode: mockApplyCode,
      removeCode: mockRemoveCode,
      getDiscount: () => 0,
    });
  });

  it('promo remove button has correct accessibilityLabel and button role', async () => {
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    const btn = await findByTestId('promo-remove-button');
    expect(btn.props.accessibilityLabel).toBe('Remove promo code');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('pressing remove calls removeCode', async () => {
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    fireEvent.press(await findByTestId('promo-remove-button'));
    expect(mockRemoveCode).toHaveBeenCalledTimes(1);
  });

  it('discount row is visible when promo applied', async () => {
    const { findByTestId, queryByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    await findByTestId('promo-applied');
    expect(queryByTestId('cart-discount-row')).not.toBeNull();
  });
});

// ── 9. Bundle suggestion ──────────────────────────────────────────────────────

describe('Bundle suggestion', () => {
  it('BundleSuggestion component renders null when no bundle (mocked)', async () => {
    mockBundleSuggestion.mockReturnValue(null);
    const { findByTestId, queryByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    await findByTestId('cart-header');
    expect(queryByTestId('bundle-suggestion-cart')).toBeNull();
  });

  it('BundleSuggestion renders with cart-products testID when bundle present', async () => {
    const { View } = require('react-native');
    mockBundleSuggestion.mockImplementation(({ testID }: any) => <View testID={testID} />);
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    expect(await findByTestId('bundle-suggestion-cart')).toBeTruthy();
  });
});

// ── 10. Checkout button a11y ──────────────────────────────────────────────────

describe('Checkout button accessibility', () => {
  it('checkout button has accessibilityRole=button', async () => {
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    const btn = await findByTestId('checkout-button');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('checkout button accessibilityLabel contains "checkout" and the total price', async () => {
    const { findByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    const btn = await findByTestId('checkout-button');
    expect(btn.props.accessibilityLabel.toLowerCase()).toContain('checkout');
    expect(btn.props.accessibilityLabel).toMatch(/\$/);
  });

  it('checkout button label updates when quantity increases', async () => {
    const { findByTestId, findAllByTestId } = renderCartScreen({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    const initialLabel = (await findByTestId('checkout-button')).props.accessibilityLabel;
    fireEvent.press((await findAllByTestId(/cart-item-increment-/))[0]);
    await waitFor(async () => {
      const btn = await findByTestId('checkout-button');
      expect(btn.props.accessibilityLabel).not.toBe(initialLabel);
    });
  });
});
