/**
 * OrderDetailScreen — deeper edge-case tests (cm-2a2)
 *
 * Covers flows absent from orderDetailScreen.test.tsx and
 * orderDetailScreen.warrantyEntry.test.tsx:
 *   1. Item list — content rendering (name, fabric, qty, price, free shipping)
 *   2. Status transitions — badge text, timeline a11y label per status
 *   3. Cancel flow — no warranty button, no tracking, totals still shown
 *   4. Error / skeleton states — useOrders error + isLoading gates
 */

import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { OrderDetailScreen } from '../OrderDetailScreen';
import { CartProvider } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { MOCK_ORDERS } from '@/data/orders';

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve(true));

jest.mock('@/hooks/useRatingPrompt', () => ({
  useRatingPrompt: () => ({
    recordDelivery: jest.fn(),
    recordPurchase: jest.fn(),
    toggleDisabled: jest.fn(),
    disabled: false,
  }),
}));

// Mock useOrders so individual tests can control isLoading / error.
// jest.requireActual preserves ORDER_STATUS_CONFIG and type exports.
jest.mock('@/hooks/useOrders', () => {
  const actual = jest.requireActual('@/hooks/useOrders');
  return {
    ...actual,
    useOrders: jest.fn(),
  };
});

import { useOrders } from '@/hooks/useOrders';
const mockedUseOrders = useOrders as jest.Mock;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUseOrdersReturn(overrides: Partial<ReturnType<typeof useOrders>> = {}) {
  return {
    orders: MOCK_ORDERS,
    isLoading: false,
    error: null,
    statusFilter: null,
    setStatusFilter: jest.fn(),
    getOrder: (id: string) => MOCK_ORDERS.find((o) => o.id === id),
    refresh: jest.fn(),
    ...overrides,
  };
}

function renderOrderDetail(
  props: Partial<React.ComponentProps<typeof OrderDetailScreen>> & { orderId: string },
) {
  return render(
    <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
      <ThemeProvider>
        <CartProvider>
          <OrderDetailScreen {...props} />
        </CartProvider>
      </ThemeProvider>
    </ConnectivityProvider>,
  );
}

const ord001 = MOCK_ORDERS.find((o) => o.id === 'ord-001')!; // delivered, 1 item, free shipping
const ord002 = MOCK_ORDERS.find((o) => o.id === 'ord-002')!; // shipped,    2 items, free shipping
const ord003 = MOCK_ORDERS.find((o) => o.id === 'ord-003')!; // processing, 1 item, paid shipping
const ord004 = MOCK_ORDERS.find((o) => o.id === 'ord-004')!; // cancelled,  1 item, no tracking

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseOrders.mockReturnValue(makeUseOrdersReturn());
});

// ── 1. Item list — content rendering ─────────────────────────────────────────

describe('item list — content rendering', () => {
  it('shows "Items" section heading', () => {
    const { getByText } = renderOrderDetail({ orderId: 'ord-001' });
    expect(getByText('Items')).toBeTruthy();
  });

  it('displays model name for single-item order', () => {
    const { getByText } = renderOrderDetail({ orderId: 'ord-001' });
    expect(getByText(ord001.items[0].modelName)).toBeTruthy(); // "The Asheville"
  });

  it('displays fabric name for single-item order', () => {
    const { getByText } = renderOrderDetail({ orderId: 'ord-001' });
    expect(getByText(ord001.items[0].fabricName)).toBeTruthy(); // "Mountain Blue"
  });

  it('displays quantity for single-item order', () => {
    const { getByText } = renderOrderDetail({ orderId: 'ord-001' });
    expect(getByText(`Qty: ${ord001.items[0].quantity}`)).toBeTruthy(); // "Qty: 1"
  });

  it('displays formatted line total price', () => {
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
    // lineTotal = 378; use within to avoid ambiguity with subtotal (also $378.00)
    expect(within(getByTestId('order-line-item-li-001')).getByText('$378.00')).toBeTruthy();
  });

  it('displays all model names for multi-item order', () => {
    const { getByText } = renderOrderDetail({ orderId: 'ord-002' });
    expect(getByText(ord002.items[0].modelName)).toBeTruthy(); // "The Blue Ridge"
    expect(getByText(ord002.items[1].modelName)).toBeTruthy(); // "The Pisgah"
  });

  it('displays all fabric names for multi-item order', () => {
    const { getByText } = renderOrderDetail({ orderId: 'ord-002' });
    expect(getByText(ord002.items[0].fabricName)).toBeTruthy(); // "Espresso Brown"
    expect(getByText(ord002.items[1].fabricName)).toBeTruthy(); // "Natural Linen"
  });

  it('displays quantity for multi-item order item with qty > 1', () => {
    const { getByText } = renderOrderDetail({ orderId: 'ord-002' });
    // ord-002 item[1] has quantity=2; RNTL concatenates text nodes in getByText
    expect(getByText(/Qty: 2/)).toBeTruthy();
  });

  it('shows FREE for zero-cost shipping', () => {
    const { getByText } = renderOrderDetail({ orderId: 'ord-001' }); // shipping=0
    expect(getByText('FREE')).toBeTruthy();
  });

  it('shows formatted shipping price when non-zero', () => {
    const { getByText } = renderOrderDetail({ orderId: 'ord-003' }); // shipping=49
    expect(getByText('$49.00')).toBeTruthy();
  });

  it('shows subtotal row label', () => {
    const { getByText } = renderOrderDetail({ orderId: 'ord-001' });
    expect(getByText('Subtotal')).toBeTruthy();
  });

  it('shows tax row label', () => {
    const { getByText } = renderOrderDetail({ orderId: 'ord-001' });
    expect(getByText('Tax')).toBeTruthy();
  });

  it('shows correct subtotal amount', () => {
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-002' }); // subtotal=1056, unique
    expect(within(getByTestId('order-detail-totals')).getByText('$1056.00')).toBeTruthy();
  });
});

// ── 2. Status transitions — badge text and timeline a11y ─────────────────────

describe('status transitions — badge text and timeline accessibility', () => {
  it('status badge shows "Delivered" for delivered order', () => {
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
    // Badge and timeline both render "Delivered"; narrow to the badge element
    expect(within(getByTestId('order-detail-status')).getByText('Delivered')).toBeTruthy();
  });

  it('status badge shows "Shipped" for shipped order', () => {
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-002' });
    expect(within(getByTestId('order-detail-status')).getByText('Shipped')).toBeTruthy();
  });

  it('status badge shows "Processing" for processing order', () => {
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-003' });
    expect(within(getByTestId('order-detail-status')).getByText('Processing')).toBeTruthy();
  });

  it('status badge shows "Cancelled" for cancelled order', () => {
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-004' });
    expect(within(getByTestId('order-detail-status')).getByText('Cancelled')).toBeTruthy();
  });

  it('timeline has accessibility label describing current status for delivered order', () => {
    const { getByLabelText } = renderOrderDetail({ orderId: 'ord-001' });
    expect(getByLabelText(/order status: delivered/i)).toBeTruthy();
  });

  it('timeline has accessibility label for shipped order', () => {
    const { getByLabelText } = renderOrderDetail({ orderId: 'ord-002' });
    expect(getByLabelText(/order status: shipped/i)).toBeTruthy();
  });

  it('timeline has accessibility label for processing order', () => {
    const { getByLabelText } = renderOrderDetail({ orderId: 'ord-003' });
    expect(getByLabelText(/order status: processing/i)).toBeTruthy();
  });

  it('processing order renders all four timeline dot testIDs', () => {
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-003' });
    expect(getByTestId('timeline-dot-placed')).toBeTruthy();
    expect(getByTestId('timeline-dot-processing')).toBeTruthy();
    expect(getByTestId('timeline-dot-shipped')).toBeTruthy();
    expect(getByTestId('timeline-dot-delivered')).toBeTruthy();
  });

  it('shipped order renders all four timeline dot testIDs', () => {
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-002' });
    expect(getByTestId('timeline-dot-placed')).toBeTruthy();
    expect(getByTestId('timeline-dot-processing')).toBeTruthy();
    expect(getByTestId('timeline-dot-shipped')).toBeTruthy();
    expect(getByTestId('timeline-dot-delivered')).toBeTruthy();
  });

  it('timeline step labels are rendered for non-cancelled orders', () => {
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
    // Narrow to timeline to avoid ambiguity with status badge text
    const timeline = getByTestId('order-status-timeline');
    expect(within(timeline).getByText('Placed')).toBeTruthy();
    expect(within(timeline).getByText('Processing')).toBeTruthy();
    expect(within(timeline).getByText('Shipped')).toBeTruthy();
    expect(within(timeline).getByText('Delivered')).toBeTruthy();
  });
});

// ── 3. Cancel flow — no warranty, no tracking, totals still shown ─────────────

describe('cancel flow — cancelled order rendering', () => {
  it('does not show register-warranty button for cancelled order', () => {
    const { queryByTestId } = renderOrderDetail({ orderId: 'ord-004' });
    expect(queryByTestId('register-warranty-button')).toBeNull();
  });

  it('does not show tracking card for cancelled order without tracking', () => {
    const { queryByTestId } = renderOrderDetail({ orderId: 'ord-004' });
    expect(queryByTestId('order-tracking-card')).toBeNull();
  });

  it('does not show reorder button for cancelled order', () => {
    const { queryByTestId } = renderOrderDetail({ orderId: 'ord-004' });
    expect(queryByTestId('reorder-button')).toBeNull();
  });

  it('still shows totals card for cancelled order', () => {
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-004' });
    expect(getByTestId('order-detail-totals')).toBeTruthy();
  });

  it('shows correct total for cancelled order', () => {
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-004' });
    expect(getByTestId('order-detail-total').props.children).toBe('$425.86');
  });

  it('still shows line items for cancelled order', () => {
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-004' });
    expect(getByTestId('order-line-item-li-005')).toBeTruthy();
  });

  it('shows shipping address for cancelled order', () => {
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-004' });
    expect(getByTestId('order-shipping-address')).toBeTruthy();
  });

  it('shows payment method for cancelled order', () => {
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-004' });
    expect(getByTestId('order-payment-method')).toBeTruthy();
  });

  it('cancelled timeline does not have a11y label (renders cancel row instead)', () => {
    const { queryByLabelText } = renderOrderDetail({ orderId: 'ord-004' });
    expect(queryByLabelText(/order status:/i)).toBeNull();
  });
});

// ── 4. Error / skeleton states ────────────────────────────────────────────────

describe('error state — useOrders returns error with no cached orders', () => {
  it('shows order-detail-error view when hook returns error and no order', () => {
    mockedUseOrders.mockReturnValue(
      makeUseOrdersReturn({
        error: new Error('Network failure'),
        orders: [],
        isLoading: false,
        getOrder: () => undefined,
      }),
    );
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
    expect(getByTestId('order-detail-error')).toBeTruthy();
  });

  it('error view shows retry instruction text', () => {
    mockedUseOrders.mockReturnValue(
      makeUseOrdersReturn({
        error: new Error('Network failure'),
        orders: [],
        isLoading: false,
        getOrder: () => undefined,
      }),
    );
    const { getByText } = renderOrderDetail({ orderId: 'ord-001' });
    expect(getByText(/pull down to retry/i)).toBeTruthy();
  });

  it('does not show error view when order is available despite hook error', () => {
    // Error occurred but order was already in cache (orders array not empty)
    mockedUseOrders.mockReturnValue(
      makeUseOrdersReturn({
        error: new Error('Stale data'),
        orders: MOCK_ORDERS,
        isLoading: false,
        getOrder: (id) => MOCK_ORDERS.find((o) => o.id === id),
      }),
    );
    const { queryByTestId, getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
    expect(queryByTestId('order-detail-error')).toBeNull();
    expect(getByTestId('order-detail-screen')).toBeTruthy();
  });

  it('error view is bypassed when orders prop is provided directly', () => {
    mockedUseOrders.mockReturnValue(
      makeUseOrdersReturn({
        error: new Error('Network failure'),
        orders: [],
        isLoading: false,
        getOrder: () => undefined,
      }),
    );
    // ordersProp bypasses the hook-based error path entirely
    const { queryByTestId, getByTestId } = renderOrderDetail({
      orderId: 'ord-001',
      orders: MOCK_ORDERS,
    });
    expect(queryByTestId('order-detail-error')).toBeNull();
    expect(getByTestId('order-detail-screen')).toBeTruthy();
  });
});

describe('skeleton state — useOrders still loading with no cached orders', () => {
  it('shows skeleton when isLoading=true and orders is empty', () => {
    mockedUseOrders.mockReturnValue(
      makeUseOrdersReturn({
        isLoading: true,
        orders: [],
        getOrder: () => undefined,
      }),
    );
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
    expect(getByTestId('order-detail-skeleton')).toBeTruthy();
  });

  it('does not show skeleton when isLoading=true but orders array is non-empty', () => {
    mockedUseOrders.mockReturnValue(
      makeUseOrdersReturn({
        isLoading: true,
        orders: MOCK_ORDERS,
        getOrder: (id) => MOCK_ORDERS.find((o) => o.id === id),
      }),
    );
    const { queryByTestId, getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
    expect(queryByTestId('order-detail-skeleton')).toBeNull();
    expect(getByTestId('order-detail-screen')).toBeTruthy();
  });

  it('skeleton is bypassed when orders prop is provided directly', () => {
    mockedUseOrders.mockReturnValue(
      makeUseOrdersReturn({
        isLoading: true,
        orders: [],
        getOrder: () => undefined,
      }),
    );
    const { queryByTestId, getByTestId } = renderOrderDetail({
      orderId: 'ord-001',
      orders: MOCK_ORDERS,
    });
    expect(queryByTestId('order-detail-skeleton')).toBeNull();
    expect(getByTestId('order-detail-screen')).toBeTruthy();
  });
});
