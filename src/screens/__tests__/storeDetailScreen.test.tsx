import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ThemeProvider } from '@/theme';
import { StoreDetailScreen } from '../StoreDetailScreen';
import { STORES, type Store } from '@/data/stores';

jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve(true));

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
});
