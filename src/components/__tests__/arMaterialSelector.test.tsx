/**
 * Tests for ARMaterialSelector — accessibility labels on icon-only buttons (hq-xxwb)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ARMaterialSelector } from '../ARMaterialSelector';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

const defaultModel = FUTON_MODELS[0]; // Asheville
const defaultFabric = FABRICS[0]; // Natural Linen, $0
const premiumFabric = FABRICS.find((f) => f.price > 0)!;

function renderSelector(
  overrides: Partial<{
    model: typeof defaultModel;
    selectedFabric: typeof defaultFabric;
    onSelectFabric: jest.Mock;
    onClose: jest.Mock;
    testID: string;
  }> = {},
) {
  const props = {
    model: defaultModel,
    selectedFabric: defaultFabric,
    onSelectFabric: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  return { ...render(<ARMaterialSelector {...props} />), props };
}

describe('ARMaterialSelector', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      expect(() => renderSelector()).not.toThrow();
    });

    it('shows "Choose Fabric" title', () => {
      const { getByText } = renderSelector();
      expect(getByText('Choose Fabric')).toBeTruthy();
    });

    it('shows model name in subtitle', () => {
      const { getByText } = renderSelector();
      expect(getByText(new RegExp(defaultModel.name))).toBeTruthy();
    });

    it('renders a swatch for each fabric on the model', () => {
      const { getByTestId } = renderSelector();
      for (const fabric of defaultModel.fabrics) {
        expect(getByTestId(`material-swatch-${fabric.id}`)).toBeTruthy();
      }
    });

    it('shows texture preview strip', () => {
      const { getByTestId } = renderSelector();
      expect(getByTestId('texture-preview-strip')).toBeTruthy();
    });
  });

  describe('Fabric selection', () => {
    it('calls onSelectFabric when a swatch is pressed', () => {
      const onSelectFabric = jest.fn();
      const { getByTestId } = renderSelector({ onSelectFabric });
      const target = defaultModel.fabrics[1];
      fireEvent.press(getByTestId(`material-swatch-${target.id}`));
      expect(onSelectFabric).toHaveBeenCalledWith(target);
    });

    it('marks selected fabric with accessibilityState', () => {
      const { getByTestId } = renderSelector();
      const selected = getByTestId(`material-swatch-${defaultFabric.id}`);
      expect(selected.props.accessibilityState).toEqual({ selected: true });

      const other = defaultModel.fabrics.find((f) => f.id !== defaultFabric.id)!;
      const notSelected = getByTestId(`material-swatch-${other.id}`);
      expect(notSelected.props.accessibilityState).toEqual({ selected: false });
    });
  });

  describe('Close / dismiss', () => {
    it('calls onClose when Done button is pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = renderSelector({ onClose });
      fireEvent.press(getByTestId('material-selector-close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is tapped', () => {
      const onClose = jest.fn();
      const { getByTestId } = renderSelector({ onClose });
      fireEvent.press(getByTestId('material-selector-backdrop'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility — icon-only buttons have descriptive labels (hq-xxwb)', () => {
    it('Done / close button has accessibilityLabel', () => {
      const { getByTestId } = renderSelector();
      const btn = getByTestId('material-selector-close');
      expect(btn.props.accessibilityLabel).toBe('Close fabric selector');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('backdrop dismiss has accessibilityLabel', () => {
      const { getByTestId } = renderSelector();
      const backdrop = getByTestId('material-selector-backdrop');
      expect(backdrop.props.accessibilityLabel).toBe('Close fabric selector');
    });

    it('free fabric swatch has accessibilityLabel without price suffix', () => {
      const freeFabric = defaultModel.fabrics.find((f) => f.price === 0)!;
      const { getByTestId } = renderSelector({ selectedFabric: freeFabric });
      const swatch = getByTestId(`material-swatch-${freeFabric.id}`);
      expect(swatch.props.accessibilityLabel).toContain(freeFabric.name);
      expect(swatch.props.accessibilityLabel).toContain('included');
    });

    it('premium fabric swatch has accessibilityLabel with price suffix', () => {
      const { getByTestId } = renderSelector();
      const swatch = getByTestId(`material-swatch-${premiumFabric.id}`);
      expect(swatch.props.accessibilityLabel).toContain(premiumFabric.name);
      expect(swatch.props.accessibilityLabel).toContain('add $');
    });

    it('all fabric swatches have accessibilityRole button', () => {
      const { getByTestId } = renderSelector();
      for (const fabric of defaultModel.fabrics) {
        const swatch = getByTestId(`material-swatch-${fabric.id}`);
        expect(swatch.props.accessibilityRole).toBe('button');
      }
    });
  });

  describe('testID', () => {
    it('applies testID to overlay container', () => {
      const { getByTestId } = renderSelector({ testID: 'material-selector' });
      expect(getByTestId('material-selector')).toBeTruthy();
    });
  });
});
