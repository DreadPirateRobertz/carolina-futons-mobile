/**
 * Tests for CompareFAB — floating action button showing compare count + navigating to CompareScreen.
 *
 * TDD: tests written first, CompareFAB does not yet exist.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CompareFAB } from '../CompareFAB';
import { CompareProvider, useCompareContext } from '@/contexts/CompareContext';
import { PRODUCTS } from '@/data/products';

const [productA, productB] = PRODUCTS;

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

/** Helper to pre-populate the compare list. */
function Seed({ products }: { products: typeof PRODUCTS }) {
  const { addToCompare } = useCompareContext();
  React.useEffect(() => {
    products.forEach((p) => addToCompare(p));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function renderWithProvider(ui: React.ReactElement, seedProducts: typeof PRODUCTS = []) {
  return render(
    <CompareProvider>
      {seedProducts.length > 0 && <Seed products={seedProducts} />}
      {ui}
    </CompareProvider>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
});

describe('CompareFAB', () => {
  it('does not render when compare list is empty', () => {
    const { queryByTestId } = renderWithProvider(<CompareFAB testID="compare-fab" />);
    expect(queryByTestId('compare-fab')).toBeNull();
  });

  it('renders when compare list has items', () => {
    const { getByTestId } = renderWithProvider(<CompareFAB testID="compare-fab" />, [productA]);
    expect(getByTestId('compare-fab')).toBeTruthy();
  });

  it('displays the compare count as badge text', () => {
    const { getByText } = renderWithProvider(<CompareFAB testID="compare-fab" />, [
      productA,
      productB,
    ]);
    expect(getByText('2')).toBeTruthy();
  });

  it('navigates to Compare screen with product slugs on press', () => {
    const { getByTestId } = renderWithProvider(<CompareFAB testID="compare-fab" />, [
      productA,
      productB,
    ]);
    fireEvent.press(getByTestId('compare-fab'));
    expect(mockNavigate).toHaveBeenCalledWith('Compare', {
      productSlugs: [productA.slug, productB.slug],
    });
  });

  it('accounts for bottom safe area inset in position', () => {
    const mockInset = { top: 47, right: 0, bottom: 34, left: 0 };
    jest
      .spyOn(require('react-native-safe-area-context'), 'useSafeAreaInsets')
      .mockReturnValue(mockInset);

    const { getByTestId } = renderWithProvider(<CompareFAB testID="compare-fab" />, [productA]);
    const fab = getByTestId('compare-fab');
    const flatStyle = Array.isArray(fab.props.style)
      ? Object.assign({}, ...fab.props.style)
      : fab.props.style;
    expect(flatStyle.bottom).toBeGreaterThanOrEqual(24 + 34);
  });

  it('positions correctly when bottom inset is zero', () => {
    const mockInset = { top: 0, right: 0, bottom: 0, left: 0 };
    jest
      .spyOn(require('react-native-safe-area-context'), 'useSafeAreaInsets')
      .mockReturnValue(mockInset);

    const { getByTestId } = renderWithProvider(<CompareFAB testID="compare-fab" />, [productA]);
    const fab = getByTestId('compare-fab');
    const flatStyle = Array.isArray(fab.props.style)
      ? Object.assign({}, ...fab.props.style)
      : fab.props.style;
    expect(flatStyle.bottom).toBe(24);
  });

  it('has accessible label indicating compare action', () => {
    const { getByLabelText } = renderWithProvider(<CompareFAB testID="compare-fab" />, [productA]);
    expect(getByLabelText(/compare/i)).toBeTruthy();
  });
});
