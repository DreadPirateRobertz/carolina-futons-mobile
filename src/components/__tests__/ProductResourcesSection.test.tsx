/**
 * Tests for ProductResourcesSection — hq-g26rc
 * TDD: tests written before implementation per Melania Directive.
 *
 * Collapsible section rendering tappable resource items that open URLs
 * via Linking.openURL.
 */

import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductResourcesSection } from '../ProductResourcesSection';
import { type ProductResource } from '@/hooks/useProductResources';

const mockResources: ProductResource[] = [
  {
    productId: 'prod-1',
    resourceType: 'SPEC_SHEET',
    label: 'Product Spec Sheet',
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
  {
    productId: 'prod-1',
    resourceType: 'VIDEO',
    label: 'Assembly Video',
    url: 'https://example.com/video',
    sortOrder: 3,
    icon: '🎬',
  },
];

describe('ProductResourcesSection', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('empty / hidden states', () => {
    it('renders nothing when resources array is empty', () => {
      const { queryByTestId } = render(
        <ProductResourcesSection resources={[]} loading={false} error={null} />,
      );
      expect(queryByTestId('resources-section')).toBeNull();
    });

    it('renders nothing while loading', () => {
      const { queryByTestId } = render(
        <ProductResourcesSection resources={[]} loading={true} error={null} />,
      );
      expect(queryByTestId('resources-section')).toBeNull();
    });

    it('renders nothing on error', () => {
      const { queryByTestId } = render(
        <ProductResourcesSection
          resources={[]}
          loading={false}
          error={new Error('fetch failed')}
        />,
      );
      expect(queryByTestId('resources-section')).toBeNull();
    });
  });

  describe('section rendering', () => {
    it('renders section when resources are present', () => {
      const { getByTestId } = render(
        <ProductResourcesSection resources={mockResources} loading={false} error={null} />,
      );
      expect(getByTestId('resources-section')).toBeTruthy();
    });

    it('renders "Resources" header text', () => {
      const { getByText } = render(
        <ProductResourcesSection resources={mockResources} loading={false} error={null} />,
      );
      expect(getByText('Resources')).toBeTruthy();
    });

    it('renders collapse toggle button', () => {
      const { getByTestId } = render(
        <ProductResourcesSection resources={mockResources} loading={false} error={null} />,
      );
      expect(getByTestId('resources-toggle')).toBeTruthy();
    });
  });

  describe('collapsed / expanded behavior', () => {
    it('starts expanded showing all resource items', () => {
      const { getByTestId } = render(
        <ProductResourcesSection resources={mockResources} loading={false} error={null} />,
      );
      expect(getByTestId('resources-list')).toBeTruthy();
      expect(getByTestId('resource-item-0')).toBeTruthy();
      expect(getByTestId('resource-item-1')).toBeTruthy();
      expect(getByTestId('resource-item-2')).toBeTruthy();
    });

    it('hides resource list when toggle is pressed (collapse)', () => {
      const { getByTestId, queryByTestId } = render(
        <ProductResourcesSection resources={mockResources} loading={false} error={null} />,
      );
      fireEvent.press(getByTestId('resources-toggle'));
      expect(queryByTestId('resources-list')).toBeNull();
    });

    it('shows resource list again when toggle pressed twice (expand)', () => {
      const { getByTestId } = render(
        <ProductResourcesSection resources={mockResources} loading={false} error={null} />,
      );
      fireEvent.press(getByTestId('resources-toggle'));
      fireEvent.press(getByTestId('resources-toggle'));
      expect(getByTestId('resources-list')).toBeTruthy();
    });
  });

  describe('resource items', () => {
    it('renders label for each resource', () => {
      const { getByText } = render(
        <ProductResourcesSection resources={mockResources} loading={false} error={null} />,
      );
      expect(getByText('Product Spec Sheet')).toBeTruthy();
      expect(getByText('Care Guide')).toBeTruthy();
      expect(getByText('Assembly Video')).toBeTruthy();
    });

    it('renders icon for each resource', () => {
      const { getByTestId } = render(
        <ProductResourcesSection resources={mockResources} loading={false} error={null} />,
      );
      expect(getByTestId('resource-icon-0')).toBeTruthy();
      expect(getByTestId('resource-icon-1')).toBeTruthy();
    });

    it('tapping a resource calls Linking.openURL with its url', () => {
      const { getByTestId } = render(
        <ProductResourcesSection resources={mockResources} loading={false} error={null} />,
      );
      fireEvent.press(getByTestId('resource-item-0'));
      expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/spec.pdf');
    });

    it('tapping second resource opens its url', () => {
      const { getByTestId } = render(
        <ProductResourcesSection resources={mockResources} loading={false} error={null} />,
      );
      fireEvent.press(getByTestId('resource-item-1'));
      expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/care.pdf');
    });

    it('each resource item has correct accessibilityRole button', () => {
      const { getByTestId } = render(
        <ProductResourcesSection resources={mockResources} loading={false} error={null} />,
      );
      expect(getByTestId('resource-item-0').props.accessibilityRole).toBe('button');
    });

    it('each resource item has accessibilityLabel with its label', () => {
      const { getByTestId } = render(
        <ProductResourcesSection resources={mockResources} loading={false} error={null} />,
      );
      expect(getByTestId('resource-item-0').props.accessibilityLabel).toContain(
        'Product Spec Sheet',
      );
    });
  });

  describe('single resource', () => {
    it('renders correctly with one resource', () => {
      const { getByTestId, getByText } = render(
        <ProductResourcesSection resources={[mockResources[0]]} loading={false} error={null} />,
      );
      expect(getByTestId('resources-section')).toBeTruthy();
      expect(getByText('Product Spec Sheet')).toBeTruthy();
    });
  });

  describe('Linking error handling', () => {
    it('does not throw when Linking.openURL rejects', async () => {
      jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('cannot open'));
      const { getByTestId } = render(
        <ProductResourcesSection resources={mockResources} loading={false} error={null} />,
      );
      expect(() => fireEvent.press(getByTestId('resource-item-0'))).not.toThrow();
    });
  });
});
