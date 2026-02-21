import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchBar } from '../SearchBar';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderSearchBar(
  props: { value?: string; onChangeText?: jest.Mock; placeholder?: string } = {},
) {
  const onChangeText = props.onChangeText ?? jest.fn();
  return {
    ...render(
      <ThemeProvider>
        <SearchBar
          value={props.value ?? ''}
          onChangeText={onChangeText}
          placeholder={props.placeholder}
        />
      </ThemeProvider>,
    ),
    onChangeText,
  };
}

describe('SearchBar', () => {
  it('renders with testID', () => {
    const { getByTestId } = renderSearchBar();
    expect(getByTestId('search-bar')).toBeTruthy();
  });

  it('renders search input', () => {
    const { getByTestId } = renderSearchBar();
    expect(getByTestId('search-input')).toBeTruthy();
  });

  it('displays current value', () => {
    const { getByTestId } = renderSearchBar({ value: 'futon' });
    expect(getByTestId('search-input').props.value).toBe('futon');
  });

  it('uses default placeholder when none provided', () => {
    const { getByTestId } = renderSearchBar();
    expect(getByTestId('search-input').props.placeholder).toBe('Search products...');
  });

  it('uses custom placeholder when provided', () => {
    const { getByTestId } = renderSearchBar({ placeholder: 'Find a futon...' });
    expect(getByTestId('search-input').props.placeholder).toBe('Find a futon...');
  });

  it('calls onChangeText when typing', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = renderSearchBar({ onChangeText });
    fireEvent.changeText(getByTestId('search-input'), 'mattress');
    expect(onChangeText).toHaveBeenCalledWith('mattress');
  });

  it('does not show clear button when value is empty', () => {
    const { queryByTestId } = renderSearchBar({ value: '' });
    expect(queryByTestId('search-clear')).toBeNull();
  });

  it('shows clear button when value is non-empty', () => {
    const { getByTestId } = renderSearchBar({ value: 'test' });
    expect(getByTestId('search-clear')).toBeTruthy();
  });

  it('clears text when clear button pressed', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = renderSearchBar({ value: 'futon', onChangeText });
    fireEvent.press(getByTestId('search-clear'));
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('has correct accessibility label', () => {
    const { getByTestId } = renderSearchBar();
    expect(getByTestId('search-input').props.accessibilityLabel).toBe('Search products');
  });

  it('has correct accessibility on clear button', () => {
    const { getByTestId } = renderSearchBar({ value: 'text' });
    expect(getByTestId('search-clear').props.accessibilityLabel).toBe('Clear search');
  });
});
