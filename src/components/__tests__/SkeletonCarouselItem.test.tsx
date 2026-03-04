import React from 'react';
import { render } from '@testing-library/react-native';
import { SkeletonCarouselItem, SkeletonCarouselRow } from '../SkeletonCarouselItem';
import { ThemeProvider } from '@/theme/ThemeProvider';

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('SkeletonCarouselItem', () => {
  it('renders with default testID', () => {
    const { getByTestId } = wrap(<SkeletonCarouselItem />);
    expect(getByTestId('skeleton-carousel-item')).toBeTruthy();
  });

  it('renders with custom testID', () => {
    const { getByTestId } = wrap(<SkeletonCarouselItem testID="custom" />);
    expect(getByTestId('custom')).toBeTruthy();
  });

  it('has accessibility label', () => {
    const { getByLabelText } = wrap(<SkeletonCarouselItem />);
    expect(getByLabelText('Loading recommendation')).toBeTruthy();
  });
});

describe('SkeletonCarouselRow', () => {
  it('renders default 3 items', () => {
    const { getByTestId } = wrap(<SkeletonCarouselRow />);
    expect(getByTestId('skeleton-carousel-row')).toBeTruthy();
    expect(getByTestId('skeleton-carousel-0')).toBeTruthy();
    expect(getByTestId('skeleton-carousel-1')).toBeTruthy();
    expect(getByTestId('skeleton-carousel-2')).toBeTruthy();
  });

  it('renders custom count', () => {
    const { getByTestId, queryByTestId } = wrap(<SkeletonCarouselRow count={2} />);
    expect(getByTestId('skeleton-carousel-0')).toBeTruthy();
    expect(getByTestId('skeleton-carousel-1')).toBeTruthy();
    expect(queryByTestId('skeleton-carousel-2')).toBeNull();
  });
});
