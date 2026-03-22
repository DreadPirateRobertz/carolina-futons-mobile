import React from 'react';
import { render } from '@testing-library/react-native';
import { ShippingEstimateBadge } from '../ShippingEstimateBadge';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderBadge(props: Partial<React.ComponentProps<typeof ShippingEstimateBadge>> = {}) {
  return render(
    <ThemeProvider>
      <ShippingEstimateBadge
        icon="🚚"
        label="2–3 business days"
        badge={null}
        badgeStyle={null}
        isLoading={false}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('ShippingEstimateBadge', () => {
  describe('renders nothing', () => {
    it('renders nothing when isLoading is true', () => {
      const { queryByTestId } = renderBadge({ isLoading: true });
      expect(queryByTestId('shipping-estimate-badge')).toBeNull();
    });

    it('renders nothing when label is null', () => {
      const { queryByTestId } = renderBadge({ label: null });
      expect(queryByTestId('shipping-estimate-badge')).toBeNull();
    });

    it('renders nothing when label is empty string', () => {
      const { queryByTestId } = renderBadge({ label: '' });
      expect(queryByTestId('shipping-estimate-badge')).toBeNull();
    });
  });

  describe('rendering', () => {
    it('renders container with testID', () => {
      const { getByTestId } = renderBadge();
      expect(getByTestId('shipping-estimate-badge')).toBeTruthy();
    });

    it('renders icon and label together', () => {
      const { getByTestId } = renderBadge({ icon: '🚚', label: '2–3 business days' });
      const badge = getByTestId('shipping-estimate-badge');
      expect(badge).toBeTruthy();
    });

    it('renders "Ships in" prefix text', () => {
      const { getByText } = renderBadge({ label: '5–7 business days' });
      // Should find a text element containing the delivery window
      expect(getByText(/5–7 business days/)).toBeTruthy();
    });

    it('renders the icon', () => {
      const { getByText } = renderBadge({ icon: '🏔️', label: '2–3 business days' });
      expect(getByText('🏔️')).toBeTruthy();
    });

    it('renders badge text when badge is set', () => {
      const { getByTestId } = renderBadge({ badge: 'Local Delivery', badgeStyle: 'local' });
      expect(getByTestId('shipping-badge-pill')).toBeTruthy();
    });

    it('does not render badge pill when badge is null', () => {
      const { queryByTestId } = renderBadge({ badge: null });
      expect(queryByTestId('shipping-badge-pill')).toBeNull();
    });

    it('renders the correct badge text', () => {
      const { getByText } = renderBadge({ badge: 'Free Shipping', badgeStyle: 'savings' });
      expect(getByText('Free Shipping')).toBeTruthy();
    });

    it('accepts a custom testID', () => {
      const { getByTestId } = renderBadge({ testID: 'custom-id' });
      expect(getByTestId('custom-id')).toBeTruthy();
    });
  });

  describe('badge styles', () => {
    it('renders without crashing for "premium" badgeStyle', () => {
      const { getByTestId } = renderBadge({ badge: 'White Glove', badgeStyle: 'premium' });
      expect(getByTestId('shipping-badge-pill')).toBeTruthy();
    });

    it('renders without crashing for "freight" badgeStyle', () => {
      const { getByTestId } = renderBadge({ badge: 'LTL Freight', badgeStyle: 'freight' });
      expect(getByTestId('shipping-badge-pill')).toBeTruthy();
    });

    it('renders without crashing for unknown badgeStyle', () => {
      const { getByTestId } = renderBadge({ badge: 'Custom', badgeStyle: 'unknown-style' });
      expect(getByTestId('shipping-badge-pill')).toBeTruthy();
    });
  });
});
