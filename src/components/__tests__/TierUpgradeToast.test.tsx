/**
 * TierUpgradeToast TDD tests — cfutons_mobile-0lt
 *
 * Tests written BEFORE implementation per CLAUDE.md mandate.
 * Shows "You've reached {tier} tier!" when a loyalty tier upgrade fires.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { TierUpgradeToast } from '../TierUpgradeToast';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderToast(props: React.ComponentProps<typeof TierUpgradeToast>) {
  return render(
    <ThemeProvider>
      <TierUpgradeToast {...props} />
    </ThemeProvider>,
  );
}

describe('TierUpgradeToast', () => {
  it('renders the tier name in the label', () => {
    const { getByTestId } = renderToast({ tier: 'silver', visible: true });
    expect(getByTestId('tier-upgrade-toast-label').props.children).toContain('silver');
  });

  it('renders for gold tier', () => {
    const { getByTestId } = renderToast({ tier: 'gold', visible: true });
    expect(getByTestId('tier-upgrade-toast-label').props.children).toContain('gold');
  });

  it('is accessible when visible', () => {
    const { getByTestId } = renderToast({ tier: 'silver', visible: true });
    const toast = getByTestId('tier-upgrade-toast');
    expect(toast.props.accessibilityLabel).toMatch(/silver/i);
  });

  it('hides accessibility when not visible', () => {
    const { getByTestId } = renderToast({ tier: 'silver', visible: false });
    const toast = getByTestId('tier-upgrade-toast', { includeHiddenElements: true });
    expect(toast.props.accessibilityElementsHidden).toBe(true);
  });

  it('accepts optional testID override', () => {
    const { getByTestId } = renderToast({ tier: 'gold', visible: true, testID: 'custom-tier' });
    expect(getByTestId('custom-tier')).toBeTruthy();
  });

  it('renders without crashing when not visible', () => {
    expect(() => renderToast({ tier: 'bronze', visible: false })).not.toThrow();
  });
});
