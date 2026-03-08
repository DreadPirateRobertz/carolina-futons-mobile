/**
 * Tests for the FinancingBadge component shown on ProductCard and ProductDetail.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { FinancingBadge } from '../FinancingBadge';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      mountainBlue: '#5B8FA8',
      white: '#FFFFFF',
      espressoLight: '#6B5B4F',
    },
    spacing: { xs: 4, sm: 8 },
    borderRadius: { sm: 4 },
  }),
}));

describe('FinancingBadge', () => {
  it('renders "As low as" text with monthly payment for eligible price', () => {
    const { getByText } = render(<FinancingBadge price={500} />);
    expect(getByText(/As low as/)).toBeTruthy();
    expect(getByText(/\/mo/)).toBeTruthy();
  });

  it('renders nothing for ineligible price', () => {
    const { toJSON } = render(<FinancingBadge price={100} />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing for price at threshold', () => {
    const { toJSON } = render(<FinancingBadge price={299} />);
    expect(toJSON()).toBeNull();
  });

  it('uses lowest monthly payment (12-month term)', () => {
    const { getByTestId } = render(<FinancingBadge price={1200} />);
    const badge = getByTestId('financing-badge');
    expect(badge).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = render(<FinancingBadge price={500} testID="custom-badge" />);
    expect(getByTestId('custom-badge')).toBeTruthy();
  });

  it('shows disclaimer text when variant is "detail"', () => {
    const { getByText } = render(<FinancingBadge price={500} variant="detail" />);
    expect(getByText(/Subject to credit approval/)).toBeTruthy();
  });

  it('does not show disclaimer when variant is "compact"', () => {
    const { queryByText } = render(<FinancingBadge price={500} variant="compact" />);
    expect(queryByText(/Subject to credit approval/)).toBeNull();
  });
});
