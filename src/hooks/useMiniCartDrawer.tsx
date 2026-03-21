/**
 * @module useMiniCartDrawer
 *
 * Context + hook for global mini-cart drawer open/close state — cm-2us.
 * Wrap the app root with MiniCartDrawerProvider; consume with useMiniCartDrawer().
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

interface MiniCartDrawerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const MiniCartDrawerContext = createContext<MiniCartDrawerContextValue | null>(null);

export function MiniCartDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <MiniCartDrawerContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </MiniCartDrawerContext.Provider>
  );
}

export function useMiniCartDrawer(): MiniCartDrawerContextValue {
  const ctx = useContext(MiniCartDrawerContext);
  if (!ctx) {
    throw new Error('useMiniCartDrawer must be used within a MiniCartDrawerProvider');
  }
  return ctx;
}
