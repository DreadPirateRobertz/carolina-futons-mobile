import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ThemeProvider } from '@/theme';
import { StoreDetailScreen } from '../StoreDetailScreen';
import { STORES, type Store } from '@/data/stores';

jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve(true));

// Mock useStoreById so loading/error state tests can control hook output.
// Default: look up by id from real STORES data (preserves existing storeId tests).
const mockUseStoreById = jest.fn(
  (id?: string): { store: Store | null; isLoading: boolean; error: Error | null } => {
    const storeData = jest.requireActual<{ STORES: Store[] }>('@/data/stores').STORES;
    const found = id ? (storeData.find((s) => s.id === id) ?? null) : null;
    return { store: found, isLoading: false, error: null };
  },
);
jest.mock('@/hooks/useStores', () => ({
  ...jest.requireActual('@/hooks/useStores'),
  useStoreById: (...args: unknown[]) => mockUseStoreById(...(args as [string?])),
}));

// Mock isStoreOpen for deterministic status-badge tests (default: open).
const mockIsStoreOpen = jest.fn(() => true);
jest.mock('@/utils', () => ({
  ...jest.requireActual('@/utils'),
  isStoreOpen: (...args: unknown[]) => mockIsStoreOpen(...(args as [])),
}));

const testStore: Store = STORES[0]; // Asheville

const renderDetail = (props?: Partial<React.ComponentProps<typeof StoreDetailScreen>>) =>
  render(
    <ThemeProvider>
      <StoreDetailScreen store={testStore} {...props} />
    </ThemeProvider>,
  );

describe('StoreDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with default testID', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('store-detail-screen')).toBeTruthy();
    });

    it('renders store name', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('store-detail-name').props.children).toContain('Asheville');
    });

    it('renders store photo', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('store-detail-photo')).toBeTruthy();
    });

    it('renders open/closed status', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('store-detail-status')).toBeTruthy();
    });

    it('renders address', () => {
      const { getByTestId } = renderDetail();
      const address = getByTestId('store-detail-address');
      expect(address).toBeTruthy();
    });

    it('renders formatted phone', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('store-detail-phone').props.children).toBe('(828) 555-0100');
    });

    it('renders store hours for each day', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('store-hours-monday')).toBeTruthy();
      expect(getByTestId('store-hours-saturday')).toBeTruthy();
      expect(getByTestId('store-hours-sunday')).toBeTruthy();
    });

    it('renders feature chips', () => {
      const { getByText } = renderDetail();
      expect(getByText('Full showroom')).toBeTruthy();
      expect(getByText('Design consultation')).toBeTruthy();
    });
  });

  describe('store not found', () => {
    it('shows error when store not found by ID', () => {
      const { getByText } = render(
        <ThemeProvider>
          <StoreDetailScreen storeId="nonexistent" />
        </ThemeProvider>,
      );
      expect(getByText('Store not found')).toBeTruthy();
    });
  });

  describe('lookup by storeId', () => {
    it('finds store by storeId from STORES data', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <StoreDetailScreen storeId="store-asheville" />
        </ThemeProvider>,
      );
      expect(getByTestId('store-detail-name').props.children).toContain('Asheville');
    });
  });

  describe('contact actions', () => {
    it('opens directions when Directions button tapped', () => {
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('store-detail-directions'));
      expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('142%20Biltmore%20Ave'));
    });

    it('opens phone dialer when Call button tapped', () => {
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('store-detail-call'));
      expect(Linking.openURL).toHaveBeenCalledWith('tel:8285550100');
    });

    it('opens email when Email button tapped', () => {
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('store-detail-email'));
      expect(Linking.openURL).toHaveBeenCalledWith('mailto:asheville@carolinafutons.com');
    });
  });

  describe('appointment booking', () => {
    it('renders appointment type options', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('appointment-consultation')).toBeTruthy();
      expect(getByTestId('appointment-measurement')).toBeTruthy();
      expect(getByTestId('appointment-pickup')).toBeTruthy();
    });

    it('book button is disabled when no type selected', () => {
      const { getByTestId } = renderDetail();
      const button = getByTestId('book-appointment-button');
      expect(button.props.accessibilityState?.disabled ?? button.props.disabled).toBeTruthy();
    });

    it('selects appointment type on press', () => {
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('appointment-consultation'));
      const option = getByTestId('appointment-consultation');
      expect(option.props.accessibilityState?.selected).toBe(true);
    });

    it('shows confirmation after booking', () => {
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('appointment-consultation'));
      fireEvent.press(getByTestId('book-appointment-button'));
      expect(getByTestId('booking-confirmation')).toBeTruthy();
    });

    it('confirmation mentions the appointment type', () => {
      const { getByTestId, getByText } = renderDetail();
      fireEvent.press(getByTestId('appointment-measurement'));
      fireEvent.press(getByTestId('book-appointment-button'));
      expect(getByText(/room measurement/i)).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('direction button has accessibility label', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('store-detail-directions').props.accessibilityLabel).toBe(
        'Get directions',
      );
    });

    it('call button has accessibility label', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('store-detail-call').props.accessibilityLabel).toContain('Call');
    });

    it('appointment options use radio role', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('appointment-consultation').props.accessibilityRole).toBe('radio');
    });
  });

  // --- cm-ga6: edge cases ---

  describe('edge cases — store data', () => {
    it('does not render hero photo when photos array is empty', () => {
      const storeNoPhotos: Store = { ...testStore, photos: [] };
      const { queryByTestId } = renderDetail({ store: storeNoPhotos });
      expect(queryByTestId('store-detail-photo')).toBeNull();
    });

    it('does not render features section when features array is empty', () => {
      const storeNoFeatures: Store = { ...testStore, features: [] };
      const { queryByText } = renderDetail({ store: storeNoFeatures });
      expect(queryByText('Features')).toBeNull();
    });

    it('shows "Closed" label for a day with closed: true in hours', () => {
      const storeWithClosedDay: Store = {
        ...testStore,
        hours: testStore.hours.map((h) =>
          h.day === 'Sunday'
            ? { ...h, open: '', close: '', closed: true }
            : { ...h, closed: false },
        ),
      };
      const { getByTestId } = renderDetail({ store: storeWithClosedDay });
      const sundayRow = getByTestId('store-hours-sunday');
      expect(within(sundayRow).getByText('Closed')).toBeTruthy();
    });

    it('status badge shows "Closed" when isStoreOpen returns false', () => {
      mockIsStoreOpen.mockReturnValueOnce(false);
      const { getByText } = renderDetail();
      expect(getByText('Closed')).toBeTruthy();
    });

    it('status badge shows "Open" when isStoreOpen returns true', () => {
      mockIsStoreOpen.mockReturnValueOnce(true);
      const { getByText } = renderDetail();
      expect(getByText('Open')).toBeTruthy();
    });
  });

  describe('edge cases — contact action failures', () => {
    it('directions failure is handled silently (no crash)', async () => {
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('Cannot open maps'));
      const { getByTestId } = renderDetail();
      expect(() => fireEvent.press(getByTestId('store-detail-directions'))).not.toThrow();
      // Allow promise rejection to settle
      await waitFor(() => expect(Linking.openURL).toHaveBeenCalled());
    });

    it('phone call failure is handled silently (no crash)', async () => {
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('No dialer available'));
      const { getByTestId } = renderDetail();
      expect(() => fireEvent.press(getByTestId('store-detail-call'))).not.toThrow();
      await waitFor(() => expect(Linking.openURL).toHaveBeenCalled());
    });

    it('email failure is handled silently (no crash)', async () => {
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('No mail app'));
      const { getByTestId } = renderDetail();
      expect(() => fireEvent.press(getByTestId('store-detail-email'))).not.toThrow();
      await waitFor(() => expect(Linking.openURL).toHaveBeenCalled());
    });
  });

  describe('edge cases — hook loading and error states', () => {
    it('renders store-loading testID when useStoreById returns isLoading: true', () => {
      mockUseStoreById.mockReturnValueOnce({ store: null, isLoading: true, error: null });
      const { getByTestId } = render(
        <ThemeProvider>
          <StoreDetailScreen storeId="store-asheville" />
        </ThemeProvider>,
      );
      expect(getByTestId('store-loading')).toBeTruthy();
    });

    it('renders store-error testID when useStoreById returns an error', () => {
      mockUseStoreById.mockReturnValueOnce({
        store: null,
        isLoading: false,
        error: new Error('Network timeout'),
      });
      const { getByTestId } = render(
        <ThemeProvider>
          <StoreDetailScreen storeId="store-asheville" />
        </ThemeProvider>,
      );
      expect(getByTestId('store-error')).toBeTruthy();
    });

    it('store-error renders the error message text', () => {
      mockUseStoreById.mockReturnValueOnce({
        store: null,
        isLoading: false,
        error: new Error('Service unavailable'),
      });
      const { getByText } = render(
        <ThemeProvider>
          <StoreDetailScreen storeId="store-asheville" />
        </ThemeProvider>,
      );
      expect(getByText('Service unavailable')).toBeTruthy();
    });
  });

  describe('edge cases — testID forwarding', () => {
    it('accepts a custom testID on the root container', () => {
      const { getByTestId } = renderDetail({ testID: 'custom-store-screen' });
      expect(getByTestId('custom-store-screen')).toBeTruthy();
    });
  });
});
