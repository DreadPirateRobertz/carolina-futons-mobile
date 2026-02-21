import React from 'react';
import { render } from '@testing-library/react-native';
import { OfflineBanner } from '../OfflineBanner';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderBanner(online = true, testID?: string) {
  return render(
    <ThemeProvider>
      <ConnectivityProvider initialOnline={online}>
        <OfflineBanner testID={testID} />
      </ConnectivityProvider>
    </ThemeProvider>,
  );
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
});
