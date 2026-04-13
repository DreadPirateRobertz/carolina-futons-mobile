import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { SearchBar } from '../SearchBar';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#3A2518',
      sandLight: '#F0E5D0',
      muted: '#999',
      mountainBlueDark: '#234E70',
    },
    borderRadius: { lg: 16 },
  }),
}));

describe('SearchBar a11y (cm-pkp)', () => {
  it('TextInput exposes accessibilityHint', () => {
    const { getByTestId } = render(<SearchBar value="" onChangeText={jest.fn()} />);
    const input = getByTestId('search-input');
    expect(input.props.accessibilityHint).toMatch(/search/i);
  });

  it('clear button has accessibilityRole=button', () => {
    const { getByTestId } = render(<SearchBar value="chair" onChangeText={jest.fn()} />);
    expect(getByTestId('search-clear').props.accessibilityRole).toBe('button');
  });

  it('suggestion items have accessibilityRole=button', () => {
    const { getByTestId } = render(
      <SearchBar value="ch" onChangeText={jest.fn()} suggestions={['chair', 'chaise']} />,
    );
    fireEvent(getByTestId('search-input'), 'focus');
    expect(getByTestId('suggestion-chair').props.accessibilityRole).toBe('button');
  });

  it('recent search items and remove buttons have accessibilityRole=button', () => {
    const { getByTestId } = render(
      <SearchBar
        value=""
        onChangeText={jest.fn()}
        recentSearches={['sofa']}
        onRemoveRecent={jest.fn()}
        onClearRecent={jest.fn()}
      />,
    );
    fireEvent(getByTestId('search-input'), 'focus');
    expect(getByTestId('recent-sofa').props.accessibilityRole).toBe('button');
    expect(getByTestId('remove-recent-sofa').props.accessibilityRole).toBe('button');
    expect(getByTestId('clear-recent').props.accessibilityRole).toBe('button');
  });
});
