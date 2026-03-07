/**
 * Network connectivity hook and context provider.
 *
 * Uses `@react-native-community/netinfo` to detect real-time connectivity
 * changes and exposes an `isOnline` boolean through React context. Components
 * can use this to degrade gracefully (e.g., show cached data, queue mutations).
 *
 * Supports a `skipNetInfo` prop for test environments where the native
 * NetInfo module is unavailable, allowing manual `setOnline` control.
 *
 * @module useConnectivity
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import NetInfo from '@react-native-community/netinfo';

/** Shape of the value exposed by ConnectivityContext to consumers. */
interface ConnectivityContextValue {
  isOnline: boolean;
  setOnline: (online: boolean) => void;
}

const ConnectivityContext = createContext<ConnectivityContextValue | null>(null);

/**
 * Context provider that subscribes to NetInfo connectivity events.
 *
 * @param props.children - Child components that may consume connectivity context.
 * @param props.initialOnline - Starting online state (default: true).
 * @param props.skipNetInfo - When true, skips the native NetInfo subscription so
 *   tests can control connectivity via `setOnline` manually.
 *
 * @example
 * <ConnectivityProvider>
 *   <App />
 * </ConnectivityProvider>
 */
export function ConnectivityProvider({
  children,
  initialOnline = true,
  skipNetInfo = false,
}: {
  children: React.ReactNode;
  initialOnline?: boolean;
  skipNetInfo?: boolean;
}) {
  const [isOnline, setOnline] = useState(initialOnline);

  useEffect(() => {
    if (skipNetInfo) return;

    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? true;
      setOnline(connected);
    });

    return () => unsubscribe();
  }, [skipNetInfo]);

  const value = useMemo<ConnectivityContextValue>(() => ({ isOnline, setOnline }), [isOnline]);

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
}

/**
 * Accesses the current network connectivity state.
 *
 * Must be called from within a `ConnectivityProvider`.
 *
 * @returns Object containing `{ isOnline, setOnline }`
 *
 * @example
 * const { isOnline } = useConnectivity();
 */
export function useConnectivity(): ConnectivityContextValue {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) {
    throw new Error('useConnectivity must be used within a ConnectivityProvider');
  }
  return ctx;
}

/**
 * Like useConnectivity but returns null when outside a ConnectivityProvider.
 * Useful for components that optionally integrate with connectivity.
 */
export function useOptionalConnectivity(): ConnectivityContextValue | null {
  return useContext(ConnectivityContext);
}
