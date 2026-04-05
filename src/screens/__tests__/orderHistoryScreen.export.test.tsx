/**
 * TDD tests for OrderHistoryScreen — purchase export button (hq-a0d).
 *
 * Covers:
 *  - Export button renders in header
 *  - Tap calls sendExport
 *  - Loading state while sending
 *  - Success feedback after sent
 *  - Error feedback on failure
 *  - Button disabled while sending (prevents double-tap)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OrderHistoryScreen } from '../OrderHistoryScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { Order } from '@/data/orders';
import type { PurchaseExportStatus } from '@/hooks/usePurchaseExport';

// ── Module mocks ───────────────────────────────────────────────────────────────

const mockSendExport = jest.fn();
const mockUsePurchaseExport = jest.fn();

jest.mock('@/hooks/usePurchaseExport', () => ({
  usePurchaseExport: () => mockUsePurchaseExport(),
}));

const mockUseOrderHistory = jest.fn();
jest.mock('@/hooks/useOrderHistory', () => ({
  useOrderHistory: () => mockUseOrderHistory(),
}));

jest.mock('@/hooks/useOrders', () => ({
  ...jest.requireActual('@/hooks/useOrders'),
  useOrders: () => ({
    orders: [],
    isLoading: false,
    error: null,
    statusFilter: null,
    setStatusFilter: jest.fn(),
    getOrder: jest.fn(),
    refresh: jest.fn(),
  }),
  ORDER_STATUS_CONFIG: {
    processing: { label: 'Processing', colorToken: 'mountainBlue' },
    shipped: { label: 'Shipped', colorToken: 'mountainBlue' },
    delivered: { label: 'Delivered', colorToken: 'success' },
    cancelled: { label: 'Cancelled', colorToken: 'muted' },
  },
}));

jest.mock('@/hooks/useCart', () => ({
  ...jest.requireActual('@/hooks/useCart'),
  useCart: () => ({
    addItem: jest.fn(),
    items: [],
    itemCount: 0,
    subtotal: 0,
    syncing: false,
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    pendingSync: 0,
    isSyncing: false,
    loadItems: jest.fn(),
    syncError: null,
    clearSyncError: jest.fn(),
  }),
}));

jest.mock('@/hooks/useFutonModels', () => ({
  ...jest.requireActual('@/hooks/useFutonModels'),
  useFutonModels: () => ({
    models: [],
    fabrics: [],
    isLoading: false,
    error: null,
    getModel: jest.fn(),
    getModelById: jest.fn(),
    getFabric: jest.fn(),
    getModelForProduct: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

const DELIVERED_ORDER: Order = {
  id: 'ord-1',
  orderNumber: 'CF-2026-0001',
  status: 'delivered',
  createdAt: '2026-02-10T00:00:00Z',
  updatedAt: '2026-02-15T00:00:00Z',
  items: [
    {
      id: 'li-1',
      modelId: 'asheville-full' as any,
      modelName: 'The Asheville',
      fabricId: 'natural-linen',
      fabricName: 'Natural Linen',
      fabricColor: '#D4C5A9',
      quantity: 1,
      unitPrice: 349,
      lineTotal: 349,
    },
  ],
  subtotal: 349,
  shipping: 49,
  tax: 27.86,
  total: 425.86,
  shippingAddress: { name: 'Test', street: '1 Main', city: 'Asheville', state: 'NC', zip: '28801' },
  paymentMethod: 'Visa ····1234',
};

function makeOrderHistoryHook(overrides = {}) {
  return {
    orders: [DELIVERED_ORDER],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    statusFilter: null,
    setStatusFilter: jest.fn(),
    sheetOrder: null,
    reorderPreview: null,
    handleReorder: jest.fn(),
    handleConfirmReorder: jest.fn(),
    handleDismissSheet: jest.fn(),
    ...overrides,
  };
}

function makeExportHook(status: PurchaseExportStatus = 'idle', error: string | null = null) {
  return { status, error, sendExport: mockSendExport };
}

function renderScreen(props: Partial<React.ComponentProps<typeof OrderHistoryScreen>> = {}) {
  return render(
    <ThemeProvider>
      <OrderHistoryScreen {...props} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSendExport.mockResolvedValue(undefined);
  mockUseOrderHistory.mockReturnValue(makeOrderHistoryHook());
  mockUsePurchaseExport.mockReturnValue(makeExportHook('idle'));
});

// ── Export button presence ─────────────────────────────────────────────────────

describe('OrderHistoryScreen — export button', () => {
  it('renders the email export button', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('export-history-button')).toBeTruthy();
  });

  it('export button has an accessible label', () => {
    const { getByTestId } = renderScreen();
    const btn = getByTestId('export-history-button');
    expect(btn.props.accessibilityLabel).toBeTruthy();
  });
});

// ── Export button interaction ──────────────────────────────────────────────────

describe('OrderHistoryScreen — export button interaction', () => {
  it('calls sendExport when the button is tapped', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('export-history-button'));
    expect(mockSendExport).toHaveBeenCalledTimes(1);
  });
});

// ── Loading state ──────────────────────────────────────────────────────────────

describe('OrderHistoryScreen — export loading state', () => {
  it('shows loading indicator while sending', () => {
    mockUsePurchaseExport.mockReturnValue(makeExportHook('sending'));
    const { getByTestId } = renderScreen();
    expect(getByTestId('export-sending-indicator')).toBeTruthy();
  });

  it('disables the export button while sending', () => {
    mockUsePurchaseExport.mockReturnValue(makeExportHook('sending'));
    const { getByTestId } = renderScreen();
    const btn = getByTestId('export-history-button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('hides loading indicator when idle', () => {
    mockUsePurchaseExport.mockReturnValue(makeExportHook('idle'));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('export-sending-indicator')).toBeNull();
  });
});

// ── Success feedback ───────────────────────────────────────────────────────────

describe('OrderHistoryScreen — export success feedback', () => {
  it('shows success message when status is sent', () => {
    mockUsePurchaseExport.mockReturnValue(makeExportHook('sent'));
    const { getByTestId } = renderScreen();
    expect(getByTestId('export-success-message')).toBeTruthy();
  });

  it('does not show success message when idle', () => {
    mockUsePurchaseExport.mockReturnValue(makeExportHook('idle'));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('export-success-message')).toBeNull();
  });
});

// ── Error feedback ─────────────────────────────────────────────────────────────

describe('OrderHistoryScreen — export error feedback', () => {
  it('shows error message when status is error', () => {
    mockUsePurchaseExport.mockReturnValue(makeExportHook('error', 'Email service unavailable'));
    const { getByTestId } = renderScreen();
    expect(getByTestId('export-error-message')).toBeTruthy();
  });

  it('displays the error text', () => {
    mockUsePurchaseExport.mockReturnValue(makeExportHook('error', 'Email service unavailable'));
    const { getByText } = renderScreen();
    expect(getByText('Email service unavailable')).toBeTruthy();
  });

  it('does not show error message when idle', () => {
    mockUsePurchaseExport.mockReturnValue(makeExportHook('idle'));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('export-error-message')).toBeNull();
  });

  it('shows export button again after error (for retry)', () => {
    mockUsePurchaseExport.mockReturnValue(makeExportHook('error', 'Failed'));
    const { getByTestId } = renderScreen();
    expect(getByTestId('export-history-button')).toBeTruthy();
  });
});
