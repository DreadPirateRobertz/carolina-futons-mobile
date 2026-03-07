/**
 * @module withScreenErrorBoundary
 *
 * Higher-Order Component (HOC) that wraps any screen in a ScreenErrorBoundary.
 * If the screen throws during render, the boundary catches it and offers a
 * "Go Home" escape hatch that resets the navigation stack to Tabs.
 */
import React from 'react';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { ScreenErrorBoundary } from '@/components/ScreenErrorBoundary';

/**
 * HOC that wraps a screen component with a ScreenErrorBoundary.
 * Provides "Go Home" navigation that resets to the Tabs screen.
 */
export function withScreenErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  screenName: string,
): React.ComponentType<P> {
  function ScreenWithErrorBoundary(props: P) {
    const navigation = useNavigation();

    const handleNavigateHome = () => {
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Tabs' }] }));
    };

    return (
      <ScreenErrorBoundary screenName={screenName} onNavigateHome={handleNavigateHome}>
        <WrappedComponent {...props} />
      </ScreenErrorBoundary>
    );
  }

  ScreenWithErrorBoundary.displayName = `withScreenErrorBoundary(${screenName})`;
  return ScreenWithErrorBoundary;
}
