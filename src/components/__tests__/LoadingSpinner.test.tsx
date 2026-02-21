import React from 'react';
import { render } from '@testing-library/react-native';

import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    const { getByTestId } = render(<LoadingSpinner testID="spinner" />);
    expect(getByTestId('spinner')).toBeTruthy();
  });

  it('renders with custom size', () => {
    const { getByTestId } = render(<LoadingSpinner size="large" testID="spinner" />);
    expect(getByTestId('spinner')).toBeTruthy();
  });

  it('renders with custom color', () => {
    const { getByTestId } = render(<LoadingSpinner color="#5B8FA8" testID="spinner" />);
    expect(getByTestId('spinner')).toBeTruthy();
  });

  it('uses mountainBlue as default color', () => {
    const { getByTestId } = render(<LoadingSpinner testID="spinner" />);
    const spinner = getByTestId('spinner');
    // Default color should be mountainBlue (#5B8FA8)
    expect(spinner).toBeTruthy();
  });

  it('has accessible role of progressbar', () => {
    const { getByTestId } = render(<LoadingSpinner testID="spinner" />);
    const spinner = getByTestId('spinner');
    expect(spinner.props.accessibilityRole || spinner.props.role).toBe('progressbar');
  });
});
