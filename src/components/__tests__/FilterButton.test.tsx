import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FilterButton } from '../FilterButton';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderFilterButton(overrides: { activeCount?: number; onPress?: jest.Mock } = {}) {
  const onPress = overrides.onPress ?? jest.fn();
  return {
    ...render(
      <ThemeProvider>
        <FilterButton activeCount={overrides.activeCount ?? 0} onPress={onPress} />
      </ThemeProvider>,
    ),
    onPress,
  };
}

describe('FilterButton', () => {
  it('renders with testID', () => {
    const { getByTestId } = renderFilterButton();
    expect(getByTestId('filter-button')).toBeTruthy();
  });

  it('shows "Filter" label', () => {
    const { getByText } = renderFilterButton();
    expect(getByText('Filter')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderFilterButton({ onPress });
    fireEvent.press(getByTestId('filter-button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not show badge when activeCount is 0', () => {
    const { queryByTestId } = renderFilterButton({ activeCount: 0 });
    expect(queryByTestId('filter-badge')).toBeNull();
  });

  it('shows badge with count when filters are active', () => {
    const { getByTestId, getByText } = renderFilterButton({ activeCount: 2 });
    expect(getByTestId('filter-badge')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
  });

  it('has accessibility label without count when no filters active', () => {
    const { getByTestId } = renderFilterButton({ activeCount: 0 });
    expect(getByTestId('filter-button').props.accessibilityLabel).toBe('Filters');
  });

  it('has accessibility label with count when filters active', () => {
    const { getByTestId } = renderFilterButton({ activeCount: 3 });
    expect(getByTestId('filter-button').props.accessibilityLabel).toBe('Filters, 3 active');
  });

  it('has button accessibility role', () => {
    const { getByTestId } = renderFilterButton();
    expect(getByTestId('filter-button').props.accessibilityRole).toBe('button');
  });
});
