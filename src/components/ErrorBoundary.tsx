/**
 * @module ErrorBoundary
 *
 * Root-level React error boundary that catches render errors from any
 * descendant component. Reports crashes to the crash reporting service
 * and renders a branded fallback UI with MountainSkyline backdrop and
 * retry button. Wrap at the top of the component tree to prevent
 * full-app white-screens.
 */

import React, { Component, type ErrorInfo } from 'react';
import * as crashReporting from '@/services/crashReporting';
import { BrandedErrorFallback } from '@/components/BrandedErrorFallback';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  testID?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Root error boundary that catches unhandled render errors.
 * Reports to crash reporting and shows a branded retry fallback.
 *
 * @param props.children - App subtree to protect
 * @param props.fallback - Optional custom fallback UI
 * @param props.onError - Optional callback for additional error handling
 * @param props.testID - Test identifier for the fallback container
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    crashReporting.captureException(error, 'fatal', {
      componentStack: errorInfo.componentStack ?? 'unknown',
    });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <BrandedErrorFallback
          title="Something went wrong"
          message={this.state.error?.message ?? 'An unexpected error occurred'}
          onRetry={this.handleRetry}
          testID={this.props.testID ?? 'error-boundary'}
        />
      );
    }

    return this.props.children;
  }
}
