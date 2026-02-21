import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StoreCard } from '../StoreCard';
import { ThemeProvider } from '@/theme/ThemeProvider';

const baseStore = {
  id: 'store-asheville',
  name: 'Carolina Futons - Asheville',
  address: '123 Biltmore Ave, Asheville, NC 28801',
  phone: '(828) 555-0123',
  distance: 2.4,
  hours: {
    monday: '10:00 AM - 7:00 PM',
    tuesday: '10:00 AM - 7:00 PM',
    wednesday: '10:00 AM - 7:00 PM',
    thursday: '10:00 AM - 7:00 PM',
    friday: '10:00 AM - 8:00 PM',
    saturday: '10:00 AM - 6:00 PM',
    sunday: '12:00 PM - 5:00 PM',
  },
  services: ['showroom', 'appointments', 'delivery'],
  photos: ['store-front.jpg', 'showroom-1.jpg'],
  coordinates: { latitude: 35.5951, longitude: -82.5515 },
};

function renderStoreCard(
  overrides: Partial<typeof baseStore> = {},
  props: Record<string, any> = {},
) {
  return render(
    <ThemeProvider>
      <StoreCard store={{ ...baseStore, ...overrides }} {...props} />
    </ThemeProvider>,
  );
}

describe('StoreCard', () => {
  describe('rendering', () => {
    it('renders with testID', () => {
      const { getByTestId } = renderStoreCard();
      expect(getByTestId('store-card-store-asheville')).toBeTruthy();
    });

    it('shows store name', () => {
      const { getByText } = renderStoreCard();
      expect(getByText('Carolina Futons - Asheville')).toBeTruthy();
    });

    it('shows store address', () => {
      const { getByText } = renderStoreCard();
      expect(getByText('123 Biltmore Ave, Asheville, NC 28801')).toBeTruthy();
    });

    it('shows phone number', () => {
      const { getByText } = renderStoreCard();
      expect(getByText('(828) 555-0123')).toBeTruthy();
    });

    it('shows distance', () => {
      const { getByTestId } = renderStoreCard();
      expect(getByTestId('store-distance-store-asheville').props.children).toContain('2.4');
    });
  });

  describe('hours display', () => {
    it('renders hours section', () => {
      const { getByTestId } = renderStoreCard();
      expect(getByTestId('store-hours-store-asheville')).toBeTruthy();
    });

    it('shows today open status', () => {
      const { getByTestId } = renderStoreCard();
      expect(getByTestId('store-open-status-store-asheville')).toBeTruthy();
    });
  });

  describe('services', () => {
    it('renders service badges', () => {
      const { getByTestId } = renderStoreCard();
      expect(getByTestId('service-badge-showroom')).toBeTruthy();
      expect(getByTestId('service-badge-appointments')).toBeTruthy();
      expect(getByTestId('service-badge-delivery')).toBeTruthy();
    });

    it('does not render missing services', () => {
      const { queryByTestId } = renderStoreCard({ services: ['showroom'] });
      expect(queryByTestId('service-badge-showroom')).toBeTruthy();
      expect(queryByTestId('service-badge-appointments')).toBeNull();
    });
  });

  describe('interactions', () => {
    it('calls onPress with store when card tapped', () => {
      const onPress = jest.fn();
      const { getByTestId } = renderStoreCard({}, { onPress });
      fireEvent.press(getByTestId('store-card-store-asheville'));
      expect(onPress).toHaveBeenCalledWith(expect.objectContaining({ id: 'store-asheville' }));
    });

    it('calls onGetDirections with store coordinates', () => {
      const onGetDirections = jest.fn();
      const { getByTestId } = renderStoreCard({}, { onGetDirections });
      fireEvent.press(getByTestId('directions-button-store-asheville'));
      expect(onGetDirections).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 35.5951,
          longitude: -82.5515,
        }),
      );
    });

    it('calls onCall with phone number', () => {
      const onCall = jest.fn();
      const { getByTestId } = renderStoreCard({}, { onCall });
      fireEvent.press(getByTestId('call-button-store-asheville'));
      expect(onCall).toHaveBeenCalledWith('(828) 555-0123');
    });

    it('does not crash when callbacks not provided', () => {
      const { getByTestId } = renderStoreCard();
      expect(() => fireEvent.press(getByTestId('store-card-store-asheville'))).not.toThrow();
    });
  });

  describe('appointment booking', () => {
    it('shows book appointment button when service available', () => {
      const { getByTestId } = renderStoreCard({ services: ['showroom', 'appointments'] });
      expect(getByTestId('book-appointment-button-store-asheville')).toBeTruthy();
    });

    it('hides book appointment button when service not available', () => {
      const { queryByTestId } = renderStoreCard({ services: ['showroom'] });
      expect(queryByTestId('book-appointment-button-store-asheville')).toBeNull();
    });

    it('calls onBookAppointment with store ID', () => {
      const onBookAppointment = jest.fn();
      const { getByTestId } = renderStoreCard({}, { onBookAppointment });
      fireEvent.press(getByTestId('book-appointment-button-store-asheville'));
      expect(onBookAppointment).toHaveBeenCalledWith('store-asheville');
    });
  });

  describe('accessibility', () => {
    it('has accessible label with store name and distance', () => {
      const { getByTestId } = renderStoreCard();
      const card = getByTestId('store-card-store-asheville');
      expect(card.props.accessibilityLabel).toContain('Carolina Futons - Asheville');
      expect(card.props.accessibilityLabel).toContain('2.4');
    });

    it('directions button has accessibility label', () => {
      const { getByTestId } = renderStoreCard();
      const btn = getByTestId('directions-button-store-asheville');
      expect(btn.props.accessibilityLabel).toContain('directions');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('call button has accessibility label', () => {
      const { getByTestId } = renderStoreCard();
      const btn = getByTestId('call-button-store-asheville');
      expect(btn.props.accessibilityLabel).toContain('call');
      expect(btn.props.accessibilityRole).toBe('button');
    });
  });
});
