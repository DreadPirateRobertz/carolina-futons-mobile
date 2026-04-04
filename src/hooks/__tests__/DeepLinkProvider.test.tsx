import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
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

// Capture the onDeepLink callback so tests can invoke it
let capturedOnDeepLink: ((parsed: any, route: any) => void) | undefined;
jest.mock('../useDeepLink', () => ({
  useDeepLink: (options: { onDeepLink?: (parsed: any, route: any) => void }) => {
    capturedOnDeepLink = options?.onDeepLink;
    return { lastUrl: null, lastRoute: null, lastUtm: null };
  },
}));

describe('DeepLinkProvider', () => {
  beforeEach(() => {
    capturedOnDeepLink = undefined;
    jest.clearAllMocks();
  });

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

  describe('handleDeepLink', () => {
    it('passes onDeepLink callback to useDeepLink', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DeepLinkProvider>{children}</DeepLinkProvider>
      );
      renderHook(() => useDeepLinkContext(), { wrapper });
      expect(capturedOnDeepLink).toBeDefined();
    });

    it('fires events.deepLinkOpened with raw url and screen', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { events } = require('@/services/analytics');
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DeepLinkProvider>{children}</DeepLinkProvider>
      );
      renderHook(() => useDeepLinkContext(), { wrapper });

      const parsedLink = { raw: 'cfutons://product/asheville', path: '/product/asheville', params: {} };
      const route = { screen: 'ProductDetail', params: { slug: 'asheville' } };

      act(() => {
        capturedOnDeepLink!(parsedLink, route);
      });

      expect(events.deepLinkOpened).toHaveBeenCalledWith(
        'cfutons://product/asheville',
        'ProductDetail',
      );
    });

    it('fires events.deepLinkOpened for route without params field', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { events } = require('@/services/analytics');
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DeepLinkProvider>{children}</DeepLinkProvider>
      );
      renderHook(() => useDeepLinkContext(), { wrapper });

      const parsedLink = { raw: 'cfutons://home', path: '/home', params: {} };
      const route = { screen: 'Home' };

      act(() => {
        capturedOnDeepLink!(parsedLink, route as any);
      });

      expect(events.deepLinkOpened).toHaveBeenCalledWith('cfutons://home', 'Home');
    });
  });
});
