/**
 * Tests for CompareButton — add/remove product from compare list.
 *
 * TDD: tests written first, CompareButton does not yet exist.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CompareButton } from '../CompareButton';
import { CompareProvider } from '@/contexts/CompareContext';
import { PRODUCTS } from '@/data/products';

const [productA, productB, productC, productD] = PRODUCTS;

function renderWithProvider(ui: React.ReactElement) {
  return render(<CompareProvider>{ui}</CompareProvider>);
}

describe('CompareButton', () => {
  it('renders with "Compare" label when product is not in list', () => {
    const { getByText } = renderWithProvider(<CompareButton product={productA} />);
    expect(getByText('Compare')).toBeTruthy();
  });

  it('renders with "Remove" label when product is in list', () => {
    const { getByText, rerender } = renderWithProvider(<CompareButton product={productA} />);
    fireEvent.press(getByText('Compare'));
    // After press, should flip to remove state
    expect(getByText('Remove')).toBeTruthy();
  });

  it('adds product to compare list on press', () => {
    const { getByText } = renderWithProvider(<CompareButton product={productA} />);
    fireEvent.press(getByText('Compare'));
    // Should now show "Remove" indicating product was added
    expect(getByText('Remove')).toBeTruthy();
  });

  it('removes product from compare list when already added', () => {
    const { getByText } = renderWithProvider(<CompareButton product={productA} />);
    fireEvent.press(getByText('Compare'));
    expect(getByText('Remove')).toBeTruthy();
    fireEvent.press(getByText('Remove'));
    expect(getByText('Compare')).toBeTruthy();
  });

  it('has accessible role button', () => {
    const { getByRole } = renderWithProvider(<CompareButton product={productA} />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('uses provided testID', () => {
    const { getByTestId } = renderWithProvider(
      <CompareButton product={productA} testID="compare-btn" />,
    );
    expect(getByTestId('compare-btn')).toBeTruthy();
  });
});
