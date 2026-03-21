import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VisualSearchEmptyState } from '../VisualSearchEmptyState';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#3E2723',
      espressoLight: '#795548',
      sandBase: '#F5F0E8',
      sunsetCoral: '#FF6B47',
    },
    spacing: { md: 16, lg: 24 },
    borderRadius: { button: 8 },
  }),
}));

describe('VisualSearchEmptyState', () => {
  it('renders the empty state copy', () => {
    const { getByText } = render(<VisualSearchEmptyState onBrowseAll={jest.fn()} />);
    expect(getByText(/no similar products found/i)).toBeTruthy();
    expect(getByText(/clearer photo/i)).toBeTruthy();
  });

  it('renders "Browse All" CTA button', () => {
    const { getByText } = render(<VisualSearchEmptyState onBrowseAll={jest.fn()} />);
    expect(getByText('Browse All')).toBeTruthy();
  });

  it('calls onBrowseAll when "Browse All" is pressed', () => {
    const onBrowseAll = jest.fn();
    const { getByText } = render(<VisualSearchEmptyState onBrowseAll={onBrowseAll} />);
    fireEvent.press(getByText('Browse All'));
    expect(onBrowseAll).toHaveBeenCalledTimes(1);
  });

  it('renders with testID', () => {
    const { getByTestId } = render(
      <VisualSearchEmptyState onBrowseAll={jest.fn()} testID="vs-empty" />,
    );
    expect(getByTestId('vs-empty')).toBeTruthy();
  });
});
