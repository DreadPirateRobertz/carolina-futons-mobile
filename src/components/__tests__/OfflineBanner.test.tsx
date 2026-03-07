import React from 'react';
import { render, act } from '@testing-library/react-native';
import { OfflineBanner } from '../OfflineBanner';
import { ConnectivityProvider, useConnectivity } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderBanner(online = true, testID?: string) {
  return render(
    <ThemeProvider>
      <ConnectivityProvider initialOnline={online} skipNetInfo>
        <OfflineBanner testID={testID} />
      </ConnectivityProvider>
    </ThemeProvider>,
  );
}

/** Renders the banner with external control over connectivity via context. */
function renderWithControl(initialOnline = false) {
  let setOnlineRef: (v: boolean) => void = () => {};

  function ConnectivityControl() {
    const { setOnline } = useConnectivity();
    setOnlineRef = setOnline;
    return null;
  }

  const result = render(
    <ThemeProvider>
      <ConnectivityProvider initialOnline={initialOnline} skipNetInfo>
        <ConnectivityControl />
        <OfflineBanner />
      </ConnectivityProvider>
    </ThemeProvider>,
  );
  return { ...result, setOnline: setOnlineRef };
}

describe('OfflineBanner', () => {
  it('does not render when online', () => {
    const { queryByTestId } = renderBanner(true);
    expect(queryByTestId('offline-banner')).toBeNull();
  });

  it('renders when offline', () => {
    const { getByTestId } = renderBanner(false);
    expect(getByTestId('offline-banner')).toBeTruthy();
  });

  it('has alert accessibility role', () => {
    const { getByTestId } = renderBanner(false);
    expect(getByTestId('offline-banner').props.accessibilityRole).toBe('alert');
  });

  it('has accessibility label', () => {
    const { getByTestId } = renderBanner(false);
    expect(getByTestId('offline-banner').props.accessibilityLabel).toContain('offline');
  });

  it('shows offline message text', () => {
    const { getByText } = renderBanner(false);
    expect(getByText(/offline/i)).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = renderBanner(false, 'my-banner');
    expect(getByTestId('my-banner')).toBeTruthy();
  });

  it('auto-dismisses when connectivity is restored', () => {
    const { queryByTestId, setOnline } = renderWithControl(false);
    expect(queryByTestId('offline-banner')).toBeTruthy();

    act(() => {
      setOnline(true);
    });

    expect(queryByTestId('offline-banner')).toBeNull();
  });

  it('reappears when connectivity is lost again', () => {
    const { queryByTestId, setOnline } = renderWithControl(true);
    expect(queryByTestId('offline-banner')).toBeNull();

    act(() => {
      setOnline(false);
    });
    expect(queryByTestId('offline-banner')).toBeTruthy();
  });
});
