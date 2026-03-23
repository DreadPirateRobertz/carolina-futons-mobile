import React from 'react';
import { render } from '@testing-library/react-native';
import { FreightNoticeBanner } from '../FreightNoticeBanner';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderBanner(props: Partial<React.ComponentProps<typeof FreightNoticeBanner>> = {}) {
  return render(
    <ThemeProvider>
      <FreightNoticeBanner requiresFreight={false} requiresLiftgate={false} {...props} />
    </ThemeProvider>,
  );
}

describe('FreightNoticeBanner', () => {
  describe('renders nothing', () => {
    it('renders nothing when both flags are false', () => {
      const { queryByTestId } = renderBanner();
      expect(queryByTestId('freight-notice-banner')).toBeNull();
    });

    it('renders nothing when requiresFreight is undefined and requiresLiftgate is undefined', () => {
      const { queryByTestId } = renderBanner({
        requiresFreight: undefined,
        requiresLiftgate: undefined,
      });
      expect(queryByTestId('freight-notice-banner')).toBeNull();
    });

    it('renders nothing when requiresFreight is false and requiresLiftgate is true', () => {
      // Liftgate badge only shown alongside freight banner
      const { queryByTestId } = renderBanner({ requiresFreight: false, requiresLiftgate: true });
      expect(queryByTestId('freight-notice-banner')).toBeNull();
    });
  });

  describe('freight banner', () => {
    it('renders banner container when requiresFreight is true', () => {
      const { getByTestId } = renderBanner({ requiresFreight: true });
      expect(getByTestId('freight-notice-banner')).toBeTruthy();
    });

    it('shows freight delivery text', () => {
      const { getByText } = renderBanner({ requiresFreight: true });
      expect(getByText('Freight Delivery')).toBeTruthy();
    });

    it('shows carrier scheduling notice', () => {
      const { getByText } = renderBanner({ requiresFreight: true });
      expect(getByText(/carrier will call to schedule/i)).toBeTruthy();
    });

    it('has correct accessibility role and label', () => {
      const { getByTestId } = renderBanner({ requiresFreight: true });
      const banner = getByTestId('freight-notice-banner');
      expect(banner.props.accessibilityRole).toBe('text');
    });

    it('accepts a custom testID', () => {
      const { getByTestId } = renderBanner({ requiresFreight: true, testID: 'custom-freight' });
      expect(getByTestId('custom-freight')).toBeTruthy();
    });
  });

  describe('liftgate badge', () => {
    it('does not render liftgate badge when requiresFreight is true but requiresLiftgate is false', () => {
      const { queryByTestId } = renderBanner({ requiresFreight: true, requiresLiftgate: false });
      expect(queryByTestId('liftgate-badge')).toBeNull();
    });

    it('renders liftgate badge when both requiresFreight and requiresLiftgate are true', () => {
      const { getByTestId } = renderBanner({ requiresFreight: true, requiresLiftgate: true });
      expect(getByTestId('liftgate-badge')).toBeTruthy();
    });

    it('shows liftgate badge text', () => {
      const { getByText } = renderBanner({ requiresFreight: true, requiresLiftgate: true });
      expect(getByText('Liftgate Required')).toBeTruthy();
    });

    it('liftgate badge has accessibility label', () => {
      const { getByTestId } = renderBanner({ requiresFreight: true, requiresLiftgate: true });
      const badge = getByTestId('liftgate-badge');
      expect(badge.props.accessibilityLabel).toMatch(/liftgate/i);
    });
  });

  describe('accessibility (cm-a11y-shipping)', () => {
    it('banner container has accessibilityLabel summarising freight delivery', () => {
      const { getByTestId } = renderBanner({ requiresFreight: true });
      const banner = getByTestId('freight-notice-banner');
      expect(banner.props.accessibilityLabel).toBeTruthy();
      expect(banner.props.accessibilityLabel).toMatch(/freight/i);
    });

    it('emoji icon is hidden from accessibility tree', () => {
      const { getByTestId } = renderBanner({ requiresFreight: true });
      // The truck emoji Text should carry accessibilityElementsHidden so VoiceOver skips it
      const banner = getByTestId('freight-notice-banner');
      // Find the emoji node among children — it should be hidden
      const allChildren = banner.findAll(
        (node: { props: { accessibilityElementsHidden?: boolean; children?: unknown } }) =>
          node.props.accessibilityElementsHidden === true,
      );
      expect(allChildren.length).toBeGreaterThan(0);
    });

    it('banner with liftgate has accessibilityLabel that mentions liftgate', () => {
      const { getByTestId } = renderBanner({ requiresFreight: true, requiresLiftgate: true });
      const banner = getByTestId('freight-notice-banner');
      expect(banner.props.accessibilityLabel).toMatch(/liftgate/i);
    });
  });

  describe('edge cases', () => {
    it('renders without crash when requiresFreight is null', () => {
      const { queryByTestId } = renderBanner({ requiresFreight: null as unknown as boolean });
      expect(queryByTestId('freight-notice-banner')).toBeNull();
    });

    it('renders without crash when both are true simultaneously', () => {
      expect(() => renderBanner({ requiresFreight: true, requiresLiftgate: true })).not.toThrow();
    });
  });
});
