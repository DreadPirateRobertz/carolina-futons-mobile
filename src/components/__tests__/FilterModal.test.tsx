import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FilterModal } from '../FilterModal';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { ProductFilters } from '@/hooks/useProducts';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

const EMPTY_FILTERS: ProductFilters = { sizes: [], fabrics: [], priceRange: null };
const FABRICS = ['Natural Linen', 'Slate Gray', 'Mountain Blue'];
const PRICE_EXTENT: [number, number] = [12, 1899];

function renderFilterModal(
  overrides: {
    visible?: boolean;
    filters?: ProductFilters;
    availableFabrics?: string[];
    priceExtent?: [number, number];
    onApply?: jest.Mock;
    onClose?: jest.Mock;
  } = {},
) {
  const onApply = overrides.onApply ?? jest.fn();
  const onClose = overrides.onClose ?? jest.fn();
  return {
    ...render(
      <ThemeProvider>
        <FilterModal
          visible={overrides.visible ?? true}
          filters={overrides.filters ?? EMPTY_FILTERS}
          availableFabrics={overrides.availableFabrics ?? FABRICS}
          priceExtent={overrides.priceExtent ?? PRICE_EXTENT}
          onApply={onApply}
          onClose={onClose}
        />
      </ThemeProvider>,
    ),
    onApply,
    onClose,
  };
}

describe('FilterModal', () => {
  it('renders modal with testID', () => {
    const { getByTestId } = renderFilterModal();
    expect(getByTestId('filter-modal')).toBeTruthy();
  });

  it('shows "Filter Products" title', () => {
    const { getByText } = renderFilterModal();
    expect(getByText('Filter Products')).toBeTruthy();
  });

  it('shows size section with all size options', () => {
    const { getByText, getByTestId } = renderFilterModal();
    expect(getByText('Size')).toBeTruthy();
    expect(getByTestId('filter-size-twin')).toBeTruthy();
    expect(getByTestId('filter-size-full')).toBeTruthy();
    expect(getByTestId('filter-size-queen')).toBeTruthy();
  });

  it('shows fabric section with available fabrics', () => {
    const { getByText } = renderFilterModal();
    expect(getByText('Fabric')).toBeTruthy();
    expect(getByText('Natural Linen')).toBeTruthy();
    expect(getByText('Slate Gray')).toBeTruthy();
    expect(getByText('Mountain Blue')).toBeTruthy();
  });

  it('shows price range section', () => {
    const { getByText, getByTestId } = renderFilterModal();
    expect(getByText('Price Range')).toBeTruthy();
    expect(getByTestId('price-range-slider')).toBeTruthy();
  });

  it('toggles size selection on press', () => {
    const onApply = jest.fn();
    const { getByTestId } = renderFilterModal({ onApply });
    fireEvent.press(getByTestId('filter-size-queen'));
    fireEvent.press(getByTestId('filter-apply'));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ sizes: ['queen'] }),
    );
  });

  it('toggles fabric selection on press', () => {
    const onApply = jest.fn();
    const { getByTestId } = renderFilterModal({ onApply });
    fireEvent.press(getByTestId('filter-fabric-slate-gray'));
    fireEvent.press(getByTestId('filter-apply'));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ fabrics: ['Slate Gray'] }),
    );
  });

  it('deselects size on second press', () => {
    const onApply = jest.fn();
    const { getByTestId } = renderFilterModal({ onApply });
    fireEvent.press(getByTestId('filter-size-twin'));
    fireEvent.press(getByTestId('filter-size-twin'));
    fireEvent.press(getByTestId('filter-apply'));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ sizes: [] }),
    );
  });

  it('supports multiple size selections', () => {
    const onApply = jest.fn();
    const { getByTestId } = renderFilterModal({ onApply });
    fireEvent.press(getByTestId('filter-size-twin'));
    fireEvent.press(getByTestId('filter-size-queen'));
    fireEvent.press(getByTestId('filter-apply'));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ sizes: ['twin', 'queen'] }),
    );
  });

  it('clear all resets all filters', () => {
    const onApply = jest.fn();
    const { getByTestId } = renderFilterModal({ onApply });
    fireEvent.press(getByTestId('filter-size-queen'));
    fireEvent.press(getByTestId('filter-fabric-slate-gray'));
    fireEvent.press(getByTestId('filter-clear-all'));
    fireEvent.press(getByTestId('filter-apply'));
    expect(onApply).toHaveBeenCalledWith(EMPTY_FILTERS);
  });

  it('calls onClose when apply is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderFilterModal({ onClose });
    fireEvent.press(getByTestId('filter-apply'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderFilterModal({ onClose });
    fireEvent.press(getByTestId('filter-modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows apply button with accessible role', () => {
    const { getByTestId } = renderFilterModal();
    expect(getByTestId('filter-apply').props.accessibilityRole).toBe('button');
  });

  it('size chips have accessible state', () => {
    const { getByTestId } = renderFilterModal({
      filters: { ...EMPTY_FILTERS, sizes: ['queen'] },
    });
    expect(getByTestId('filter-size-queen').props.accessibilityState).toEqual({ selected: true });
    expect(getByTestId('filter-size-twin').props.accessibilityState).toEqual({ selected: false });
  });

  it('renders nothing when not visible', () => {
    const { queryByTestId } = renderFilterModal({ visible: false });
    expect(queryByTestId('filter-modal')).toBeNull();
  });

  it('preserves existing filters on initial render', () => {
    const existingFilters: ProductFilters = {
      sizes: ['full'],
      fabrics: ['Natural Linen'],
      priceRange: [100, 500],
    };
    const onApply = jest.fn();
    const { getByTestId } = renderFilterModal({
      filters: existingFilters,
      onApply,
    });
    // Apply without changing anything
    fireEvent.press(getByTestId('filter-apply'));
    expect(onApply).toHaveBeenCalledWith(existingFilters);
  });
});
