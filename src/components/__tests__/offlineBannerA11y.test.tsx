/**
 * A11y announcement tests for OfflineBanner — hq-8zif
 *
 * Verifies AccessibilityInfo.announceForAccessibility is called when
 * connectivity transitions so screen reader users get immediate feedback
 * even before VoiceOver focus reaches the banner.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { OfflineBanner } from '../OfflineBanner';
import { ConnectivityProvider, useConnectivity } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { enqueue, _resetForTesting } from '@/services/offlineQueue';

beforeEach(() => {
  _resetForTesting();
  jest.clearAllMocks();
});

let announceSpy: jest.SpyInstance;
beforeEach(() => {
  announceSpy = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(() => {});
});
afterEach(() => {
  announceSpy.mockRestore();
});

function renderWithControl(initialOnline = true) {
  let setOnlineRef: (v: boolean) => void = () => {};

  function Control() {
    const { setOnline } = useConnectivity();
    setOnlineRef = setOnline;
    return null;
  }

  const result = render(
    <ThemeProvider>
      <ConnectivityProvider initialOnline={initialOnline} skipNetInfo>
        <Control />
        <OfflineBanner />
      </ConnectivityProvider>
    </ThemeProvider>,
  );
  return {
    ...result,
    setOnline: (v: boolean) =>
      act(() => {
        setOnlineRef(v);
      }),
  };
}

describe('OfflineBanner — a11y announcements', () => {
  it('announces going offline to screen readers', async () => {
    const { setOnline } = renderWithControl(true);
    await setOnline(false);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      expect.stringMatching(/offline/i),
    );
  });

  it('announces coming back online to screen readers', async () => {
    const { setOnline } = renderWithControl(false);
    await setOnline(true);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      expect.stringMatching(/online/i),
    );
  });

  it('does not announce on initial render when already online', () => {
    renderWithControl(true);
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
  });

  it('includes pending count in offline announcement when items are queued', async () => {
    act(() => {
      enqueue('cart', 'ADD_ITEM', { productId: 'p1' });
      enqueue('cart', 'ADD_ITEM', { productId: 'p2' });
    });
    const { setOnline } = renderWithControl(true);
    await setOnline(false);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      expect.stringContaining('2'),
    );
  });

  it('announces offline with "browsing cached products" when queue is empty', async () => {
    const { setOnline } = renderWithControl(true);
    await setOnline(false);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      expect.stringMatching(/browsing cached products/i),
    );
  });
});
