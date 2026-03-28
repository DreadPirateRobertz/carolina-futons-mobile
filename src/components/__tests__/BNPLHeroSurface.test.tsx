/**
 * BNPLHeroSurface — Tests for the prominent BNPL callout component.
 *
 * Surfaces Affirm/Afterpay messaging prominently on PDP price section
 * and cart total. Tap opens payment calculator (BNPLModal).
 *
 * TDD: Tests written before implementation per PM quality gate.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { BNPLHeroSurface } from '../BNPLHeroSurface';

// --- Test helpers ---

function renderHero(props: Partial<React.ComponentProps<typeof BNPLHeroSurface>> = {}) {
  const defaultProps = {
    price: 899,
    onPress: jest.fn(),
    ...props,
  };
  return {
    ...render(
      <ThemeProvider>
        <BNPLHeroSurface {...defaultProps} />
      </ThemeProvider>,
    ),
    onPress: defaultProps.onPress,
  };
}

// --- Rendering ---

describe('BNPLHeroSurface', () => {
  describe('Rendering — eligible price', () => {
    it('renders the hero surface when price is financing-eligible', () => {
      const { getByTestId } = renderHero({ price: 899 });
      expect(getByTestId('bnpl-hero')).toBeTruthy();
    });

    it('shows monthly payment amount', () => {
      const { getByTestId } = renderHero({ price: 899 });
      const children = getByTestId('bnpl-hero-monthly').props.children;
      // children may be array or string — flatten and check for dollar amount
      const text = Array.isArray(children) ? children.join('') : String(children);
      expect(text).toMatch(/\$\d+/);
    });

    it('shows provider names (Affirm and Klarna)', () => {
      const { getByText } = renderHero({ price: 899 });
      expect(getByText(/Affirm/)).toBeTruthy();
      expect(getByText(/Klarna/)).toBeTruthy();
    });

    it('shows "See payment options" call-to-action', () => {
      const { getByText } = renderHero({ price: 899 });
      expect(getByText(/payment options/i)).toBeTruthy();
    });

    it('renders with pdp variant by default', () => {
      const { getByTestId } = renderHero({ price: 899 });
      expect(getByTestId('bnpl-hero')).toBeTruthy();
    });

    it('renders cart variant when specified', () => {
      const { getByTestId } = renderHero({ price: 899, variant: 'cart' });
      expect(getByTestId('bnpl-hero')).toBeTruthy();
    });
  });

  describe('Rendering — ineligible price', () => {
    it('returns null when price is below financing threshold ($299)', () => {
      const { queryByTestId } = renderHero({ price: 199 });
      expect(queryByTestId('bnpl-hero')).toBeNull();
    });

    it('returns null when price is zero', () => {
      const { queryByTestId } = renderHero({ price: 0 });
      expect(queryByTestId('bnpl-hero')).toBeNull();
    });

    it('returns null when price is negative', () => {
      const { queryByTestId } = renderHero({ price: -100 });
      expect(queryByTestId('bnpl-hero')).toBeNull();
    });

    it('returns null when price is NaN', () => {
      const { queryByTestId } = renderHero({ price: NaN });
      expect(queryByTestId('bnpl-hero')).toBeNull();
    });
  });

  describe('Interaction', () => {
    it('calls onPress when tapped', () => {
      const { getByTestId, onPress } = renderHero({ price: 899 });
      fireEvent.press(getByTestId('bnpl-hero'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not crash when onPress is not provided', () => {
      expect(() => {
        renderHero({ price: 899, onPress: undefined });
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('has button accessibility role', () => {
      const { getByTestId } = renderHero({ price: 899 });
      expect(getByTestId('bnpl-hero').props.accessibilityRole).toBe('button');
    });

    it('has descriptive accessibility label mentioning monthly payment', () => {
      const { getByTestId } = renderHero({ price: 899 });
      const label = getByTestId('bnpl-hero').props.accessibilityLabel;
      expect(label).toMatch(/\$\d+/);
      expect(label).toMatch(/month/i);
    });

    it('has descriptive accessibility label mentioning providers', () => {
      const { getByTestId } = renderHero({ price: 899 });
      const label = getByTestId('bnpl-hero').props.accessibilityLabel;
      expect(label).toMatch(/Affirm|Klarna/i);
    });
  });

  describe('Edge cases', () => {
    it('handles price at exact threshold ($299) — not eligible', () => {
      // Threshold is $299, must be OVER $299 to qualify
      const { queryByTestId } = renderHero({ price: 299 });
      expect(queryByTestId('bnpl-hero')).toBeNull();
    });

    it('handles price just above threshold ($300)', () => {
      const { getByTestId } = renderHero({ price: 300 });
      expect(getByTestId('bnpl-hero')).toBeTruthy();
    });

    it('handles very large price ($99999)', () => {
      const { getByTestId } = renderHero({ price: 99999 });
      expect(getByTestId('bnpl-hero')).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = renderHero({ price: 899, testID: 'custom-bnpl' });
      expect(getByTestId('custom-bnpl')).toBeTruthy();
    });
  });
});
