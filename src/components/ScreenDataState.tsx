/**
 * @module ScreenDataState
 *
 * Composable wrapper for the skeleton → error → content state machine.
 *
 * Usage:
 *   <ScreenDataState
 *     isLoading={isLoading}
 *     hasData={data.length > 0}
 *     error={error}
 *     onRetry={refresh}
 *     skeleton={<SkeletonMyList />}
 *   >
 *     <MyList />
 *   </ScreenDataState>
 *
 * State machine:
 *   isLoading && !hasData   → skeleton (or null if no skeleton provided)
 *   error && !isLoading     → NetworkErrorState with retry button
 *   otherwise               → children
 *
 * cm-1r1: error recovery UX — consistent skeleton→error→retry across screens
 */
import React from 'react';
import { View } from 'react-native';
import { NetworkErrorState } from './NetworkErrorState';

interface Props {
  isLoading: boolean;
  error: string | null | undefined;
  onRetry: () => void;
  /** When true, renders children even while reloading (avoids skeleton flash on refresh) */
  hasData?: boolean;
  /** Skeleton element to show during initial load */
  skeleton?: React.ReactElement;
  children?: React.ReactNode;
  testID?: string;
}

export function ScreenDataState({
  isLoading,
  error,
  onRetry,
  hasData = false,
  skeleton,
  children,
  testID,
}: Props) {
  // Initial load: show skeleton (or nothing)
  if (isLoading && !hasData) {
    return skeleton ?? null;
  }

  // Data fetch failed: show inline error + retry
  if (error && !isLoading) {
    return <NetworkErrorState message={error} onRetry={onRetry} testID="network-error-state" />;
  }

  // Success or reload: show children
  if (testID) {
    return <View testID={testID}>{children}</View>;
  }

  return <>{children}</>;
}
