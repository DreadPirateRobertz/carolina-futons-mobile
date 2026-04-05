/**
 * TDD tests for ReorderConfirmationSheet — cm-bjq.
 *
 * Tests: rendering, all-in-stock, partial OOS, all OOS, empty order,
 * confirm/dismiss callbacks, button state, accessibility.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReorderConfirmationSheet } from '../ReorderConfirmationSheet';
import type { ReorderPreview } from '@/services/reorderService';
import { FUTON_MODELS, FABRICS } from '@/data/futons';
import { futonModelId } from '@/data/productId';
import type { OrderLineItem } from '@/data/orders';

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#2C1810',
      espressoLight: '#6B5B4F',
      sandLight: '#F5EDD8',
      sandBase: '#E8D5B7',
      white: '#FFFFFF',
      sunsetCoral: '#E8845C',
      successGreen: '#4CAF50',
      errorText: '#B85A38',
      warningAmber: '#F59E0B',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    borderRadius: { sm: 4, md: 8, lg: 16, pill: 20 },
    typography: {
      bodyFamily: 'System',
      bodyFamilyBold: 'System',
      headingFamily: 'System',
    },
  }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MODEL_A = FUTON_MODELS[0];
const MODEL_B = FUTON_MODELS[1];
const FABRIC_A = FABRICS[0];
const FABRIC_B = FABRICS[1];

const makeLineItem = (id: string, modelId: string, fabricId: string): OrderLineItem => ({
  id,
  modelId: futonModelId(modelId),
  modelName: MODEL_A.name,
  fabricId,
  fabricName: FABRIC_A.name,
  fabricColor: '#000',
  quantity: 1,
  unitPrice: 400,
  lineTotal: 400,
});

const allAvailablePreview: ReorderPreview = {
  available: [
    { lineItem: makeLineItem('li-1', MODEL_A.id, FABRIC_A.id), model: MODEL_A, fabric: FABRIC_A },
    { lineItem: makeLineItem('li-2', MODEL_B.id, FABRIC_B.id), model: MODEL_B, fabric: FABRIC_B },
  ],
  unavailable: [],
};

const partialPreview: ReorderPreview = {
  available: [
    { lineItem: makeLineItem('li-1', MODEL_A.id, FABRIC_A.id), model: MODEL_A, fabric: FABRIC_A },
  ],
  unavailable: [makeLineItem('li-2', MODEL_B.id, FABRIC_B.id)],
};

const allOOSPreview: ReorderPreview = {
  available: [],
  unavailable: [makeLineItem('li-1', MODEL_A.id, FABRIC_A.id)],
};

const emptyPreview: ReorderPreview = {
  available: [],
  unavailable: [],
};

const baseProps = {
  visible: true,
  orderNumber: 'CF-2026-0147',
  preview: allAvailablePreview,
  onConfirm: jest.fn(),
  onDismiss: jest.fn(),
};

function renderSheet(
  props?: Partial<typeof baseProps>,
) {
  return render(<ReorderConfirmationSheet {...baseProps} {...props} />);
}

beforeEach(() => jest.clearAllMocks());

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('ReorderConfirmationSheet — rendering', () => {
  it('renders when visible=true', () => {
    const { getByTestId } = renderSheet();
    expect(getByTestId('reorder-sheet')).toBeTruthy();
  });

  it('does not render when visible=false', () => {
    const { queryByTestId } = renderSheet({ visible: false });
    expect(queryByTestId('reorder-sheet')).toBeNull();
  });

  it('shows the order number in the title', () => {
    const { getByTestId } = renderSheet({ orderNumber: 'CF-2026-0147' });
    expect(getByTestId('reorder-sheet-title').props.children).toContain('CF-2026-0147');
  });

  it('renders a dismiss/close button', () => {
    const { getByTestId } = renderSheet();
    expect(getByTestId('reorder-sheet-close')).toBeTruthy();
  });
});

// ── All in stock ──────────────────────────────────────────────────────────────

describe('ReorderConfirmationSheet — all in stock', () => {
  it('renders all available items', () => {
    const { getByTestId } = renderSheet({ preview: allAvailablePreview });
    expect(getByTestId('reorder-item-li-1')).toBeTruthy();
    expect(getByTestId('reorder-item-li-2')).toBeTruthy();
  });

  it('does not render the out-of-stock section when all items are available', () => {
    const { queryByTestId } = renderSheet({ preview: allAvailablePreview });
    expect(queryByTestId('reorder-oos-section')).toBeNull();
  });

  it('confirm button shows correct count', () => {
    const { getByText } = renderSheet({ preview: allAvailablePreview });
    expect(getByText(/add 2/i)).toBeTruthy();
  });

  it('confirm button is enabled when items are available', () => {
    const { getByTestId } = renderSheet({ preview: allAvailablePreview });
    const btn = getByTestId('reorder-confirm-btn');
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBeFalsy();
  });

  it('calls onConfirm with all available items when confirmed', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = renderSheet({ preview: allAvailablePreview, onConfirm });
    fireEvent.press(getByTestId('reorder-confirm-btn'));
    expect(onConfirm).toHaveBeenCalledWith(allAvailablePreview.available);
  });
});

// ── Partial OOS ───────────────────────────────────────────────────────────────

describe('ReorderConfirmationSheet — partial OOS', () => {
  it('renders available items', () => {
    const { getByTestId } = renderSheet({ preview: partialPreview });
    expect(getByTestId('reorder-item-li-1')).toBeTruthy();
  });

  it('renders the out-of-stock section', () => {
    const { getByTestId } = renderSheet({ preview: partialPreview });
    expect(getByTestId('reorder-oos-section')).toBeTruthy();
  });

  it('renders OOS items in the unavailable section', () => {
    const { getByTestId } = renderSheet({ preview: partialPreview });
    expect(getByTestId('reorder-oos-item-li-2')).toBeTruthy();
  });

  it('confirm button count reflects only available items', () => {
    const { getByText } = renderSheet({ preview: partialPreview });
    expect(getByText(/add 1/i)).toBeTruthy();
  });

  it('calls onConfirm with only available items', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = renderSheet({ preview: partialPreview, onConfirm });
    fireEvent.press(getByTestId('reorder-confirm-btn'));
    expect(onConfirm).toHaveBeenCalledWith(partialPreview.available);
  });
});

// ── All OOS ───────────────────────────────────────────────────────────────────

describe('ReorderConfirmationSheet — all OOS', () => {
  it('shows the nothing-available message', () => {
    const { getByTestId } = renderSheet({ preview: allOOSPreview });
    expect(getByTestId('reorder-all-oos-message')).toBeTruthy();
  });

  it('confirm button is disabled when all items are OOS', () => {
    const { getByTestId } = renderSheet({ preview: allOOSPreview });
    const btn = getByTestId('reorder-confirm-btn');
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBeTruthy();
  });

  it('does not call onConfirm when confirm is pressed with all OOS', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = renderSheet({ preview: allOOSPreview, onConfirm });
    fireEvent.press(getByTestId('reorder-confirm-btn'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows the unavailable items', () => {
    const { getByTestId } = renderSheet({ preview: allOOSPreview });
    expect(getByTestId('reorder-oos-item-li-1')).toBeTruthy();
  });
});

// ── Empty order ───────────────────────────────────────────────────────────────

describe('ReorderConfirmationSheet — empty order', () => {
  it('shows an empty-order message', () => {
    const { getByTestId } = renderSheet({ preview: emptyPreview });
    expect(getByTestId('reorder-empty-message')).toBeTruthy();
  });

  it('confirm button is disabled for an empty order', () => {
    const { getByTestId } = renderSheet({ preview: emptyPreview });
    const btn = getByTestId('reorder-confirm-btn');
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBeTruthy();
  });
});

// ── Dismiss ───────────────────────────────────────────────────────────────────

describe('ReorderConfirmationSheet — dismiss', () => {
  it('calls onDismiss when the close button is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = renderSheet({ onDismiss });
    fireEvent.press(getByTestId('reorder-sheet-close'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when the overlay backdrop is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = renderSheet({ onDismiss });
    fireEvent.press(getByTestId('reorder-sheet-overlay'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

// ── Accessibility ─────────────────────────────────────────────────────────────

describe('ReorderConfirmationSheet — accessibility', () => {
  it('confirm button has accessibilityRole=button', () => {
    const { getByTestId } = renderSheet();
    expect(getByTestId('reorder-confirm-btn').props.accessibilityRole).toBe('button');
  });

  it('close button has accessibilityRole=button', () => {
    const { getByTestId } = renderSheet();
    expect(getByTestId('reorder-sheet-close').props.accessibilityRole).toBe('button');
  });
});
