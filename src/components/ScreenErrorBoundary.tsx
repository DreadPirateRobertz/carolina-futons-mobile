/**
 * @module ScreenErrorBoundary
 *
 * Screen-level React error boundary that catches render crashes and isolates
 * them to individual screens rather than crashing the entire app. Reports
 * errors to the crash reporting service with the screen name for diagnostics.
 * Renders a branded fallback with "Try Again" and optional "Go Home" actions.
 */

import React, { Component, type ErrorInfo } from 'react';
import * as crashReporting from '@/services/crashReporting';
import { BrandedErrorFallback } from '@/components/BrandedErrorFallback';

interface Props {
  children: React.ReactNode;
  screenName: string;
  onNavigateHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Screen-level error boundary that isolates crashes to individual screens.
 * Unlike the root ErrorBoundary, this offers "Go Home" navigation and
 * includes the screen name in crash reports for better diagnostics.
 */
export class ScreenErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    crashReporting.captureException(error, 'error', {
      screen: this.props.screenName,
      componentStack: errorInfo.componentStack ?? 'unknown',
    });
    crashReporting.addBreadcrumb(
      `Screen crash: ${this.props.screenName}`,
      'error',
      { message: error.message },
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    this.props.onNavigateHome?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <BrandedErrorFallback
          title="This page ran into an issue"
          message={
            __DEV__
              ? this.state.error?.message ?? 'An unexpected error occurred'
              : 'Something went wrong. Please try again.'
          }
          onRetry={this.handleRetry}
          onGoHome={this.props.onNavigateHome ? this.handleGoHome : undefined}
          testID={`screen-error-${this.props.screenName}`}
        />
      );
    }

    return this.props.children;
  }
}
