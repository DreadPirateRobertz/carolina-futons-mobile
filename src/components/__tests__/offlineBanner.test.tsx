import React from 'react';
import { render, act } from '@testing-library/react-native';
import { OfflineBanner } from '../OfflineBanner';
import { ConnectivityProvider, useConnectivity } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { enqueue, clearQueue, _resetForTesting } from '@/services/offlineQueue';

beforeEach(() => {
  _resetForTesting();
});

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

  it('auto-dismisses when connectivity is restored', async () => {
    const { queryByTestId, setOnline } = renderWithControl(false);
    expect(queryByTestId('offline-banner')).toBeTruthy();

    await act(async () => {
      setOnline(true);
    });

    expect(queryByTestId('offline-banner')).toBeNull();
  });

  it('reappears when connectivity is lost again', async () => {
    const { queryByTestId, setOnline } = renderWithControl(true);
    expect(queryByTestId('offline-banner')).toBeNull();

    await act(async () => {
      setOnline(false);
    });
    expect(queryByTestId('offline-banner')).toBeTruthy();
  });

  describe('queue status display', () => {
    it('shows "browsing cached products" when offline with no queued writes', () => {
      const { getByText } = renderBanner(false);
      expect(getByText(/browsing cached products/i)).toBeTruthy();
    });

    it('shows singular "1 change queued" when offline with one queued write', () => {
      act(() => {
        enqueue('cart', 'ADD_ITEM', { productId: 'p1' });
      });
      const { getByText } = renderBanner(false);
      expect(getByText(/1 change queued/i)).toBeTruthy();
    });

    it('shows plural "N changes queued" when offline with multiple queued writes', () => {
      act(() => {
        enqueue('cart', 'ADD_ITEM', { productId: 'p1' });
        enqueue('wishlist', 'ADD', { productId: 'p2' });
        enqueue('cart', 'ADD_ITEM', { productId: 'p3' });
      });
      const { getByText } = renderBanner(false);
      expect(getByText(/3 changes queued/i)).toBeTruthy();
    });

    it('updates queue count reactively when items are enqueued while offline', () => {
      const { getByText } = renderBanner(false);
      expect(getByText(/browsing cached products/i)).toBeTruthy();

      act(() => {
        enqueue('cart', 'ADD_ITEM', { productId: 'p1' });
      });

      expect(getByText(/1 change queued/i)).toBeTruthy();
    });

    it('updates queue count reactively when queue is cleared', () => {
      act(() => {
        enqueue('cart', 'ADD_ITEM', { productId: 'p1' });
        enqueue('cart', 'ADD_ITEM', { productId: 'p2' });
      });
      const { getByText } = renderBanner(false);
      expect(getByText(/2 changes queued/i)).toBeTruthy();

      act(() => {
        clearQueue();
      });

      expect(getByText(/browsing cached products/i)).toBeTruthy();
    });

    it('accessibility label reflects queued write count when items pending', () => {
      act(() => {
        enqueue('cart', 'ADD_ITEM', { productId: 'p1' });
      });
      const { getByTestId } = renderBanner(false);
      expect(getByTestId('offline-banner').props.accessibilityLabel).toMatch(/1 change queued/i);
    });
  });
});
