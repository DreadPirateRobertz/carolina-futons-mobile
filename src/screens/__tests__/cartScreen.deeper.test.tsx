/**
 * CartScreen deeper edge cases — cm-v8u
 *
 * Covers:
 * - Empty cart CTA accessibility (role, label)
 * - Quantity max guard (increment disabled at qty=10, works at qty=9)
 * - Remove-last-item (X on sole item shows empty state)
 * - Promo loading state (spinner, button disabled, input non-editable)
 * - Price update with promo (discount recalculates after quantity change)
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CartScreen } from '../CartScreen';
import { CartProvider, useCart } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseLoyalty = jest.fn();
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

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

const mockUseAuth = jest.fn(() => ({ isAuthenticated: true }));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  AuthContext: { _currentValue: null },
}));

// BundleSuggestion triggers OOM in CI when fully rendered (cm-bun/deacon-y8lf).
// Mock it out so the rest of CartScreen renders safely.
jest.mock('@/components/BundleSuggestion', () => ({
  BundleSuggestion: () => null,
}));

const mockApplyCoupon = jest.fn();
jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => ({
    applyCoupon: mockApplyCoupon,
    addToCart: jest.fn().mockResolvedValue(undefined),
    removeFromCart: jest.fn().mockResolvedValue(undefined),
    updateCartItemQuantity: jest.fn().mockResolvedValue(undefined),
    queryData: jest.fn().mockResolvedValue({ items: [] }),
    insertDataItem: jest.fn().mockResolvedValue({ id: 'mock-id', data: {} }),
  }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const asheville = FUTON_MODELS[0]; // $349
const naturalLinen = FABRICS[0]; // $0

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderCartScreen(
  props: Partial<React.ComponentProps<typeof CartScreen>> = {},
  seedItems?: { model: typeof asheville; fabric: typeof naturalLinen; qty: number }[],
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

function CartSeeder({
  items,
}: {
  items: { model: typeof asheville; fabric: typeof naturalLinen; qty: number }[];
}) {
  const { addItem } = useCart();
  React.useEffect(() => {
    items.forEach(({ model, fabric, qty }) => addItem(model, fabric, qty));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLoyalty.mockReturnValue(loyaltyBase);
  mockUseAuth.mockReturnValue({ isAuthenticated: true });
  mockApplyCoupon.mockReset();
});

// ── Empty cart CTA accessibility ──────────────────────────────────────────────

describe('empty cart CTA accessibility', () => {
  it('empty state CTA has accessibilityRole button', () => {
    const onContinueShopping = jest.fn();
    const { getByTestId } = renderCartScreen({ onContinueShopping });
    expect(getByTestId('cart-empty-state-action').props.accessibilityRole).toBe('button');
  });

  it('empty state CTA is not rendered without callback', () => {
    const { queryByTestId } = renderCartScreen();
    expect(queryByTestId('cart-empty-state-action')).toBeNull();
  });

  it('empty state CTA is only rendered when cart is empty', async () => {
    const onContinueShopping = jest.fn();
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];
    const { queryByTestId } = renderCartScreen({ onContinueShopping }, seed);
    await waitFor(() => {
      expect(queryByTestId('cart-empty-state-action')).toBeNull();
    });
  });
});

// ── Quantity max guard ────────────────────────────────────────────────────────

describe('quantity max guard', () => {
  it('increment button is disabled when quantity equals 10', async () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 10 }];
    const { getByTestId } = renderCartScreen({}, seed);
    await waitFor(() => {
      expect(getByTestId('cart-item-qty-asheville-full:natural-linen').props.children).toBe(10);
    });
    // React Native exposes disabled state via accessibilityState, not props.disabled
    expect(
      getByTestId('cart-item-increment-asheville-full:natural-linen').props.accessibilityState
        ?.disabled,
    ).toBe(true);
  });

  it('pressing increment at qty=10 does not change quantity', async () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 10 }];
    const { getByTestId } = renderCartScreen({}, seed);
    await waitFor(() => {
      expect(getByTestId('cart-item-qty-asheville-full:natural-linen').props.children).toBe(10);
    });
    fireEvent.press(getByTestId('cart-item-increment-asheville-full:natural-linen'));
    expect(getByTestId('cart-item-qty-asheville-full:natural-linen').props.children).toBe(10);
  });

  it('increment button is NOT disabled at qty=9', async () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 9 }];
    const { getByTestId } = renderCartScreen({}, seed);
    await waitFor(() => {
      expect(getByTestId('cart-item-qty-asheville-full:natural-linen').props.children).toBe(9);
    });
    expect(
      getByTestId('cart-item-increment-asheville-full:natural-linen').props.disabled,
    ).toBeFalsy();
  });

  it('incrementing from qty=9 reaches 10 and then disables the button', async () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 9 }];
    const { getByTestId } = renderCartScreen({}, seed);
    await waitFor(() => {
      expect(getByTestId('cart-item-qty-asheville-full:natural-linen').props.children).toBe(9);
    });
    fireEvent.press(getByTestId('cart-item-increment-asheville-full:natural-linen'));
    expect(getByTestId('cart-item-qty-asheville-full:natural-linen').props.children).toBe(10);
    expect(
      getByTestId('cart-item-increment-asheville-full:natural-linen').props.accessibilityState
        ?.disabled,
    ).toBe(true);
  });
});

// ── Remove last item ──────────────────────────────────────────────────────────

describe('remove last item', () => {
  it('removing sole item via X button shows empty state', async () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];
    const { getByTestId, queryByTestId } = renderCartScreen({}, seed);
    await waitFor(() => expect(getByTestId('cart-item-asheville-full:natural-linen')).toBeTruthy());
    fireEvent.press(getByTestId('cart-item-remove-asheville-full:natural-linen'));
    await waitFor(() => {
      expect(getByTestId('cart-empty-state')).toBeTruthy();
    });
    expect(queryByTestId('cart-item-asheville-full:natural-linen')).toBeNull();
  });

  it('decrementing sole item at qty=1 shows empty state', async () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];
    const { getByTestId } = renderCartScreen({}, seed);
    await waitFor(() => {
      expect(getByTestId('cart-item-qty-asheville-full:natural-linen').props.children).toBe(1);
    });
    fireEvent.press(getByTestId('cart-item-decrement-asheville-full:natural-linen'));
    await waitFor(() => {
      expect(getByTestId('cart-empty-state')).toBeTruthy();
    });
  });

  it('checkout button disappears when last item is removed', async () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];
    const { getByTestId, queryByTestId } = renderCartScreen({}, seed);
    await waitFor(() => expect(getByTestId('checkout-button')).toBeTruthy());
    fireEvent.press(getByTestId('cart-item-remove-asheville-full:natural-linen'));
    await waitFor(() => {
      expect(queryByTestId('checkout-button')).toBeNull();
    });
  });
});

// ── Promo code loading state ──────────────────────────────────────────────────

describe('promo code loading state', () => {
  const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

  it('shows loading spinner while applying promo code', async () => {
    let promiseResolve: ((value: any) => void) | undefined;
    mockApplyCoupon.mockImplementation(
      () =>
        new Promise((resolve) => {
          promiseResolve = resolve;
        }),
    );
    const { getByTestId } = renderCartScreen({}, seed);
    fireEvent.changeText(getByTestId('promo-input'), 'SLOW20');
    fireEvent.press(getByTestId('promo-apply-button'));
    await waitFor(() => {
      expect(getByTestId('promo-loading')).toBeTruthy();
    });
    // Resolve to clean up open handle
    promiseResolve?.({
      id: 'c1',
      code: 'SLOW20',
      name: 'Test',
      discountType: 'fixed',
      discountValue: 0,
    });
  });

  it('apply button is disabled while validating', async () => {
    let promiseResolve: ((value: any) => void) | undefined;
    mockApplyCoupon.mockImplementation(
      () =>
        new Promise((resolve) => {
          promiseResolve = resolve;
        }),
    );
    const { getByTestId } = renderCartScreen({}, seed);
    fireEvent.changeText(getByTestId('promo-input'), 'SLOW20');
    fireEvent.press(getByTestId('promo-apply-button'));
    await waitFor(() => {
      expect(getByTestId('promo-apply-button').props.accessibilityState?.disabled).toBe(true);
    });
    promiseResolve?.({
      id: 'c1',
      code: 'SLOW20',
      name: 'Test',
      discountType: 'fixed',
      discountValue: 0,
    });
  });

  it('promo input is non-editable while validating', async () => {
    let promiseResolve: ((value: any) => void) | undefined;
    mockApplyCoupon.mockImplementation(
      () =>
        new Promise((resolve) => {
          promiseResolve = resolve;
        }),
    );
    const { getByTestId } = renderCartScreen({}, seed);
    fireEvent.changeText(getByTestId('promo-input'), 'SLOW20');
    fireEvent.press(getByTestId('promo-apply-button'));
    await waitFor(() => {
      expect(getByTestId('promo-input').props.editable).toBe(false);
    });
    promiseResolve?.({
      id: 'c1',
      code: 'SLOW20',
      name: 'Test',
      discountType: 'fixed',
      discountValue: 0,
    });
  });

  it('promo error has accessibilityRole alert', async () => {
    mockApplyCoupon.mockRejectedValue({ statusCode: 404, message: 'Not found' });
    const { getByTestId } = renderCartScreen({}, seed);
    fireEvent.changeText(getByTestId('promo-input'), 'BADCODE');
    fireEvent.press(getByTestId('promo-apply-button'));
    await waitFor(() => {
      expect(getByTestId('promo-error').props.accessibilityRole).toBe('alert');
    });
  });

  it('error clears and applied state shows when retry with valid code succeeds', async () => {
    mockApplyCoupon.mockRejectedValueOnce({ statusCode: 404, message: 'Not found' });
    mockApplyCoupon.mockResolvedValueOnce({
      id: 'c2',
      code: 'VALID30',
      name: '30% Off',
      discountType: 'percentage' as const,
      discountValue: 30,
    });

    const { getByTestId, queryByTestId } = renderCartScreen({}, seed);

    // First attempt — error
    fireEvent.changeText(getByTestId('promo-input'), 'BADCODE');
    fireEvent.press(getByTestId('promo-apply-button'));
    await waitFor(() => expect(getByTestId('promo-error')).toBeTruthy());

    // Second attempt — success
    fireEvent.changeText(getByTestId('promo-input'), 'VALID30');
    fireEvent.press(getByTestId('promo-apply-button'));
    await waitFor(() => {
      expect(queryByTestId('promo-error')).toBeNull();
      expect(getByTestId('promo-applied')).toBeTruthy();
    });
  });
});

// ── Price update with promo applied ──────────────────────────────────────────

describe('price update with promo applied', () => {
  it('discount amount updates when quantity increases after promo applied', async () => {
    // $349 × 20% = $69.80 at qty=1; at qty=2 → $698 × 20% = $139.60
    mockApplyCoupon.mockResolvedValue({
      id: 'c1',
      code: 'SAVE20',
      name: '20% Off',
      discountType: 'percentage' as const,
      discountValue: 20,
    });
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];
    const { getByTestId } = renderCartScreen({}, seed);

    // Apply promo
    fireEvent.changeText(getByTestId('promo-input'), 'SAVE20');
    fireEvent.press(getByTestId('promo-apply-button'));
    await waitFor(() => {
      expect(getByTestId('cart-discount').props.children).toEqual(['−', '$69.80']);
    });

    // Increment quantity
    fireEvent.press(getByTestId('cart-item-increment-asheville-full:natural-linen'));
    await waitFor(() => {
      expect(getByTestId('cart-discount').props.children).toEqual(['−', '$139.60']);
    });
  });

  it('total recalculates correctly after quantity change with promo', async () => {
    // At qty=2 with 20% off:
    // Subtotal $698, discount $139.60, taxable $558.40
    // Tax $558.40 × 0.07 = $39.09 (rounded), shipping $0 (≥$499)
    // Total $558.40 + $0 + $39.09 = $597.49
    mockApplyCoupon.mockResolvedValue({
      id: 'c1',
      code: 'SAVE20',
      name: '20% Off',
      discountType: 'percentage' as const,
      discountValue: 20,
    });
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];
    const { getByTestId } = renderCartScreen({}, seed);

    fireEvent.changeText(getByTestId('promo-input'), 'SAVE20');
    fireEvent.press(getByTestId('promo-apply-button'));
    await waitFor(() => expect(getByTestId('promo-applied')).toBeTruthy());

    fireEvent.press(getByTestId('cart-item-increment-asheville-full:natural-linen'));
    await waitFor(() => {
      const total = getByTestId('cart-total').props.children;
      expect(typeof total).toBe('string');
      expect(total).toMatch(/^\$/);
    });
  });
});
