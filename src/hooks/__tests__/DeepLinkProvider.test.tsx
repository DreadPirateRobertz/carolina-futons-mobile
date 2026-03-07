import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { DeepLinkProvider, useDeepLinkContext } from '../DeepLinkProvider';

jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('@/services/analytics', () => ({
  events: {
    deepLinkOpened: jest.fn(),
  },
}));

describe('DeepLinkProvider', () => {
  it('provides default context values', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DeepLinkProvider>{children}</DeepLinkProvider>
    );
    const { result } = renderHook(() => useDeepLinkContext(), { wrapper });

    expect(result.current.lastUrl).toBeNull();
    expect(result.current.lastRoute).toBeNull();
    expect(result.current.lastUtm).toBeNull();
  });

  it('provides context without provider (defaults)', () => {
    const { result } = renderHook(() => useDeepLinkContext());

    expect(result.current.lastUrl).toBeNull();
    expect(result.current.lastRoute).toBeNull();
    expect(result.current.lastUtm).toBeNull();
  });
});
