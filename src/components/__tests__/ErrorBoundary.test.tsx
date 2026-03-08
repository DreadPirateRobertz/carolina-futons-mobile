import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ErrorBoundary } from '../ErrorBoundary';
import * as crashReporting from '@/services/crashReporting';

function BrokenComponent(): React.ReactElement {
  throw new Error('Component crashed!');
}

function WorkingComponent() {
  return (
    <View testID="working">
      <Text>Works fine</Text>
    </View>
  );
}

// Suppress console.error for expected errors
let consoleError: jest.SpyInstance;
beforeEach(() => {
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  crashReporting.resetForTesting();
  jest.useFakeTimers();
});
afterEach(() => {
  consoleError.mockRestore();
  jest.useRealTimers();
});

describe('ErrorBoundary', () => {
  describe('normal rendering', () => {
    it('renders children when no error', () => {
      const { getByTestId } = render(
        <ErrorBoundary>
          <WorkingComponent />
        </ErrorBoundary>,
      );
      expect(getByTestId('working')).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('renders branded fallback UI when child throws', () => {
      const { getByText, getByTestId } = render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>,
      );
      expect(getByText('Something went wrong')).toBeTruthy();
      expect(getByText('Component crashed!')).toBeTruthy();
      expect(getByTestId('error-boundary')).toBeTruthy();
    });

    it('renders custom fallback when provided', () => {
      const { getByText } = render(
        <ErrorBoundary fallback={<Text>Custom fallback</Text>}>
          <BrokenComponent />
        </ErrorBoundary>,
      );
      expect(getByText('Custom fallback')).toBeTruthy();
    });

    it('calls onError callback', () => {
      const onError = jest.fn();
      render(
        <ErrorBoundary onError={onError}>
          <BrokenComponent />
        </ErrorBoundary>,
      );
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Component crashed!' }),
        expect.objectContaining({ componentStack: expect.any(String) }),
      );
    });

    it('reports error to crash reporting', () => {
      render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>,
      );
      const log = crashReporting.getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].error.message).toBe('Component crashed!');
      expect(log[0].severity).toBe('fatal');
    });
  });

  describe('retry', () => {
    it('renders retry button in branded fallback', () => {
      const { getByTestId } = render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>,
      );
      expect(getByTestId('error-boundary-retry')).toBeTruthy();
    });

    it('shows spinner then retries on press', () => {
      const { getByTestId, queryByTestId } = render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>,
      );
      fireEvent.press(getByTestId('error-boundary-retry'));
      expect(getByTestId('error-boundary-spinner')).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(600);
      });
      // After retry, the broken component throws again so fallback re-appears
      expect(queryByTestId('error-boundary-spinner')).toBeNull();
    });

    it('retry button has correct accessibility', () => {
      const { getByTestId } = render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>,
      );
      const btn = getByTestId('error-boundary-retry');
      expect(btn.props.accessibilityLabel).toBe('Try again');
      expect(btn.props.accessibilityRole).toBe('button');
    });
  });

  describe('custom testID', () => {
    it('accepts custom testID', () => {
      const { getByTestId } = render(
        <ErrorBoundary testID="my-boundary">
          <BrokenComponent />
        </ErrorBoundary>,
      );
      expect(getByTestId('my-boundary')).toBeTruthy();
    });
  });
});
