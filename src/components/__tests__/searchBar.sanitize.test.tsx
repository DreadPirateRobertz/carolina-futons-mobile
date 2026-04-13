/**
 * SearchBar sanitize-on-submit tests — cm-aq8
 *
 * Submit-time input sanitization so malicious payloads never leave the UI boundary.
 * Sanitization already happens at the persistence layer; this locks it in at the
 * input boundary too (defense-in-depth) — covers onSubmitEditing and tap-to-submit
 * via suggestion/recent rows.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { SearchBar } from '../SearchBar';

function renderBar(props: Partial<React.ComponentProps<typeof SearchBar>> = {}) {
  const onSubmitSearch = jest.fn();
  const onChangeText = jest.fn();
  const utils = render(
    <ThemeProvider>
      <SearchBar
        value={props.value ?? ''}
        onChangeText={onChangeText}
        onSubmitSearch={onSubmitSearch}
        suggestions={props.suggestions}
        recentSearches={props.recentSearches}
        {...props}
      />
    </ThemeProvider>,
  );
  return { ...utils, onSubmitSearch, onChangeText };
}

describe('SearchBar — sanitizeInput at submit (cm-aq8)', () => {
  describe('onSubmitEditing', () => {
    it('passes plain queries through unchanged', () => {
      const { getByTestId, onSubmitSearch } = renderBar({ value: 'leather futon' });
      fireEvent(getByTestId('search-input'), 'submitEditing');
      expect(onSubmitSearch).toHaveBeenCalledWith('leather futon');
    });

    it('strips HTML/script tags before submit', () => {
      const { getByTestId, onSubmitSearch } = renderBar({
        value: '<script>alert(1)</script>futon',
      });
      fireEvent(getByTestId('search-input'), 'submitEditing');
      expect(onSubmitSearch).toHaveBeenCalledTimes(1);
      const arg = onSubmitSearch.mock.calls[0][0];
      expect(arg).not.toMatch(/<script/i);
      expect(arg).not.toMatch(/<\/script/i);
      expect(arg).toContain('futon');
    });

    it('defangs SQL keyword combos', () => {
      const { getByTestId, onSubmitSearch } = renderBar({
        value: "sofa'; DROP TABLE users",
      });
      fireEvent(getByTestId('search-input'), 'submitEditing');
      const arg = onSubmitSearch.mock.calls[0][0];
      expect(arg).not.toMatch(/DROP\s+TABLE/i);
    });

    it('does not submit when sanitized value is empty', () => {
      const { getByTestId, onSubmitSearch } = renderBar({
        value: '<script></script>',
      });
      fireEvent(getByTestId('search-input'), 'submitEditing');
      expect(onSubmitSearch).not.toHaveBeenCalled();
    });

    it('does not submit when value is only whitespace', () => {
      const { getByTestId, onSubmitSearch } = renderBar({ value: '   ' });
      fireEvent(getByTestId('search-input'), 'submitEditing');
      expect(onSubmitSearch).not.toHaveBeenCalled();
    });

    it('trims surrounding whitespace before submit', () => {
      const { getByTestId, onSubmitSearch } = renderBar({ value: '  rug  ' });
      fireEvent(getByTestId('search-input'), 'submitEditing');
      expect(onSubmitSearch).toHaveBeenCalledWith('rug');
    });
  });

  describe('suggestion tap', () => {
    it('submits sanitized value when tapping a suggestion', () => {
      const malicious = '<img src=x onerror=alert(1)>chair';
      const { getByTestId, onSubmitSearch } = renderBar({
        value: 'cha',
        suggestions: [malicious],
      });
      fireEvent(getByTestId('search-input'), 'focus');
      fireEvent.press(getByTestId(`suggestion-${malicious}`));
      expect(onSubmitSearch).toHaveBeenCalledTimes(1);
      const arg = onSubmitSearch.mock.calls[0][0];
      expect(arg).not.toMatch(/onerror/i);
      expect(arg).not.toMatch(/<img/i);
      expect(arg).toContain('chair');
    });
  });

  describe('recent tap', () => {
    it('submits sanitized value when tapping a recent search', () => {
      const malicious = "'; DELETE FROM orders --";
      const { getByTestId, onSubmitSearch } = renderBar({
        value: '',
        recentSearches: [malicious],
      });
      fireEvent(getByTestId('search-input'), 'focus');
      fireEvent.press(getByTestId(`recent-${malicious}`));
      expect(onSubmitSearch).toHaveBeenCalledTimes(1);
      const arg = onSubmitSearch.mock.calls[0][0];
      expect(arg).not.toMatch(/DELETE\s+FROM/i);
      expect(arg).not.toMatch(/--/);
    });
  });
});
