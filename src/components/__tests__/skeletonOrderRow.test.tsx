/**
 * @module SkeletonOrderRow.test
 *
 * Tests for the SkeletonOrderRow placeholder — cm-1jd.
 * Row shape: thumbnail (avatar) + 2 text lines + status badge.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { SkeletonOrderRow, SkeletonOrderRowList } from '../SkeletonOrderRow';

function wrap(element: React.ReactElement) {
  return render(<ThemeProvider>{element}</ThemeProvider>);
}

describe('SkeletonOrderRow', () => {
  it('renders with default testID', () => {
    const { getByTestId } = wrap(<SkeletonOrderRow />);
    expect(getByTestId('skeleton-order-row')).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = wrap(<SkeletonOrderRow testID="skeleton-order-row-0" />);
    expect(getByTestId('skeleton-order-row-0')).toBeTruthy();
  });

  it('renders avatar placeholder', () => {
    const { getByTestId } = wrap(<SkeletonOrderRow />);
    expect(getByTestId('skeleton-order-row-avatar')).toBeTruthy();
  });

  it('renders two text line placeholders', () => {
    const { getByTestId } = wrap(<SkeletonOrderRow />);
    expect(getByTestId('skeleton-order-row-line1')).toBeTruthy();
    expect(getByTestId('skeleton-order-row-line2')).toBeTruthy();
  });

  it('renders status badge placeholder', () => {
    const { getByTestId } = wrap(<SkeletonOrderRow />);
    expect(getByTestId('skeleton-order-row-badge')).toBeTruthy();
  });

  it('has accessible loading label', () => {
    const { getByTestId } = wrap(<SkeletonOrderRow />);
    expect(getByTestId('skeleton-order-row').props.accessibilityLabel).toBe('Loading order');
  });
});

describe('SkeletonOrderRowList', () => {
  it('renders the specified number of rows', () => {
    const { getAllByTestId } = wrap(<SkeletonOrderRowList count={4} />);
    expect(getAllByTestId(/skeleton-order-row-\d+/)).toHaveLength(4);
  });

  it('renders with default count of 4', () => {
    const { getAllByTestId } = wrap(<SkeletonOrderRowList />);
    expect(getAllByTestId(/skeleton-order-row-\d+/)).toHaveLength(4);
  });

  it('renders with skeleton-order-row-list testID', () => {
    const { getByTestId } = wrap(<SkeletonOrderRowList />);
    expect(getByTestId('skeleton-order-row-list')).toBeTruthy();
  });
});
