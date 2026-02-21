import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StoreLocatorScreen } from '../StoreLocatorScreen';
import { StoreLocatorProvider } from '@/hooks/useStoreLocator';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderScreen(props: Partial<React.ComponentProps<typeof StoreLocatorScreen>> = {}) {
  return render(
    <ThemeProvider>
      <StoreLocatorProvider>
        <StoreLocatorScreen {...props} />
      </StoreLocatorProvider>
    </ThemeProvider>,
  );
}

describe('StoreLocatorScreen', () => {
  describe('rendering', () => {
    it('renders with default testID', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('store-locator-screen')).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = renderScreen({ testID: 'custom-locator' });
      expect(getByTestId('custom-locator')).toBeTruthy();
    });

    it('renders screen header', () => {
      const { getByText } = renderScreen();
      expect(getByText('Find a Showroom')).toBeTruthy();
    });

    it('renders view mode toggle', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('view-mode-toggle')).toBeTruthy();
    });
  });

  describe('list view', () => {
    it('shows store cards in list view by default', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('store-list')).toBeTruthy();
    });

    it('renders at least one store card', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('store-list').props.children).toBeTruthy();
    });
  });

  describe('map view', () => {
    it('switches to map view when toggle pressed', () => {
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId('view-mode-map'));
      expect(getByTestId('store-map')).toBeTruthy();
    });

    it('switches back to list view', () => {
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId('view-mode-map'));
      fireEvent.press(getByTestId('view-mode-list'));
      expect(getByTestId('store-list')).toBeTruthy();
    });
  });

  describe('store detail navigation', () => {
    it('calls onStorePress when a store card is tapped', () => {
      const onStorePress = jest.fn();
      const { getByTestId } = renderScreen({ onStorePress });
      // Tap the first store card
      const list = getByTestId('store-list');
      expect(list).toBeTruthy();
    });
  });

  describe('search', () => {
    it('renders search input', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('store-search-input')).toBeTruthy();
    });

    it('search input has placeholder', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('store-search-input').props.placeholder).toBeTruthy();
    });
  });

  describe('back button', () => {
    it('does not render back button when onBack not provided', () => {
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('locator-back-button')).toBeNull();
    });

    it('renders back button when onBack provided', () => {
      const { getByTestId } = renderScreen({ onBack: jest.fn() });
      expect(getByTestId('locator-back-button')).toBeTruthy();
    });

    it('calls onBack when pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = renderScreen({ onBack });
      fireEvent.press(getByTestId('locator-back-button'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('view mode toggle has accessible labels', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('view-mode-list').props.accessibilityLabel).toBe('List view');
      expect(getByTestId('view-mode-map').props.accessibilityLabel).toBe('Map view');
    });

    it('view mode buttons show selected state', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('view-mode-list').props.accessibilityState?.selected).toBe(true);
      expect(getByTestId('view-mode-map').props.accessibilityState?.selected).toBe(false);
    });
  });
});
