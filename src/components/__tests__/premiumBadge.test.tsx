import React from 'react';
import { render } from '@testing-library/react-native';
import { PremiumBadge } from '../PremiumBadge';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderBadge(props: { size?: 'sm' | 'md' } = {}) {
  return render(
    <ThemeProvider>
      <PremiumBadge {...props} />
    </ThemeProvider>,
  );
}

describe('PremiumBadge', () => {
  it('renders with testID', () => {
    const { getByTestId } = renderBadge();
    expect(getByTestId('premium-badge')).toBeTruthy();
  });

  it('shows CF+ text', () => {
    const { getByText } = renderBadge();
    expect(getByText('CF+')).toBeTruthy();
  });

  it('renders small variant', () => {
    const { getByTestId } = renderBadge({ size: 'sm' });
    expect(getByTestId('premium-badge')).toBeTruthy();
  });
});
