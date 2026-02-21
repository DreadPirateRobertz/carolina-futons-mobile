import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { StoreLocatorProvider, useStoreLocator } from '../useStoreLocator';

/** Test harness exposing store locator hook state + actions */
function StoreLocatorHarness() {
  const {
    stores,
    selectedStore,
    viewMode,
    setViewMode,
    selectStore,
    clearSelection,
    sortedByDistance,
    filterByServices,
  } = useStoreLocator();

  return (
    <View>
      <Text testID="store-count">{stores.length}</Text>
      <Text testID="view-mode">{viewMode}</Text>
      <Text testID="selected-store">{selectedStore?.id ?? 'none'}</Text>
      <Text testID="selected-store-name">{selectedStore?.name ?? 'none'}</Text>
      <Text testID="sorted-count">{sortedByDistance.length}</Text>
      <Text testID="stores-json">
        {JSON.stringify(stores.map((s: any) => ({ id: s.id, name: s.name })))}
      </Text>

      <TouchableOpacity testID="view-map" onPress={() => setViewMode('map')} />
      <TouchableOpacity testID="view-list" onPress={() => setViewMode('list')} />
      <TouchableOpacity
        testID="select-first"
        onPress={() => stores.length > 0 && selectStore(stores[0].id)}
      />
      <TouchableOpacity
        testID="select-second"
        onPress={() => stores.length > 1 && selectStore(stores[1].id)}
      />
      <TouchableOpacity testID="clear-selection" onPress={clearSelection} />
      <TouchableOpacity
        testID="filter-appointments"
        onPress={() => filterByServices(['appointments'])}
      />
      <TouchableOpacity testID="filter-clear" onPress={() => filterByServices([])} />
    </View>
  );
}

function renderHarness() {
  return render(
    <StoreLocatorProvider>
      <StoreLocatorHarness />
    </StoreLocatorProvider>,
  );
}

describe('useStoreLocator', () => {
  describe('initial state', () => {
    it('loads stores on mount', () => {
      const { getByTestId } = renderHarness();
      const count = getByTestId('store-count').props.children;
      expect(count).toBeGreaterThan(0);
    });

    it('defaults to list view mode', () => {
      const { getByTestId } = renderHarness();
      expect(getByTestId('view-mode').props.children).toBe('list');
    });

    it('has no store selected initially', () => {
      const { getByTestId } = renderHarness();
      expect(getByTestId('selected-store').props.children).toBe('none');
    });
  });

  describe('view mode', () => {
    it('switches to map view', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('view-map'));
      expect(getByTestId('view-mode').props.children).toBe('map');
    });

    it('switches back to list view', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('view-map'));
      fireEvent.press(getByTestId('view-list'));
      expect(getByTestId('view-mode').props.children).toBe('list');
    });
  });

  describe('store selection', () => {
    it('selects a store by ID', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('select-first'));
      expect(getByTestId('selected-store').props.children).not.toBe('none');
    });

    it('changes selection when different store selected', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('select-first'));
      const first = getByTestId('selected-store-name').props.children;
      fireEvent.press(getByTestId('select-second'));
      const second = getByTestId('selected-store-name').props.children;
      expect(first).not.toBe(second);
    });

    it('clears selection', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('select-first'));
      expect(getByTestId('selected-store').props.children).not.toBe('none');
      fireEvent.press(getByTestId('clear-selection'));
      expect(getByTestId('selected-store').props.children).toBe('none');
    });
  });

  describe('distance sorting', () => {
    it('provides distance-sorted list', () => {
      const { getByTestId } = renderHarness();
      const count = getByTestId('sorted-count').props.children;
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('service filtering', () => {
    it('filters stores by appointment service', () => {
      const { getByTestId } = renderHarness();
      const beforeCount = getByTestId('store-count').props.children;
      fireEvent.press(getByTestId('filter-appointments'));
      const afterCount = getByTestId('store-count').props.children;
      // Filtered count should be <= total count
      expect(afterCount).toBeLessThanOrEqual(beforeCount);
    });

    it('clears filter to show all stores', () => {
      const { getByTestId } = renderHarness();
      const totalCount = getByTestId('store-count').props.children;
      fireEvent.press(getByTestId('filter-appointments'));
      fireEvent.press(getByTestId('filter-clear'));
      expect(getByTestId('store-count').props.children).toBe(totalCount);
    });
  });

  describe('error boundary', () => {
    it('throws when used outside StoreLocatorProvider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<StoreLocatorHarness />)).toThrow(
        'useStoreLocator must be used within a StoreLocatorProvider',
      );
      consoleError.mockRestore();
    });
  });
});
