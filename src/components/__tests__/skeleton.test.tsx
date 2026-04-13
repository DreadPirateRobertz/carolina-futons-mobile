import React from 'react';
import { render } from '@testing-library/react-native';

import { SkeletonRow, SkeletonCard, SkeletonGrid } from '../Skeleton';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sandBase: '#E8D5B7',
      espresso: '#3A2518',
      sandDark: '#D4BC96',
    },
    spacing: { xs: 4, sm: 8, md: 16 },
    borderRadius: { sm: 4, md: 8 },
  }),
}));

jest.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

describe('SkeletonRow', () => {
  it('renders with default dimensions', () => {
    const { getByTestId } = render(<SkeletonRow testID="sk-row" />);
    expect(getByTestId('sk-row')).toBeTruthy();
  });

  it('passes width and height props through to style', () => {
    const { getByTestId } = render(<SkeletonRow testID="sk-row" width={200} height={24} />);
    const el = getByTestId('sk-row');
    const style = Array.isArray(el.props.style)
      ? Object.assign({}, ...el.props.style)
      : el.props.style;
    expect(style.width).toBe(200);
    expect(style.height).toBe(24);
  });

  it('honors borderRadius prop', () => {
    const { getByTestId } = render(<SkeletonRow testID="sk-row" borderRadius={12} />);
    const el = getByTestId('sk-row');
    const style = Array.isArray(el.props.style)
      ? Object.assign({}, ...el.props.style)
      : el.props.style;
    expect(style.borderRadius).toBe(12);
  });

  it('does not animate when animated={false}', () => {
    const { getByTestId } = render(<SkeletonRow testID="sk-row" animated={false} />);
    expect(getByTestId('sk-row')).toBeTruthy();
  });
});

describe('SkeletonCard', () => {
  it('renders body lines based on lines prop', () => {
    const { getAllByTestId } = render(<SkeletonCard testID="sk-card" lines={3} />);
    expect(getAllByTestId('sk-card-line').length).toBe(3);
  });

  it('renders header placeholder when header={true}', () => {
    const { getByTestId } = render(<SkeletonCard testID="sk-card" header lines={2} />);
    expect(getByTestId('sk-card-header')).toBeTruthy();
  });

  it('omits header when header={false}', () => {
    const { queryByTestId } = render(<SkeletonCard testID="sk-card" lines={2} />);
    expect(queryByTestId('sk-card-header')).toBeNull();
  });

  it('defaults to one line when lines not specified', () => {
    const { getAllByTestId } = render(<SkeletonCard testID="sk-card" />);
    expect(getAllByTestId('sk-card-line').length).toBe(1);
  });
});

describe('SkeletonGrid', () => {
  it('renders rows × columns cards', () => {
    const { getAllByTestId } = render(<SkeletonGrid testID="sk-grid" rows={2} columns={3} />);
    expect(getAllByTestId('sk-grid-card').length).toBe(6);
  });

  it('renders zero cards when rows=0', () => {
    const { queryAllByTestId } = render(<SkeletonGrid testID="sk-grid" rows={0} columns={3} />);
    expect(queryAllByTestId('sk-grid-card').length).toBe(0);
  });

  it('defaults to 1×1 when no dims given', () => {
    const { getAllByTestId } = render(<SkeletonGrid testID="sk-grid" />);
    expect(getAllByTestId('sk-grid-card').length).toBe(1);
  });
});
