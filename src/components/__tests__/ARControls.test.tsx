import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ARControls } from '../ARControls';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

const defaultModel = FUTON_MODELS[0]; // Asheville, $349
const defaultFabric = FABRICS[0]; // Natural Linen, $0
const premiumFabric = FABRICS.find((f) => f.price > 0)!; // Mountain Blue, $29

const defaultProps = {
  models: FUTON_MODELS,
  selectedModel: defaultModel,
  selectedFabric: defaultFabric,
  showDimensions: false,
  onSelectModel: jest.fn(),
  onSelectFabric: jest.fn(),
  onToggleDimensions: jest.fn(),
  onClose: jest.fn(),
};

function renderControls(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  // Reset mocks each render
  if (!overrides.onSelectModel) props.onSelectModel = jest.fn();
  if (!overrides.onSelectFabric) props.onSelectFabric = jest.fn();
  if (!overrides.onToggleDimensions) props.onToggleDimensions = jest.fn();
  if (!overrides.onClose) props.onClose = jest.fn();
  return { ...render(<ARControls {...props} />), props };
}

describe('ARControls', () => {
  describe('Price Display', () => {
    it('shows total price as base + fabric', () => {
      const { getByText } = renderControls();
      // $349 + $0 = $349
      expect(getByText('$349.00')).toBeTruthy();
    });

    it('shows premium price when fabric has surcharge', () => {
      const { getByText } = renderControls({ selectedFabric: premiumFabric });
      // $349 + $29 = $378
      expect(getByText('$378.00')).toBeTruthy();
    });

    it('shows model name and fabric name in subtitle', () => {
      const { getByText } = renderControls();
      expect(getByText(`${defaultModel.name} · ${defaultFabric.name}`)).toBeTruthy();
    });

    it('updates subtitle when different model/fabric selected', () => {
      const blueRidge = FUTON_MODELS[1];
      const charcoal = FABRICS.find((f) => f.id === 'charcoal')!;
      const { getByText } = renderControls({
        selectedModel: blueRidge,
        selectedFabric: charcoal,
      });
      expect(getByText(`${blueRidge.name} · ${charcoal.name}`)).toBeTruthy();
    });
  });

  describe('Model Chips', () => {
    it('renders a chip for each model', () => {
      const { getByTestId } = renderControls();
      for (const model of FUTON_MODELS) {
        expect(getByTestId(`ar-model-${model.id}`)).toBeTruthy();
      }
    });

    it('calls onSelectModel with correct model when chip pressed', () => {
      const { getByTestId, props } = renderControls();
      const blueRidge = FUTON_MODELS[1];
      fireEvent.press(getByTestId(`ar-model-${blueRidge.id}`));
      expect(props.onSelectModel).toHaveBeenCalledWith(blueRidge);
    });

    it('shows each model name and tagline', () => {
      const { getByText } = renderControls();
      for (const model of FUTON_MODELS) {
        expect(getByText(model.name)).toBeTruthy();
        expect(getByText(model.tagline)).toBeTruthy();
      }
    });

    it('marks selected model chip with accessibility state', () => {
      const { getByTestId } = renderControls();
      const selected = getByTestId(`ar-model-${defaultModel.id}`);
      expect(selected.props.accessibilityState).toEqual({ selected: true });

      const notSelected = getByTestId(`ar-model-${FUTON_MODELS[1].id}`);
      expect(notSelected.props.accessibilityState).toEqual({ selected: false });
    });
  });

  describe('Fabric Swatches', () => {
    it('renders a swatch for each fabric on selected model', () => {
      const { getByTestId } = renderControls();
      for (const fabric of defaultModel.fabrics) {
        expect(getByTestId(`ar-fabric-${fabric.id}`)).toBeTruthy();
      }
    });

    it('calls onSelectFabric with correct fabric when swatch pressed', () => {
      const { getByTestId, props } = renderControls();
      const target = FABRICS[2]; // Mountain Blue
      fireEvent.press(getByTestId(`ar-fabric-${target.id}`));
      expect(props.onSelectFabric).toHaveBeenCalledWith(target);
    });

    it('shows selected fabric name under swatch', () => {
      const { getByText } = renderControls();
      // Default selected = Natural Linen, name should appear
      expect(getByText(defaultFabric.name)).toBeTruthy();
    });

    it('free fabric accessibility label has no price', () => {
      const { getByTestId } = renderControls();
      const swatch = getByTestId(`ar-fabric-${defaultFabric.id}`);
      expect(swatch.props.accessibilityLabel).toBe(defaultFabric.name);
    });

    it('premium fabric accessibility label includes price', () => {
      const { getByTestId } = renderControls();
      const swatch = getByTestId(`ar-fabric-${premiumFabric.id}`);
      expect(swatch.props.accessibilityLabel).toContain(premiumFabric.name);
      expect(swatch.props.accessibilityLabel).toContain('+$');
    });

    it('has "Fabric" section label', () => {
      const { getByText } = renderControls();
      expect(getByText('Fabric')).toBeTruthy();
    });
  });

  describe('Dimension Toggle', () => {
    it('calls onToggleDimensions when pressed', () => {
      const { getByTestId, props } = renderControls();
      fireEvent.press(getByTestId('ar-dimension-toggle'));
      expect(props.onToggleDimensions).toHaveBeenCalledTimes(1);
    });

    it('shows "Dims" label', () => {
      const { getByText } = renderControls();
      expect(getByText('Dims')).toBeTruthy();
    });
  });

  describe('Add to Cart Button', () => {
    it('renders with correct total price', () => {
      const { getByText } = renderControls();
      expect(getByText('Add to Cart — $349.00')).toBeTruthy();
    });

    it('shows updated price with premium fabric', () => {
      const { getByText } = renderControls({ selectedFabric: premiumFabric });
      expect(
        getByText(`Add to Cart — $${(defaultModel.basePrice + premiumFabric.price).toFixed(2)}`),
      ).toBeTruthy();
    });

    it('has correct accessibility', () => {
      const { getByTestId } = renderControls();
      const btn = getByTestId('ar-add-to-cart');
      expect(btn.props.accessibilityLabel).toBe('Add to cart');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('calls onAddToCart when pressed', () => {
      const onAddToCart = jest.fn();
      const { getByTestId } = render(
        <ARControls {...defaultProps} onAddToCart={onAddToCart} />,
      );
      fireEvent.press(getByTestId('ar-add-to-cart'));
      expect(onAddToCart).toHaveBeenCalledTimes(1);
    });

    it('does not crash when pressed without onAddToCart', () => {
      const { getByTestId } = renderControls();
      fireEvent.press(getByTestId('ar-add-to-cart'));
    });
  });

  describe('Close Button', () => {
    it('calls onClose when pressed', () => {
      const { getByTestId, props } = renderControls();
      fireEvent.press(getByTestId('ar-close'));
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('shows ✕ symbol', () => {
      const { getByText } = renderControls();
      expect(getByText('✕')).toBeTruthy();
    });
  });

  describe('testID', () => {
    it('applies testID to container', () => {
      renderControls();
      // Default props don't pass testID, but the container should exist
      // Let's test with explicit testID
      const { getByTestId: get2 } = render(
        <ARControls {...defaultProps} testID="custom-controls" />,
      );
      expect(get2('custom-controls')).toBeTruthy();
    });
  });
});
