import React from 'react';
import { render } from '@testing-library/react-native';
import { BrandedSpinner } from '../BrandedSpinner';

describe('BrandedSpinner', () => {
  it('renders with default props', () => {
    const { getByTestId } = render(<BrandedSpinner testID="spinner" />);
    expect(getByTestId('spinner')).toBeTruthy();
  });

  it('has progressbar accessibility role', () => {
    const { getByTestId } = render(<BrandedSpinner testID="spinner" />);
    expect(getByTestId('spinner').props.accessibilityRole).toBe('progressbar');
  });

  it('renders three pulsing dots', () => {
    const { getByTestId } = render(<BrandedSpinner testID="spinner" />);
    const container = getByTestId('spinner');
    expect(container.children.length).toBe(3);
  });

  it('accepts custom color', () => {
    const { getByTestId } = render(<BrandedSpinner testID="spinner" color="#FF0000" />);
    expect(getByTestId('spinner')).toBeTruthy();
  });

  it('accepts large size', () => {
    const { getByTestId } = render(<BrandedSpinner testID="spinner" size="large" />);
    expect(getByTestId('spinner')).toBeTruthy();
  });
});
