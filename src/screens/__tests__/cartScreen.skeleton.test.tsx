import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { CartScreen } from '../CartScreen';
import { CartProvider, useCart } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockSwipeable = React.forwardRef(({ children, testID }: any) => (
    <View testID={testID}>{children}</View>
  ));
  MockSwipeable.displayName = 'MockSwipeable';
  return { __esModule: true, default: MockSwipeable };
});

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  AuthContext: { _currentValue: null },
}));

jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => ({
    points: 0,
    tier: 'bronze',
    nextTier: 'silver',
    pointsToNext: 500,
    progress: 0,
    loading: false,
    error: null,
    refreshPoints: jest.fn(),
  }),
}));

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => null,
}));

const asheville = FUTON_MODELS[0];
const naturalLinen = FABRICS[0];

function renderCart(
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

describe('CartScreen loading skeleton', () => {
  it('renders cart skeleton on initial mount before hydration completes', () => {
    const { getByTestId } = renderCart();
    expect(getByTestId('cart-skeleton')).toBeTruthy();
  });

  it('skeleton has accessibility label for screen readers', () => {
    const { getByTestId } = renderCart();
    const skeleton = getByTestId('cart-skeleton');
    expect(skeleton.props.accessibilityLabel).toBe('Loading cart');
  });

  it('skeleton contains SkeletonRow/SkeletonCard primitives', () => {
    const { getAllByLabelText } = renderCart();
    // SkeletonRow and SkeletonCard use accessibilityLabel="Loading"
    const loadingElements = getAllByLabelText('Loading');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('does not render empty-state when skeleton is showing', () => {
    const { queryByTestId } = renderCart();
    expect(queryByTestId('cart-skeleton')).toBeTruthy();
    expect(queryByTestId('cart-empty-state')).toBeNull();
  });

  it('replaces skeleton with empty state after hydration resolves with no items', async () => {
    const { getByTestId, queryByTestId } = renderCart();
    await waitFor(() => {
      expect(queryByTestId('cart-skeleton')).toBeNull();
    });
    expect(getByTestId('cart-empty-state')).toBeTruthy();
  });

  it('replaces skeleton with cart contents once items arrive', async () => {
    const { getByTestId, queryByTestId } = renderCart({}, [
      { model: asheville, fabric: naturalLinen, qty: 1 },
    ]);
    await waitFor(() => {
      expect(queryByTestId('cart-skeleton')).toBeNull();
    });
    expect(getByTestId('cart-item-asheville-full:natural-linen')).toBeTruthy();
  });

  it('does not show skeleton when cart already has items (seeded post-hydration)', async () => {
    const { queryByTestId } = renderCart({}, [{ model: asheville, fabric: naturalLinen, qty: 1 }]);
    await waitFor(() => {
      expect(queryByTestId('cart-item-asheville-full:natural-linen')).toBeTruthy();
    });
    expect(queryByTestId('cart-skeleton')).toBeNull();
  });
});
