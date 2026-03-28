/**
 * @module useMiniCartDrawer.test
 *
 * TDD tests for the useMiniCartDrawer context+hook — cm-2us.
 * Manages open/close state for the global mini-cart drawer.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useMiniCartDrawer, MiniCartDrawerProvider } from '../useMiniCartDrawer';

function wrapper({ children }: { children: React.ReactNode }) {
  return <MiniCartDrawerProvider>{children}</MiniCartDrawerProvider>;
}

describe('useMiniCartDrawer', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useMiniCartDrawer(), { wrapper });
    expect(result.current.isOpen).toBe(false);
  });

  it('open() sets isOpen to true', async () => {
    const { result } = renderHook(() => useMiniCartDrawer(), { wrapper });
    await act(async () => result.current.open());
    expect(result.current.isOpen).toBe(true);
  });

  it('close() sets isOpen to false after open', async () => {
    const { result } = renderHook(() => useMiniCartDrawer(), { wrapper });
    await act(async () => result.current.open());
    await act(async () => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it('toggle() opens when closed', async () => {
    const { result } = renderHook(() => useMiniCartDrawer(), { wrapper });
    await act(async () => result.current.toggle());
    expect(result.current.isOpen).toBe(true);
  });

  it('toggle() closes when open', async () => {
    const { result } = renderHook(() => useMiniCartDrawer(), { wrapper });
    await act(async () => result.current.open());
    await act(async () => result.current.toggle());
    expect(result.current.isOpen).toBe(false);
  });

  it('throws when used outside MiniCartDrawerProvider', () => {
    // Suppress expected error output
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useMiniCartDrawer())).toThrow();
    spy.mockRestore();
  });
});
