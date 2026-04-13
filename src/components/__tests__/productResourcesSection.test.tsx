/**
 * Tests for ProductResourcesSection — hq-g26rc
 *
 * Covers: hidden states (loading/error/empty), collapse/expand toggle,
 * resource rendering, Linking.openURL, accessibility.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ProductResourcesSection } from '../ProductResourcesSection';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { ProductResource } from '@/hooks/useProductResources';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

const RESOURCES: ProductResource[] = [
  {
    productId: 'prod-1',
    resourceType: 'SPEC_SHEET',
    label: 'Spec Sheet',
    url: 'https://example.com/spec.pdf',
    sortOrder: 1,
    icon: '📋',
  },
  {
    productId: 'prod-1',
    resourceType: 'CARE_GUIDE',
    label: 'Care Guide',
    url: 'https://example.com/care.pdf',
    sortOrder: 2,
    icon: '🧹',
  },
];

function renderSection(props: Partial<React.ComponentProps<typeof ProductResourcesSection>> = {}) {
  return render(
    <ThemeProvider>
      <ProductResourcesSection resources={RESOURCES} loading={false} error={null} {...props} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  mockOpenURL.mockClear();
});

describe('ProductResourcesSection', () => {
  describe('hidden states', () => {
    it('renders nothing when loading', () => {
      const { queryByTestId } = renderSection({ loading: true });
      expect(queryByTestId('resources-section')).toBeNull();
    });

    it('renders nothing when error', () => {
      const { queryByTestId } = renderSection({ error: new Error('fail') });
      expect(queryByTestId('resources-section')).toBeNull();
    });

    it('renders nothing when resources is empty', () => {
      const { queryByTestId } = renderSection({ resources: [] });
      expect(queryByTestId('resources-section')).toBeNull();
    });
  });

  describe('section renders', () => {
    it('renders resources-section when resources present', () => {
      const { getByTestId } = renderSection();
      expect(getByTestId('resources-section')).toBeTruthy();
    });

    it('renders resources-list when expanded (default)', () => {
      const { getByTestId } = renderSection();
      expect(getByTestId('resources-list')).toBeTruthy();
    });

    it('renders correct number of resource items', () => {
      const { getByTestId } = renderSection();
      expect(getByTestId('resource-item-0')).toBeTruthy();
      expect(getByTestId('resource-item-1')).toBeTruthy();
    });

    it('renders resource labels', () => {
      const { getByText } = renderSection();
      expect(getByText('Spec Sheet')).toBeTruthy();
      expect(getByText('Care Guide')).toBeTruthy();
    });

    it('renders resource icons', () => {
      const { getByTestId } = renderSection();
      expect(getByTestId('resource-icon-0')).toBeTruthy();
      expect(getByTestId('resource-icon-1')).toBeTruthy();
    });
  });

  describe('collapse/expand toggle', () => {
    it('collapses list when toggle pressed', () => {
      const { getByTestId, queryByTestId } = renderSection();
      fireEvent.press(getByTestId('resources-toggle'));
      expect(queryByTestId('resources-list')).toBeNull();
    });

    it('expands list again after second toggle press', () => {
      const { getByTestId } = renderSection();
      fireEvent.press(getByTestId('resources-toggle'));
      fireEvent.press(getByTestId('resources-toggle'));
      expect(getByTestId('resources-list')).toBeTruthy();
    });
  });

  describe('Linking.openURL', () => {
    it('calls Linking.openURL with correct URL when item pressed', () => {
      const { getByTestId } = renderSection();
      fireEvent.press(getByTestId('resource-item-0'));
      expect(mockOpenURL).toHaveBeenCalledWith('https://example.com/spec.pdf');
    });

    it('calls Linking.openURL with correct URL for second item', () => {
      const { getByTestId } = renderSection();
      fireEvent.press(getByTestId('resource-item-1'));
      expect(mockOpenURL).toHaveBeenCalledWith('https://example.com/care.pdf');
    });

    it('does not throw when Linking.openURL rejects', () => {
      mockOpenURL.mockRejectedValueOnce(new Error('invalid URL'));
      const { getByTestId } = renderSection();
      expect(() => fireEvent.press(getByTestId('resource-item-0'))).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('toggle has accessibilityRole button', () => {
      const { getByTestId } = renderSection();
      expect(getByTestId('resources-toggle').props.accessibilityRole).toBe('button');
    });

    it('resource items have accessibilityRole link', () => {
      const { getByTestId } = renderSection();
      expect(getByTestId('resource-item-0').props.accessibilityRole).toBe('link');
    });

    it('resource items have accessibilityLabel matching resource label', () => {
      const { getByTestId } = renderSection();
      expect(getByTestId('resource-item-0').props.accessibilityLabel).toBe('Spec Sheet');
    });
  });
});
