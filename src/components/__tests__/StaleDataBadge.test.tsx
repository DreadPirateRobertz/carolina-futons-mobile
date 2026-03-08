import React from 'react';
import { render } from '@testing-library/react-native';
import { StaleDataBadge } from '../StaleDataBadge';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderBadge(props: Partial<React.ComponentProps<typeof StaleDataBadge>> = {}) {
  return render(
    <ThemeProvider>
      <StaleDataBadge {...props} />
    </ThemeProvider>,
  );
}

describe('StaleDataBadge', () => {
  it('renders with default testID', () => {
    const { getByTestId } = renderBadge();
    expect(getByTestId('stale-data-badge')).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = renderBadge({ testID: 'custom-stale' });
    expect(getByTestId('custom-stale')).toBeTruthy();
  });

  it('shows cached data text', () => {
    const { getByText } = renderBadge();
    expect(getByText(/cached/i)).toBeTruthy();
  });

  it('has accessibility label', () => {
    const { getByTestId } = renderBadge();
    const badge = getByTestId('stale-data-badge');
    expect(badge.props.accessibilityLabel).toContain('cached');
  });

  it('shows custom label', () => {
    const { getByText } = renderBadge({ label: 'Last updated 5m ago' });
    expect(getByText('Last updated 5m ago')).toBeTruthy();
  });

  it('does not render when isStale is false', () => {
    const { queryByTestId } = renderBadge({ isStale: false });
    expect(queryByTestId('stale-data-badge')).toBeNull();
  });

  it('renders when isStale is true', () => {
    const { getByTestId } = renderBadge({ isStale: true });
    expect(getByTestId('stale-data-badge')).toBeTruthy();
  });

  it('renders by default (isStale defaults to true)', () => {
    const { getByTestId } = renderBadge();
    expect(getByTestId('stale-data-badge')).toBeTruthy();
  });
});
