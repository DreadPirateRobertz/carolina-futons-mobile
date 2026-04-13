/**
 * Tests for CartItemDeliveryEstimate — cm-afc.
 * TDD: tests written before implementation.
 *
 * Covers:
 * - no-zip: renders nothing
 * - loading: renders nothing
 * - local: renders delivery text with local badge
 * - parcel: renders delivery text
 * - freight: renders freight notice
 * - accessibility roles
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { CartItemDeliveryEstimate } from '../CartItemDeliveryEstimate';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { CartItem } from '@/hooks/useCart';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

// Mock the hook so component tests don't depend on AsyncStorage
const mockUseCartItemDeliveryEstimate = jest.fn();
jest.mock('@/hooks/useCartItemDeliveryEstimate', () => ({
  useCartItemDeliveryEstimate: (...args: unknown[]) => mockUseCartItemDeliveryEstimate(...args),
}));

const twin = FUTON_MODELS.find((m) => m.dimensions.width < 54) ?? FUTON_MODELS[0];
const linen = FABRICS[0];
const item: CartItem = {
  id: `${twin.id}:${linen.id}`,
  model: twin,
  fabric: linen,
  quantity: 1,
  unitPrice: twin.basePrice,
};

function renderEstimate(testID = 'delivery-estimate') {
  return render(
    <ThemeProvider>
      <CartItemDeliveryEstimate item={item} testID={testID} />
    </ThemeProvider>,
  );
}

describe('CartItemDeliveryEstimate (cm-afc)', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── no-zip / loading → renders nothing ────────────────────────────────────

  it('renders nothing while loading', () => {
    mockUseCartItemDeliveryEstimate.mockReturnValue({
      mode: 'no-zip',
      displayText: null,
      zip: '',
      isLoading: true,
    });
    const { queryByTestId } = renderEstimate();
    expect(queryByTestId('delivery-estimate')).toBeNull();
  });

  it('renders nothing for no-zip state', () => {
    mockUseCartItemDeliveryEstimate.mockReturnValue({
      mode: 'no-zip',
      displayText: null,
      zip: '',
      isLoading: false,
    });
    const { queryByTestId } = renderEstimate();
    expect(queryByTestId('delivery-estimate')).toBeNull();
  });

  // ── local state ────────────────────────────────────────────────────────────

  it('renders delivery text for local mode', () => {
    mockUseCartItemDeliveryEstimate.mockReturnValue({
      mode: 'local',
      displayText: '2–3 business days',
      zip: '28801',
      isLoading: false,
    });
    const { getByTestId } = renderEstimate();
    expect(getByTestId('delivery-estimate')).toBeTruthy();
  });

  it('shows the delivery text in local mode', () => {
    mockUseCartItemDeliveryEstimate.mockReturnValue({
      mode: 'local',
      displayText: '2–3 business days',
      zip: '28801',
      isLoading: false,
    });
    const { getByText } = renderEstimate();
    expect(getByText(/2–3 business days/)).toBeTruthy();
  });

  it('shows local badge pill for local mode', () => {
    mockUseCartItemDeliveryEstimate.mockReturnValue({
      mode: 'local',
      displayText: '2–3 business days',
      zip: '28801',
      isLoading: false,
    });
    const { getByTestId } = renderEstimate();
    expect(getByTestId('delivery-local-badge')).toBeTruthy();
  });

  // ── parcel state ───────────────────────────────────────────────────────────

  it('renders delivery text for parcel mode', () => {
    mockUseCartItemDeliveryEstimate.mockReturnValue({
      mode: 'parcel',
      displayText: '5–7 business days',
      zip: '10001',
      isLoading: false,
    });
    const { getByTestId } = renderEstimate();
    expect(getByTestId('delivery-estimate')).toBeTruthy();
  });

  it('shows the delivery text in parcel mode', () => {
    mockUseCartItemDeliveryEstimate.mockReturnValue({
      mode: 'parcel',
      displayText: '5–7 business days',
      zip: '10001',
      isLoading: false,
    });
    const { getByText } = renderEstimate();
    expect(getByText(/5–7 business days/)).toBeTruthy();
  });

  it('does not show local badge in parcel mode', () => {
    mockUseCartItemDeliveryEstimate.mockReturnValue({
      mode: 'parcel',
      displayText: '5–7 business days',
      zip: '10001',
      isLoading: false,
    });
    const { queryByTestId } = renderEstimate();
    expect(queryByTestId('delivery-local-badge')).toBeNull();
  });

  // ── freight state ──────────────────────────────────────────────────────────

  it('renders freight notice for freight mode', () => {
    mockUseCartItemDeliveryEstimate.mockReturnValue({
      mode: 'freight',
      displayText: 'Freight · Carrier will call to schedule',
      zip: '10001',
      isLoading: false,
    });
    const { getByTestId } = renderEstimate();
    expect(getByTestId('delivery-estimate')).toBeTruthy();
  });

  it('shows freight-specific text', () => {
    mockUseCartItemDeliveryEstimate.mockReturnValue({
      mode: 'freight',
      displayText: 'Freight · Carrier will call to schedule',
      zip: '10001',
      isLoading: false,
    });
    const { getByTestId } = renderEstimate();
    expect(getByTestId('delivery-freight-label')).toBeTruthy();
  });

  // ── accessibility ──────────────────────────────────────────────────────────

  it('has accessible text role for parcel delivery estimate', () => {
    mockUseCartItemDeliveryEstimate.mockReturnValue({
      mode: 'parcel',
      displayText: '5–7 business days',
      zip: '10001',
      isLoading: false,
    });
    const { getByTestId } = renderEstimate();
    const el = getByTestId('delivery-estimate');
    expect(el.props.accessibilityRole).toBe('text');
  });

  // ── testID forwarding ──────────────────────────────────────────────────────

  it('forwards custom testID', () => {
    mockUseCartItemDeliveryEstimate.mockReturnValue({
      mode: 'parcel',
      displayText: '5–7 business days',
      zip: '10001',
      isLoading: false,
    });
    const { getByTestId } = renderEstimate('my-custom-id');
    expect(getByTestId('my-custom-id')).toBeTruthy();
  });
});
