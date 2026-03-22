/**
 * Tests for ShippingEstimatePanel component — cm-9yn
 * TDD: tests written before implementation.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { ShippingEstimatePanel } from '../ShippingEstimatePanel';

// ── Mock the hook ─────────────────────────────────────────────────────────────

const mockSetZip = jest.fn();
let mockHookState = {
  zip: '',
  setZip: mockSetZip,
  rate: null as null | {
    amount: string;
    carrier: string;
    serviceLevel: string;
    isEstimate: boolean;
    isFreight: boolean;
  },
  isLoading: false,
  error: null as Error | null,
};

jest.mock('@/hooks/useProductShippingEstimate', () => ({
  useProductShippingEstimate: () => mockHookState,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPanel(overrides?: Partial<typeof mockHookState>) {
  mockHookState = { zip: '', setZip: mockSetZip, rate: null, isLoading: false, error: null, ...overrides };
  return render(
    <ThemeProvider>
      <ShippingEstimatePanel
        productId="prod-001"
        dimensions={{ width: 60, depth: 36, height: 35 }}
        testID="shipping-panel"
      />
    </ThemeProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ShippingEstimatePanel (cm-9yn)', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Render ─────────────────────────────────────────────────────────────────

  it('renders with testID', () => {
    const { getByTestId } = renderPanel();
    expect(getByTestId('shipping-panel')).toBeTruthy();
  });

  it('renders zip input field', () => {
    const { getByTestId } = renderPanel();
    expect(getByTestId('shipping-zip-input')).toBeTruthy();
  });

  // ── No zip state ───────────────────────────────────────────────────────────

  it('shows "Enter zip for shipping estimate" prompt when zip is empty', () => {
    const { getByText } = renderPanel({ zip: '' });
    expect(getByText('Enter zip for shipping estimate')).toBeTruthy();
  });

  it('does not show rate section when zip is empty', () => {
    const { queryByTestId } = renderPanel({ zip: '' });
    expect(queryByTestId('shipping-rate-result')).toBeNull();
  });

  // ── Zip input interaction ──────────────────────────────────────────────────

  it('calls setZip when user types in zip input', () => {
    const { getByTestId } = renderPanel();
    fireEvent.changeText(getByTestId('shipping-zip-input'), '28801');
    expect(mockSetZip).toHaveBeenCalledWith('28801');
  });

  // ── Loading state ──────────────────────────────────────────────────────────

  it('shows loading indicator when isLoading=true', () => {
    const { getByTestId } = renderPanel({ zip: '28801', isLoading: true });
    expect(getByTestId('shipping-rate-loading')).toBeTruthy();
  });

  it('hides loading indicator when isLoading=false', () => {
    const { queryByTestId } = renderPanel({ zip: '28801', isLoading: false });
    expect(queryByTestId('shipping-rate-loading')).toBeNull();
  });

  // ── Rate display ───────────────────────────────────────────────────────────

  it('shows parcel rate when API returns success', () => {
    const { getByTestId, getByText } = renderPanel({
      zip: '28801',
      rate: {
        amount: '49.00',
        carrier: 'UPS',
        serviceLevel: 'parcel',
        isEstimate: false,
        isFreight: false,
      },
    });
    expect(getByTestId('shipping-rate-result')).toBeTruthy();
    expect(getByText(/\$49\.00/)).toBeTruthy();
    expect(getByText(/UPS/)).toBeTruthy();
  });

  it('shows freight label for LTL rate', () => {
    const { getByText } = renderPanel({
      zip: '28801',
      rate: {
        amount: '225.00',
        carrier: 'R+L Carriers',
        serviceLevel: 'freight',
        isEstimate: true,
        isFreight: true,
      },
    });
    expect(getByText(/Freight/i)).toBeTruthy();
  });

  // ── isEstimate disclaimer ──────────────────────────────────────────────────

  it('shows estimate disclaimer when isEstimate=true', () => {
    const { getByTestId } = renderPanel({
      zip: '28801',
      rate: {
        amount: '225.00',
        carrier: 'R+L Carriers',
        serviceLevel: 'freight',
        isEstimate: true,
        isFreight: true,
      },
    });
    expect(getByTestId('shipping-estimate-disclaimer')).toBeTruthy();
  });

  it('does not show estimate disclaimer when isEstimate=false', () => {
    const { queryByTestId } = renderPanel({
      zip: '28801',
      rate: {
        amount: '49.00',
        carrier: 'UPS',
        serviceLevel: 'parcel',
        isEstimate: false,
        isFreight: false,
      },
    });
    expect(queryByTestId('shipping-estimate-disclaimer')).toBeNull();
  });

  // ── Error state ────────────────────────────────────────────────────────────

  it('shows error message when error is set', () => {
    const { getByTestId } = renderPanel({
      zip: '99999',
      error: new Error('Invalid zip code'),
    });
    expect(getByTestId('shipping-rate-error')).toBeTruthy();
  });

  it('does not show rate result alongside error', () => {
    const { queryByTestId } = renderPanel({
      zip: '99999',
      error: new Error('Service unavailable'),
    });
    expect(queryByTestId('shipping-rate-result')).toBeNull();
  });
});
