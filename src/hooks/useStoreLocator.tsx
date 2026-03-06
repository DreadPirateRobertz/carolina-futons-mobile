/**
 * Store locator hook and context provider (stub).
 *
 * Placeholder pending implementation (bead cm-vrb). Will provide geolocation-
 * based store search, distance sorting, and directions integration. Tests are
 * written TDD-style and will fail until this module is fully implemented.
 *
 * @module useStoreLocator
 */

import React, { createContext, useContext } from 'react';

const StoreLocatorContext = createContext<any>(null);

/**
 * Context provider for store locator features.
 *
 * Currently returns an empty value — full implementation pending.
 *
 * @param props.children - Child components that may consume store locator context.
 */
export function StoreLocatorProvider({ children }: { children: React.ReactNode }) {
  return <StoreLocatorContext.Provider value={{}}>{children}</StoreLocatorContext.Provider>;
}

/**
 * Accesses store locator state and actions.
 *
 * Must be called from within a `StoreLocatorProvider`.
 *
 * @returns Store locator context value (currently empty — pending implementation).
 */
export function useStoreLocator() {
  const ctx = useContext(StoreLocatorContext);
  if (!ctx) throw new Error('useStoreLocator must be used within a StoreLocatorProvider');
  return ctx;
}
