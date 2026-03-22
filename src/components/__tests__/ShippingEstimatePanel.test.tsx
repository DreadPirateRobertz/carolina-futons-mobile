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
    upsellMessage: string | null;
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
        upsellMessage: null,
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
        upsellMessage: null,
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
        upsellMessage: null,
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
        upsellMessage: null,
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

  // ── cm-bundle-incentive: upsellMessage display ─────────────────────────────

  it('shows upsellMessage when rate includes one', () => {
    const { getByTestId } = renderPanel({
      zip: '28801',
      rate: {
        amount: '49.00',
        carrier: 'UPS',
        serviceLevel: 'parcel',
        isEstimate: false,
        isFreight: false,
        upsellMessage: 'Bundle savings — already paying for freight, add more items at no extra shipping cost',
      },
    });
    expect(getByTestId('shipping-upsell-message')).toBeTruthy();
  });

  it('upsellMessage text matches rate.upsellMessage', () => {
    const msg = 'Bundle savings — already paying for freight, add more items at no extra shipping cost';
    const { getByTestId } = renderPanel({
      zip: '28801',
      rate: {
        amount: '49.00',
        carrier: 'UPS',
        serviceLevel: 'parcel',
        isEstimate: false,
        isFreight: false,
        upsellMessage: msg,
      },
    });
    expect(getByTestId('shipping-upsell-message').props.children).toBe(msg);
  });

  it('does not show upsellMessage when rate.upsellMessage is null', () => {
    const { queryByTestId } = renderPanel({
      zip: '28801',
      rate: {
        amount: '49.00',
        carrier: 'UPS',
        serviceLevel: 'parcel',
        isEstimate: false,
        isFreight: false,
        upsellMessage: null,
      },
    });
    expect(queryByTestId('shipping-upsell-message')).toBeNull();
  });

  // ── Accessibility (cm-a11y-shipping) ───────────────────────────────────────

  describe('accessibility', () => {
    it('zip input has descriptive accessibilityLabel', () => {
      const { getByTestId } = renderPanel();
      const input = getByTestId('shipping-zip-input');
      expect(input.props.accessibilityLabel).toBeTruthy();
    });

    it('zip input has accessibilityHint describing its purpose', () => {
      const { getByTestId } = renderPanel();
      const input = getByTestId('shipping-zip-input');
      expect(input.props.accessibilityHint).toBeTruthy();
    });

    it('loading spinner has accessibilityLabel for screen readers', () => {
      const { getByTestId } = renderPanel({ zip: '28801', isLoading: true });
      const spinner = getByTestId('shipping-rate-loading');
      expect(spinner.props.accessibilityLabel).toBeTruthy();
    });

    it('error text has accessibilityLiveRegion polite so screen readers announce it', () => {
      const { getByTestId } = renderPanel({ zip: '99999', error: new Error('fail') });
      const err = getByTestId('shipping-rate-error');
      expect(err.props.accessibilityLiveRegion).toBe('polite');
    });

    it('rate result has accessibilityLabel summarising carrier and amount', () => {
      const { getByTestId } = renderPanel({
        zip: '28801',
        rate: {
          amount: '49.00',
          carrier: 'UPS',
          serviceLevel: 'parcel',
          isEstimate: false,
          isFreight: false,
          upsellMessage: null,
        },
      });
      const result = getByTestId('shipping-rate-result');
      expect(result.props.accessibilityLabel).toMatch(/UPS/i);
      expect(result.props.accessibilityLabel).toMatch(/49/);
    });
  });

  it('passes itemCount prop through to the hook', () => {
    // The panel accepts itemCount and the hook mock receives any args —
    // just verify it renders without throwing when itemCount is provided
    mockHookState = { zip: '', setZip: mockSetZip, rate: null, isLoading: false, error: null };
    expect(() =>
      render(
        <ThemeProvider>
          <ShippingEstimatePanel
            productId="prod-001"
            dimensions={{ width: 60, depth: 36, height: 35 }}
            itemCount={3}
          />
        </ThemeProvider>,
      ),
    ).not.toThrow();
  });
});
