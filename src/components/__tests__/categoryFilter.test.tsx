import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CategoryFilter } from '../CategoryFilter';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { CATEGORIES, type ProductCategory } from '@/data/products';

function renderFilter(overrides: { selected?: ProductCategory | null; onSelect?: jest.Mock } = {}) {
  const onSelect = overrides.onSelect ?? jest.fn();
  return {
    ...render(
      <ThemeProvider>
        <CategoryFilter
          categories={CATEGORIES}
          selected={overrides.selected ?? null}
          onSelect={onSelect}
        />
      </ThemeProvider>,
    ),
    onSelect,
  };
}

describe('CategoryFilter', () => {
  it('renders with testID', () => {
    const { getByTestId } = renderFilter();
    expect(getByTestId('category-filter')).toBeTruthy();
  });

  it('renders All chip', () => {
    const { getByTestId, getByText } = renderFilter();
    expect(getByTestId('category-all')).toBeTruthy();
    expect(getByText('All')).toBeTruthy();
  });

  it('renders all category chips', () => {
    const { getByTestId } = renderFilter();
    for (const cat of CATEGORIES) {
      expect(getByTestId(`category-${cat.id}`)).toBeTruthy();
    }
  });

  it('renders category labels', () => {
    const { getByText } = renderFilter();
    for (const cat of CATEGORIES) {
      expect(getByText(cat.label)).toBeTruthy();
    }
  });

  it('calls onSelect(null) when All chip pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = renderFilter({ onSelect });
    fireEvent.press(getByTestId('category-all'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('calls onSelect with category ID when chip pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = renderFilter({ onSelect });
    fireEvent.press(getByTestId('category-futons'));
    expect(onSelect).toHaveBeenCalledWith('futons');
  });

  it('marks All as selected when selected is null', () => {
    const { getByTestId } = renderFilter({ selected: null });
    expect(getByTestId('category-all').props.accessibilityState).toEqual({ selected: true });
  });

  it('marks category chip as selected', () => {
    const { getByTestId } = renderFilter({ selected: 'covers' });
    expect(getByTestId('category-covers').props.accessibilityState).toEqual({ selected: true });
    expect(getByTestId('category-all').props.accessibilityState).toEqual({ selected: false });
  });

  it('each chip has accessibility label with count', () => {
    const { getByTestId } = renderFilter();
    for (const cat of CATEGORIES) {
      const chip = getByTestId(`category-${cat.id}`);
      expect(chip.props.accessibilityLabel).toBe(`${cat.label} (${cat.count} items)`);
    }
  });

  it('All chip has accessibility label', () => {
    const { getByTestId } = renderFilter();
    expect(getByTestId('category-all').props.accessibilityLabel).toBe('All categories');
  });

  it('each chip has button role', () => {
    const { getByTestId } = renderFilter();
    expect(getByTestId('category-all').props.accessibilityRole).toBe('button');
    for (const cat of CATEGORIES) {
      expect(getByTestId(`category-${cat.id}`).props.accessibilityRole).toBe('button');
    }
  });
});
