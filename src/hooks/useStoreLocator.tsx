// TDD: Implementation pending (cm-vrb)
// Placeholder to satisfy imports — tests will fail until implemented
import React, { createContext, useContext } from 'react';

const StoreLocatorContext = createContext<any>(null);

export function StoreLocatorProvider({ children }: { children: React.ReactNode }) {
  return <StoreLocatorContext.Provider value={{}}>{children}</StoreLocatorContext.Provider>;
}

export function useStoreLocator() {
  const ctx = useContext(StoreLocatorContext);
  if (!ctx) throw new Error('useStoreLocator must be used within a StoreLocatorProvider');
  return ctx;
}
