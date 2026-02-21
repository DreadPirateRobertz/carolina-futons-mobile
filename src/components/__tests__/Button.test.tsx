import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// TDD: Tests written before implementation
// Component will be at: @/components/Button
// import { Button } from '@/components/Button';

// Placeholder until component exists
const Button = (props: any) => {
  throw new Error('Button component not yet implemented');
};

describe('Button', () => {
  describe('rendering', () => {
    it('renders with label text', () => {
      const { getByText } = render(<Button label="Add to Cart" onPress={() => {}} />);
      expect(getByText('Add to Cart')).toBeTruthy();
    });

    it('renders with testID for automation', () => {
      const { getByTestId } = render(
        <Button label="Buy Now" onPress={() => {}} testID="buy-button" />
      );
      expect(getByTestId('buy-button')).toBeTruthy();
    });
  });

  describe('variants', () => {
    it('renders primary variant by default', () => {
      const { getByTestId } = render(
        <Button label="Primary" onPress={() => {}} testID="btn" />
      );
      const button = getByTestId('btn');
      // Primary should have solid background style
      expect(button).toBeTruthy();
    });

    it('renders secondary variant', () => {
      const { getByTestId } = render(
        <Button label="Secondary" variant="secondary" onPress={() => {}} testID="btn" />
      );
      expect(getByTestId('btn')).toBeTruthy();
    });

    it('renders ghost variant', () => {
      const { getByTestId } = render(
        <Button label="Ghost" variant="ghost" onPress={() => {}} testID="btn" />
      );
      expect(getByTestId('btn')).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls onPress when tapped', () => {
      const onPress = jest.fn();
      const { getByText } = render(<Button label="Tap Me" onPress={onPress} />);
      fireEvent.press(getByText('Tap Me'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button label="Disabled" onPress={onPress} disabled />
      );
      fireEvent.press(getByText('Disabled'));
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('shows loading indicator when loading', () => {
      const { getByTestId, queryByText } = render(
        <Button label="Submit" onPress={() => {}} loading testID="btn" />
      );
      expect(getByTestId('btn')).toBeTruthy();
      // Label should be hidden or replaced during loading
      expect(queryByText('Submit')).toBeFalsy();
    });

    it('disables press when loading', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button label="Submit" onPress={onPress} loading testID="btn" />
      );
      fireEvent.press(getByTestId('btn'));
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('sizing', () => {
    it('renders small size', () => {
      const { getByTestId } = render(
        <Button label="Small" size="sm" onPress={() => {}} testID="btn" />
      );
      expect(getByTestId('btn')).toBeTruthy();
    });

    it('renders large size', () => {
      const { getByTestId } = render(
        <Button label="Large" size="lg" onPress={() => {}} testID="btn" />
      );
      expect(getByTestId('btn')).toBeTruthy();
    });

    it('renders full width when fullWidth prop is set', () => {
      const { getByTestId } = render(
        <Button label="Full Width" fullWidth onPress={() => {}} testID="btn" />
      );
      expect(getByTestId('btn')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('has accessible role of button', () => {
      const { getByRole } = render(
        <Button label="Accessible" onPress={() => {}} />
      );
      expect(getByRole('button')).toBeTruthy();
    });

    it('conveys disabled state to accessibility', () => {
      const { getByRole } = render(
        <Button label="Disabled" onPress={() => {}} disabled />
      );
      const button = getByRole('button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });
  });
});
