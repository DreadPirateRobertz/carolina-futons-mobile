import React, { Component, type ErrorInfo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import * as crashReporting from '@/services/crashReporting';
import { colors, spacing, borderRadius, typography } from '@/theme/tokens';

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
        <View style={styles.container} testID={`screen-error-${this.props.screenName}`}>
          <Text style={styles.icon}>⚠</Text>
          <Text style={styles.title}>This page ran into an issue</Text>
          <Text style={styles.message}>
            {__DEV__
              ? this.state.error?.message ?? 'An unexpected error occurred'
              : 'Something went wrong. Please try again.'}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleRetry}
              testID="screen-error-retry"
              accessibilityLabel="Try again"
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
            {this.props.onNavigateHome && (
              <TouchableOpacity
                style={styles.homeButton}
                onPress={this.handleGoHome}
                testID="screen-error-home"
                accessibilityLabel="Go to home"
                accessibilityRole="button"
              >
                <Text style={styles.homeText}>Go Home</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.sandBase,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.espresso,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.espressoLight,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.sunsetCoral,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: borderRadius.button,
  },
  retryText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  homeButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.espressoLight,
  },
  homeText: {
    ...typography.button,
    color: colors.espresso,
  },
});
