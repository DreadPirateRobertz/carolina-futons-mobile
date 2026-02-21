import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface ConnectivityContextValue {
  isOnline: boolean;
  setOnline: (online: boolean) => void;
}

const ConnectivityContext = createContext<ConnectivityContextValue | null>(null);

/**
 * ConnectivityProvider
 *
 * In production: use @react-native-community/netinfo to detect connectivity.
 * This provider abstracts that so screens can check `isOnline` without
 * importing netinfo directly. Mock-friendly for testing.
 */
export function ConnectivityProvider({
  children,
  initialOnline = true,
}: {
  children: React.ReactNode;
  initialOnline?: boolean;
}) {
  const [isOnline, setOnline] = useState(initialOnline);

  const value = useMemo<ConnectivityContextValue>(
    () => ({ isOnline, setOnline }),
    [isOnline],
  );

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity(): ConnectivityContextValue {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) {
    throw new Error('useConnectivity must be used within a ConnectivityProvider');
  }
  return ctx;
}
