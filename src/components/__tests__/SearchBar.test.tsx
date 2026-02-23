import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchBar } from '../SearchBar';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderSearchBar(
  props: {
    value?: string;
    onChangeText?: jest.Mock;
    placeholder?: string;
    suggestions?: string[];
    recentSearches?: string[];
    onSubmitSearch?: jest.Mock;
    onRemoveRecent?: jest.Mock;
    onClearRecent?: jest.Mock;
  } = {},
) {
  const onChangeText = props.onChangeText ?? jest.fn();
  return {
    ...render(
      <ThemeProvider>
        <SearchBar
          value={props.value ?? ''}
          onChangeText={onChangeText}
          placeholder={props.placeholder}
          suggestions={props.suggestions}
          recentSearches={props.recentSearches}
          onSubmitSearch={props.onSubmitSearch}
          onRemoveRecent={props.onRemoveRecent}
          onClearRecent={props.onClearRecent}
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

describe('SearchBar autocomplete', () => {
  it('does not show dropdown when unfocused', () => {
    const { queryByTestId } = renderSearchBar({
      value: 'fut',
      suggestions: ['The Asheville Full Futon'],
    });
    expect(queryByTestId('search-dropdown')).toBeNull();
  });

  it('shows suggestions when focused with query and suggestions', () => {
    const { getByTestId, queryByTestId } = renderSearchBar({
      value: 'fut',
      suggestions: ['The Asheville Full Futon', 'Blue Ridge Queen Futon'],
    });
    fireEvent(getByTestId('search-input'), 'focus');
    expect(queryByTestId('search-suggestions')).toBeTruthy();
  });

  it('renders each suggestion item', () => {
    const { getByTestId } = renderSearchBar({
      value: 'fut',
      suggestions: ['The Asheville Full Futon', 'Blue Ridge Queen Futon'],
    });
    fireEvent(getByTestId('search-input'), 'focus');
    expect(getByTestId('suggestion-The Asheville Full Futon')).toBeTruthy();
    expect(getByTestId('suggestion-Blue Ridge Queen Futon')).toBeTruthy();
  });

  it('selects suggestion and calls onChangeText + onSubmitSearch', () => {
    const onChangeText = jest.fn();
    const onSubmitSearch = jest.fn();
    const { getByTestId } = renderSearchBar({
      value: 'fut',
      suggestions: ['The Asheville Full Futon'],
      onChangeText,
      onSubmitSearch,
    });
    fireEvent(getByTestId('search-input'), 'focus');
    fireEvent.press(getByTestId('suggestion-The Asheville Full Futon'));
    expect(onChangeText).toHaveBeenCalledWith('The Asheville Full Futon');
    expect(onSubmitSearch).toHaveBeenCalledWith('The Asheville Full Futon');
  });

  it('does not show suggestions when query is empty', () => {
    const { getByTestId, queryByTestId } = renderSearchBar({
      value: '',
      suggestions: ['The Asheville Full Futon'],
    });
    fireEvent(getByTestId('search-input'), 'focus');
    expect(queryByTestId('search-suggestions')).toBeNull();
  });
});

describe('SearchBar recent searches', () => {
  it('shows recent searches when focused with empty query', () => {
    const { getByTestId, queryByTestId } = renderSearchBar({
      value: '',
      recentSearches: ['futon', 'pillow'],
    });
    fireEvent(getByTestId('search-input'), 'focus');
    expect(queryByTestId('search-recent')).toBeTruthy();
  });

  it('renders each recent search item', () => {
    const { getByTestId } = renderSearchBar({
      value: '',
      recentSearches: ['futon', 'pillow'],
    });
    fireEvent(getByTestId('search-input'), 'focus');
    expect(getByTestId('recent-futon')).toBeTruthy();
    expect(getByTestId('recent-pillow')).toBeTruthy();
  });

  it('does not show recent searches when query is non-empty', () => {
    const { getByTestId, queryByTestId } = renderSearchBar({
      value: 'test',
      recentSearches: ['futon'],
    });
    fireEvent(getByTestId('search-input'), 'focus');
    expect(queryByTestId('search-recent')).toBeNull();
  });

  it('selects recent search and calls callbacks', () => {
    const onChangeText = jest.fn();
    const onSubmitSearch = jest.fn();
    const { getByTestId } = renderSearchBar({
      value: '',
      recentSearches: ['futon'],
      onChangeText,
      onSubmitSearch,
    });
    fireEvent(getByTestId('search-input'), 'focus');
    fireEvent.press(getByTestId('recent-futon'));
    expect(onChangeText).toHaveBeenCalledWith('futon');
    expect(onSubmitSearch).toHaveBeenCalledWith('futon');
  });

  it('removes a recent search', () => {
    const onRemoveRecent = jest.fn();
    const { getByTestId } = renderSearchBar({
      value: '',
      recentSearches: ['futon'],
      onRemoveRecent,
    });
    fireEvent(getByTestId('search-input'), 'focus');
    fireEvent.press(getByTestId('remove-recent-futon'));
    expect(onRemoveRecent).toHaveBeenCalledWith('futon');
  });

  it('clears all recent searches', () => {
    const onClearRecent = jest.fn();
    const { getByTestId } = renderSearchBar({
      value: '',
      recentSearches: ['futon', 'pillow'],
      onClearRecent,
    });
    fireEvent(getByTestId('search-input'), 'focus');
    fireEvent.press(getByTestId('clear-recent'));
    expect(onClearRecent).toHaveBeenCalled();
  });

  it('does not show clear button if onClearRecent not provided', () => {
    const { getByTestId, queryByTestId } = renderSearchBar({
      value: '',
      recentSearches: ['futon'],
    });
    fireEvent(getByTestId('search-input'), 'focus');
    expect(queryByTestId('clear-recent')).toBeNull();
  });

  it('does not show recent searches when empty array', () => {
    const { getByTestId, queryByTestId } = renderSearchBar({
      value: '',
      recentSearches: [],
    });
    fireEvent(getByTestId('search-input'), 'focus');
    expect(queryByTestId('search-recent')).toBeNull();
  });
});
