/**
 * TDD tests for RoomGalleryFilterBar component.
 *
 * Covers:
 *  - Renders style pills: All, Modern, Coastal, Rustic, Traditional
 *  - Tapping a style pill calls setStyleFilter with that style
 *  - Tapping "All" style pill calls setStyleFilter(null)
 *  - Active style pill is visually marked (accessibilityState selected)
 *  - Renders product options when provided
 *  - Tapping a product pill calls setProductFilter with that productId
 *  - Active product pill is visually marked
 *  - "Clear filters" button appears when hasActiveFilters is true
 *  - "Clear filters" button hidden when no filters active
 *  - Tapping "Clear filters" calls clearFilters
 *  - testID="room-gallery-filter-bar" on root
 *
 * hq-322: Room gallery filters by style tag and by product.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RoomGalleryFilterBar } from '../RoomGalleryFilterBar';
import type { RoomGalleryStyle } from '@/hooks/useRoomGalleryFilters';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#3B2A1A',
      espressoLight: '#7A6456',
      sandLight: '#F5F0E8',
      white: '#FFFFFF',
      mountainBlue: '#4A7C8E',
      sunsetCoral: '#E07A5F',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
    borderRadius: { pill: 20, sm: 4 },
    typography: { bodyFamily: 'SourceSans3_400Regular', bodyFamilyBold: 'SourceSans3_700Bold' },
  }),
}));

const PRODUCT_OPTIONS = [
  { id: 'p1', name: 'Asheville Full' },
  { id: 'p2', name: 'Biltmore Queen' },
];

function defaultProps(overrides = {}) {
  return {
    filters: {
      style: null as RoomGalleryStyle | null,
      productId: null as string | null,
      featuredOnly: false,
    },
    setStyleFilter: jest.fn(),
    setProductFilter: jest.fn(),
    clearFilters: jest.fn(),
    hasActiveFilters: false,
    productOptions: PRODUCT_OPTIONS,
    ...overrides,
  };
}

describe('RoomGalleryFilterBar', () => {
  it('renders with testID room-gallery-filter-bar', () => {
    const { getByTestId } = render(<RoomGalleryFilterBar {...defaultProps()} />);
    expect(getByTestId('room-gallery-filter-bar')).toBeTruthy();
  });

  describe('style pills', () => {
    it('renders All, Modern, Coastal, Rustic, Traditional pills', () => {
      const { getByText } = render(<RoomGalleryFilterBar {...defaultProps()} />);
      expect(getByText('All')).toBeTruthy();
      expect(getByText('Modern')).toBeTruthy();
      expect(getByText('Coastal')).toBeTruthy();
      expect(getByText('Rustic')).toBeTruthy();
      expect(getByText('Traditional')).toBeTruthy();
    });

    it('tapping Modern calls setStyleFilter("Modern")', () => {
      const setStyleFilter = jest.fn();
      const { getByTestId } = render(
        <RoomGalleryFilterBar {...defaultProps({ setStyleFilter })} />,
      );
      fireEvent.press(getByTestId('style-pill-Modern'));
      expect(setStyleFilter).toHaveBeenCalledWith('Modern');
    });

    it('tapping Coastal calls setStyleFilter("Coastal")', () => {
      const setStyleFilter = jest.fn();
      const { getByTestId } = render(
        <RoomGalleryFilterBar {...defaultProps({ setStyleFilter })} />,
      );
      fireEvent.press(getByTestId('style-pill-Coastal'));
      expect(setStyleFilter).toHaveBeenCalledWith('Coastal');
    });

    it('tapping Rustic calls setStyleFilter("Rustic")', () => {
      const setStyleFilter = jest.fn();
      const { getByTestId } = render(
        <RoomGalleryFilterBar {...defaultProps({ setStyleFilter })} />,
      );
      fireEvent.press(getByTestId('style-pill-Rustic'));
      expect(setStyleFilter).toHaveBeenCalledWith('Rustic');
    });

    it('tapping Traditional calls setStyleFilter("Traditional")', () => {
      const setStyleFilter = jest.fn();
      const { getByTestId } = render(
        <RoomGalleryFilterBar {...defaultProps({ setStyleFilter })} />,
      );
      fireEvent.press(getByTestId('style-pill-Traditional'));
      expect(setStyleFilter).toHaveBeenCalledWith('Traditional');
    });

    it('tapping All calls setStyleFilter(null)', () => {
      const setStyleFilter = jest.fn();
      const { getByTestId } = render(
        <RoomGalleryFilterBar {...defaultProps({ setStyleFilter })} />,
      );
      fireEvent.press(getByTestId('style-pill-All'));
      expect(setStyleFilter).toHaveBeenCalledWith(null);
    });

    it('active style pill has accessibilityState selected=true', () => {
      const { getByTestId } = render(
        <RoomGalleryFilterBar
          {...defaultProps({ filters: { style: 'Rustic', productId: null } })}
        />,
      );
      expect(getByTestId('style-pill-Rustic').props.accessibilityState?.selected).toBe(true);
    });

    it('inactive style pill has accessibilityState selected=false', () => {
      const { getByTestId } = render(
        <RoomGalleryFilterBar
          {...defaultProps({ filters: { style: 'Rustic', productId: null } })}
        />,
      );
      expect(getByTestId('style-pill-Modern').props.accessibilityState?.selected).toBe(false);
    });

    it('All pill selected when style filter is null', () => {
      const { getByTestId } = render(
        <RoomGalleryFilterBar {...defaultProps({ filters: { style: null, productId: null } })} />,
      );
      expect(getByTestId('style-pill-All').props.accessibilityState?.selected).toBe(true);
    });
  });

  describe('product pills', () => {
    it('renders a pill for each product option', () => {
      const { getByTestId } = render(<RoomGalleryFilterBar {...defaultProps()} />);
      expect(getByTestId('product-pill-p1')).toBeTruthy();
      expect(getByTestId('product-pill-p2')).toBeTruthy();
    });

    it('renders product names on pills', () => {
      const { getByText } = render(<RoomGalleryFilterBar {...defaultProps()} />);
      expect(getByText('Asheville Full')).toBeTruthy();
      expect(getByText('Biltmore Queen')).toBeTruthy();
    });

    it('tapping a product pill calls setProductFilter with its id', () => {
      const setProductFilter = jest.fn();
      const { getByTestId } = render(
        <RoomGalleryFilterBar {...defaultProps({ setProductFilter })} />,
      );
      fireEvent.press(getByTestId('product-pill-p1'));
      expect(setProductFilter).toHaveBeenCalledWith('p1');
    });

    it('tapping the active product pill calls setProductFilter(null) to deselect', () => {
      const setProductFilter = jest.fn();
      const { getByTestId } = render(
        <RoomGalleryFilterBar
          {...defaultProps({
            setProductFilter,
            filters: { style: null, productId: 'p1' },
          })}
        />,
      );
      fireEvent.press(getByTestId('product-pill-p1'));
      expect(setProductFilter).toHaveBeenCalledWith(null);
    });

    it('active product pill has accessibilityState selected=true', () => {
      const { getByTestId } = render(
        <RoomGalleryFilterBar {...defaultProps({ filters: { style: null, productId: 'p2' } })} />,
      );
      expect(getByTestId('product-pill-p2').props.accessibilityState?.selected).toBe(true);
    });

    it('renders nothing for product row when productOptions is empty', () => {
      const { queryByTestId } = render(
        <RoomGalleryFilterBar {...defaultProps({ productOptions: [] })} />,
      );
      expect(queryByTestId('product-pill-p1')).toBeNull();
    });
  });

  describe('clear filters button', () => {
    it('hidden when hasActiveFilters is false', () => {
      const { queryByTestId } = render(
        <RoomGalleryFilterBar {...defaultProps({ hasActiveFilters: false })} />,
      );
      expect(queryByTestId('filter-bar-clear')).toBeNull();
    });

    it('visible when hasActiveFilters is true', () => {
      const { getByTestId } = render(
        <RoomGalleryFilterBar {...defaultProps({ hasActiveFilters: true })} />,
      );
      expect(getByTestId('filter-bar-clear')).toBeTruthy();
    });

    it('calls clearFilters when tapped', () => {
      const clearFilters = jest.fn();
      const { getByTestId } = render(
        <RoomGalleryFilterBar {...defaultProps({ hasActiveFilters: true, clearFilters })} />,
      );
      fireEvent.press(getByTestId('filter-bar-clear'));
      expect(clearFilters).toHaveBeenCalledTimes(1);
    });
  });
});
