/**
 * @module SkeletonOrderRow.test
 *
 * Tests for the SkeletonOrderRow placeholder — cm-1jd.
 * Row shape: thumbnail (avatar) + 2 text lines + status badge.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { SkeletonOrderRow, SkeletonOrderRowList } from '../SkeletonOrderRow';

describe('SkeletonOrderRow', () => {
  it('renders with default testID', () => {
    const { getByTestId } = render(<SkeletonOrderRow />);
    expect(getByTestId('skeleton-order-row')).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = render(<SkeletonOrderRow testID="skeleton-order-row-0" />);
    expect(getByTestId('skeleton-order-row-0')).toBeTruthy();
  });

  it('renders avatar placeholder', () => {
    const { getByTestId } = render(<SkeletonOrderRow />);
    expect(getByTestId('skeleton-order-row-avatar')).toBeTruthy();
  });

  it('renders two text line placeholders', () => {
    const { getByTestId } = render(<SkeletonOrderRow />);
    expect(getByTestId('skeleton-order-row-line1')).toBeTruthy();
    expect(getByTestId('skeleton-order-row-line2')).toBeTruthy();
  });

  it('renders status badge placeholder', () => {
    const { getByTestId } = render(<SkeletonOrderRow />);
    expect(getByTestId('skeleton-order-row-badge')).toBeTruthy();
  });

  it('has accessible loading label', () => {
    const { getByTestId } = render(<SkeletonOrderRow />);
    expect(getByTestId('skeleton-order-row').props.accessibilityLabel).toBe('Loading order');
  });
});

describe('SkeletonOrderRowList', () => {
  it('renders the specified number of rows', () => {
    const { getAllByTestId } = render(<SkeletonOrderRowList count={4} />);
    expect(getAllByTestId(/skeleton-order-row-\d+/)).toHaveLength(4);
  });

  it('renders with default count of 4', () => {
    const { getAllByTestId } = render(<SkeletonOrderRowList />);
    expect(getAllByTestId(/skeleton-order-row-\d+/)).toHaveLength(4);
  });

  it('renders with skeleton-order-row-list testID', () => {
    const { getByTestId } = render(<SkeletonOrderRowList />);
    expect(getByTestId('skeleton-order-row-list')).toBeTruthy();
  });
});
