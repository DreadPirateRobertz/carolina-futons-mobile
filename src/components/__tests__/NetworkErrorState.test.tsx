import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { NetworkErrorState } from '../NetworkErrorState';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderError(props: Partial<React.ComponentProps<typeof NetworkErrorState>> = {}) {
  const defaultProps = {
    onRetry: jest.fn(),
    ...props,
  };
  return { ...render(
    <ThemeProvider>
      <NetworkErrorState {...defaultProps} />
    </ThemeProvider>,
  ), onRetry: defaultProps.onRetry };
}

describe('NetworkErrorState', () => {
  it('renders with default testID', () => {
    const { getByTestId } = renderError();
    expect(getByTestId('network-error-state')).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = renderError({ testID: 'custom-error' });
    expect(getByTestId('custom-error')).toBeTruthy();
  });

  it('shows default error message', () => {
    const { getByText } = renderError();
    expect(getByText(/couldn.*connect/i)).toBeTruthy();
  });

  it('shows custom error message', () => {
    const { getByText } = renderError({ message: 'Server is down' });
    expect(getByText('Server is down')).toBeTruthy();
  });

  it('renders retry button', () => {
    const { getByTestId } = renderError();
    expect(getByTestId('network-error-retry')).toBeTruthy();
  });

  it('calls onRetry when retry button pressed', () => {
    const { getByTestId, onRetry } = renderError();
    fireEvent.press(getByTestId('network-error-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('retry button has accessibility label', () => {
    const { getByTestId } = renderError();
    const btn = getByTestId('network-error-retry');
    expect(btn.props.accessibilityLabel).toBe('Retry');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('container has alert accessibility role', () => {
    const { getByTestId } = renderError();
    expect(getByTestId('network-error-state').props.accessibilityRole).toBe('alert');
  });

  it('shows retrying state with spinner when isRetrying is true', () => {
    const { getByTestId, queryByTestId } = renderError({ isRetrying: true });
    expect(getByTestId('network-error-spinner')).toBeTruthy();
    expect(queryByTestId('network-error-retry')).toBeNull();
  });

  it('shows retry button when isRetrying is false', () => {
    const { getByTestId, queryByTestId } = renderError({ isRetrying: false });
    expect(getByTestId('network-error-retry')).toBeTruthy();
    expect(queryByTestId('network-error-spinner')).toBeNull();
  });

  it('shows wifi-off icon', () => {
    const { getByTestId } = renderError();
    expect(getByTestId('network-error-icon')).toBeTruthy();
  });

  it('renders compact variant', () => {
    const { getByTestId } = renderError({ compact: true });
    expect(getByTestId('network-error-state')).toBeTruthy();
  });
});
