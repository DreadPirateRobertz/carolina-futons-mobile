import React from 'react';
import { render } from '@testing-library/react-native';
import { PriceRangeSlider } from '../PriceRangeSlider';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderSlider(
  overrides: {
    min?: number;
    max?: number;
    low?: number;
    high?: number;
    onChangeRange?: jest.Mock;
  } = {},
) {
  const onChangeRange = overrides.onChangeRange ?? jest.fn();
  return {
    ...render(
      <ThemeProvider>
        <PriceRangeSlider
          min={overrides.min ?? 0}
          max={overrides.max ?? 1000}
          low={overrides.low ?? 100}
          high={overrides.high ?? 800}
          onChangeRange={onChangeRange}
        />
      </ThemeProvider>,
    ),
    onChangeRange,
  };
}

describe('PriceRangeSlider', () => {
  it('renders with testID', () => {
    const { getByTestId } = renderSlider();
    expect(getByTestId('price-range-slider')).toBeTruthy();
  });

  it('shows low and high labels', () => {
    const { getByTestId } = renderSlider({ low: 50, high: 500 });
    expect(getByTestId('price-range-low-label').props.children).toEqual(['$', 50]);
    expect(getByTestId('price-range-high-label').props.children).toEqual(['$', 500]);
  });

  it('renders both thumbs', () => {
    const { getByTestId } = renderSlider();
    expect(getByTestId('price-range-low-thumb')).toBeTruthy();
    expect(getByTestId('price-range-high-thumb')).toBeTruthy();
  });

  it('low thumb has accessibility label', () => {
    const { getByTestId } = renderSlider({ low: 100 });
    expect(getByTestId('price-range-low-thumb').props.accessibilityLabel).toBe(
      'Minimum price $100',
    );
  });

  it('high thumb has accessibility label', () => {
    const { getByTestId } = renderSlider({ high: 800 });
    expect(getByTestId('price-range-high-thumb').props.accessibilityLabel).toBe(
      'Maximum price $800',
    );
  });

  it('thumbs have adjustable accessibility role', () => {
    const { getByTestId } = renderSlider();
    expect(getByTestId('price-range-low-thumb').props.accessibilityRole).toBe('adjustable');
    expect(getByTestId('price-range-high-thumb').props.accessibilityRole).toBe('adjustable');
  });
});
