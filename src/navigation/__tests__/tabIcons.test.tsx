import React from 'react';
import { render } from '@testing-library/react-native';
import { HomeTabIcon, ShopTabIcon, CartTabIcon, AccountTabIcon } from '../TabIcons';
import { LOYALTY_TIERS } from '@/data/loyaltyTiers';

describe('TabIcons', () => {
  describe('HomeTabIcon', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<HomeTabIcon focused={false} color="#888" />);
      expect(toJSON()).not.toBeNull();
    });

    it('renders streak badge when streak > 1', () => {
      const { getByTestId } = render(<HomeTabIcon focused={false} color="#888" streak={5} />);
      expect(getByTestId('streak-badge')).toBeTruthy();
    });

    it('does not render streak badge when streak <= 1', () => {
      const { queryByTestId } = render(<HomeTabIcon focused={false} color="#888" streak={1} />);
      expect(queryByTestId('streak-badge')).toBeNull();
    });

    it('does not render streak badge when streak is undefined', () => {
      const { queryByTestId } = render(<HomeTabIcon focused={false} color="#888" />);
      expect(queryByTestId('streak-badge')).toBeNull();
    });
  });

  describe('ShopTabIcon', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<ShopTabIcon focused={false} color="#888" />);
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('CartTabIcon', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<CartTabIcon focused={false} color="#888" />);
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('AccountTabIcon', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<AccountTabIcon focused={false} color="#888" />);
      expect(toJSON()).not.toBeNull();
    });

    it('renders tier badge for Mountain Guide tier', () => {
      const { getByTestId } = render(
        <AccountTabIcon focused={false} color="#888" tier={LOYALTY_TIERS[1]} />,
      );
      expect(getByTestId('tier-badge')).toBeTruthy();
    });

    it('renders tier badge for Summit Master tier', () => {
      const { getByTestId } = render(
        <AccountTabIcon focused={false} color="#888" tier={LOYALTY_TIERS[2]} />,
      );
      expect(getByTestId('tier-badge')).toBeTruthy();
    });

    it('does not render tier badge for Trail Blazer tier', () => {
      const { queryByTestId } = render(
        <AccountTabIcon focused={false} color="#888" tier={LOYALTY_TIERS[0]} />,
      );
      expect(queryByTestId('tier-badge')).toBeNull();
    });

    it('does not render tier badge when tier is undefined', () => {
      const { queryByTestId } = render(<AccountTabIcon focused={false} color="#888" />);
      expect(queryByTestId('tier-badge')).toBeNull();
    });
  });
});
