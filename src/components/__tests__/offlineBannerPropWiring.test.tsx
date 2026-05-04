/**
 * Tests for OfflineBanner pendingCount prop wiring — cm-7wx
 *
 * Verifies that when pendingCount is passed as a prop from the AppShell,
 * the banner uses that value rather than reading from the queue service
 * directly. Also verifies the AppShell integration pattern.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { OfflineBanner } from '../OfflineBanner';
import { ConnectivityProvider, useConnectivity } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { _resetForTesting } from '@/services/offlineQueue';

beforeEach(() => {
  _resetForTesting();
});

function renderBannerWithProp(online: boolean, pendingCount: number) {
  return render(
    <ThemeProvider>
      <ConnectivityProvider initialOnline={online} skipNetInfo>
        <OfflineBanner pendingCount={pendingCount} />
      </ConnectivityProvider>
    </ThemeProvider>,
  );
}

function renderWithControl(initialOnline = true, pendingCount = 0) {
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
        <OfflineBanner pendingCount={pendingCount} />
      </ConnectivityProvider>
    </ThemeProvider>,
  );
  return {
    ...result,
    setOnline: (v: boolean) => act(() => { setOnlineRef(v); }),
  };
}

describe('OfflineBanner — pendingCount prop', () => {
  it('shows queue count from prop when offline with 1 pending', () => {
    const { getByText } = renderBannerWithProp(false, 1);
    expect(getByText(/1 change queued/i)).toBeTruthy();
  });

  it('shows plural count from prop when offline with multiple pending', () => {
    const { getByText } = renderBannerWithProp(false, 3);
    expect(getByText(/3 changes queued/i)).toBeTruthy();
  });

  it('shows "browsing cached products" when pendingCount prop is 0', () => {
    const { getByText } = renderBannerWithProp(false, 0);
    expect(getByText(/browsing cached products/i)).toBeTruthy();
  });

  it('reflects pendingCount in accessibilityLabel when prop is provided', () => {
    const { getByTestId } = renderBannerWithProp(false, 2);
    expect(getByTestId('offline-banner').props.accessibilityLabel).toMatch(/2 changes queued/i);
  });

  it('does not render when online even with non-zero pendingCount prop', () => {
    const { queryByTestId } = renderBannerWithProp(true, 5);
    expect(queryByTestId('offline-banner')).toBeNull();
  });

  it('renders banner when offline with pendingCount prop of 0', () => {
    const { getByTestId } = renderBannerWithProp(false, 0);
    expect(getByTestId('offline-banner')).toBeTruthy();
  });
});

describe('OfflineBanner — AppShell integration pattern', () => {
  it('renders offline banner in a connected component tree when offline', async () => {
    const { queryByTestId, setOnline } = renderWithControl(true, 0);
    expect(queryByTestId('offline-banner')).toBeNull();

    await setOnline(false);
    expect(queryByTestId('offline-banner')).toBeTruthy();
  });

  it('hides banner when connectivity is restored in AppShell pattern', async () => {
    const { queryByTestId, setOnline } = renderWithControl(false, 0);
    expect(queryByTestId('offline-banner')).toBeTruthy();

    await setOnline(true);
    expect(queryByTestId('offline-banner')).toBeNull();
  });

  it('shows prop-sourced count in AppShell integration', () => {
    const { getByText } = renderWithControl(false, 4);
    expect(getByText(/4 changes queued/i)).toBeTruthy();
  });
});
