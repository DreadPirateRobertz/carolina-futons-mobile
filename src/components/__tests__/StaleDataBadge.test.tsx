import React from 'react';
import { render } from '@testing-library/react-native';
import { StaleDataBadge } from '../StaleDataBadge';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderBadge(props: { isStale: boolean } & Partial<Omit<React.ComponentProps<typeof StaleDataBadge>, 'isStale'>>) {
  return render(
    <ThemeProvider>
      <StaleDataBadge {...props} />
    </ThemeProvider>,
  );
}

describe('StaleDataBadge', () => {
  it('renders with default testID', () => {
    const { getByTestId } = renderBadge({ isStale: true });
    expect(getByTestId('stale-data-badge')).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = renderBadge({ isStale: true, testID: 'custom-stale' });
    expect(getByTestId('custom-stale')).toBeTruthy();
  });

  it('shows cached data text', () => {
    const { getByText } = renderBadge({ isStale: true });
    expect(getByText(/cached/i)).toBeTruthy();
  });

  it('has accessibility label', () => {
    const { getByTestId } = renderBadge({ isStale: true });
    const badge = getByTestId('stale-data-badge');
    expect(badge.props.accessibilityLabel).toContain('cached');
  });

  it('shows custom label and updates accessibility label', () => {
    const { getByText, getByTestId } = renderBadge({ isStale: true, label: 'Last updated 5m ago' });
    expect(getByText('Last updated 5m ago')).toBeTruthy();
    expect(getByTestId('stale-data-badge').props.accessibilityLabel).toContain('last updated 5m ago');
  });

  it('does not render when isStale is false', () => {
    const { queryByTestId } = renderBadge({ isStale: false });
    expect(queryByTestId('stale-data-badge')).toBeNull();
  });

  it('renders when isStale is true', () => {
    const { getByTestId } = renderBadge({ isStale: true });
    expect(getByTestId('stale-data-badge')).toBeTruthy();
  });
});
