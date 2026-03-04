import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import NetInfo from '@react-native-community/netinfo';

interface ConnectivityContextValue {
  isOnline: boolean;
  setOnline: (online: boolean) => void;
}

const ConnectivityContext = createContext<ConnectivityContextValue | null>(null);

/**
 * ConnectivityProvider
 *
 * Uses @react-native-community/netinfo to detect real connectivity.
 * Accepts initialOnline for testing; when skipNetInfo is true (test env),
 * NetInfo subscription is skipped so manual setOnline works in tests.
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

export function useConnectivity(): ConnectivityContextValue {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) {
    throw new Error('useConnectivity must be used within a ConnectivityProvider');
  }
  return ctx;
}
