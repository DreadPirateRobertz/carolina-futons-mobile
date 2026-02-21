import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReviewForm } from '../ReviewForm';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderForm(props: Partial<React.ComponentProps<typeof ReviewForm>> = {}) {
  const onSubmit = props.onSubmit ?? jest.fn();
  return {
    ...render(
      <ThemeProvider>
        <ReviewForm onSubmit={onSubmit} {...props} />
      </ThemeProvider>,
    ),
    onSubmit,
  };
}

describe('ReviewForm', () => {
  describe('rendering', () => {
    it('renders with default testID', () => {
      const { getByTestId } = renderForm();
      expect(getByTestId('review-form')).toBeTruthy();
    });

    it('renders star selector', () => {
      const { getByTestId } = renderForm();
      expect(getByTestId('star-selector')).toBeTruthy();
    });

    it('renders all 5 star buttons', () => {
      const { getByTestId } = renderForm();
      for (let i = 1; i <= 5; i++) {
        expect(getByTestId(`star-button-${i}`)).toBeTruthy();
      }
    });

    it('renders title input', () => {
      const { getByTestId } = renderForm();
      expect(getByTestId('review-title-input')).toBeTruthy();
    });

    it('renders body input', () => {
      const { getByTestId } = renderForm();
      expect(getByTestId('review-body-input')).toBeTruthy();
    });

    it('renders photo add button', () => {
      const { getByTestId } = renderForm();
      expect(getByTestId('add-photo-button')).toBeTruthy();
    });

    it('renders submit button', () => {
      const { getByTestId } = renderForm();
      expect(getByTestId('submit-review-button')).toBeTruthy();
    });
  });

  describe('star selection', () => {
    it('no stars selected initially', () => {
      const { getByTestId } = renderForm();
      expect(getByTestId('selected-rating').props.children).toBe(0);
    });

    it('selects rating when star tapped', () => {
      const { getByTestId } = renderForm();
      fireEvent.press(getByTestId('star-button-4'));
      expect(getByTestId('selected-rating').props.children).toBe(4);
    });

    it('changes rating when different star tapped', () => {
      const { getByTestId } = renderForm();
      fireEvent.press(getByTestId('star-button-4'));
      fireEvent.press(getByTestId('star-button-2'));
      expect(getByTestId('selected-rating').props.children).toBe(2);
    });

    it('star buttons have accessibility labels', () => {
      const { getByTestId } = renderForm();
      expect(getByTestId('star-button-3').props.accessibilityLabel).toBe('3 stars');
      expect(getByTestId('star-button-3').props.accessibilityRole).toBe('button');
    });
  });

  describe('text input', () => {
    it('accepts title text', () => {
      const { getByTestId } = renderForm();
      fireEvent.changeText(getByTestId('review-title-input'), 'Great product');
      expect(getByTestId('review-title-input').props.value).toBe('Great product');
    });

    it('accepts body text', () => {
      const { getByTestId } = renderForm();
      fireEvent.changeText(getByTestId('review-body-input'), 'Very comfortable futon.');
      expect(getByTestId('review-body-input').props.value).toBe('Very comfortable futon.');
    });

    it('title input has placeholder', () => {
      const { getByTestId } = renderForm();
      expect(getByTestId('review-title-input').props.placeholder).toBeTruthy();
    });

    it('body input has placeholder', () => {
      const { getByTestId } = renderForm();
      expect(getByTestId('review-body-input').props.placeholder).toBeTruthy();
    });

    it('body input supports multiline', () => {
      const { getByTestId } = renderForm();
      expect(getByTestId('review-body-input').props.multiline).toBe(true);
    });
  });

  describe('validation', () => {
    it('requires rating before submit', () => {
      const { getByTestId, onSubmit } = renderForm();
      fireEvent.changeText(getByTestId('review-title-input'), 'Title');
      fireEvent.changeText(getByTestId('review-body-input'), 'Body text');
      fireEvent.press(getByTestId('submit-review-button'));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows error when submitting without rating', () => {
      const { getByTestId } = renderForm();
      fireEvent.press(getByTestId('submit-review-button'));
      expect(getByTestId('rating-error')).toBeTruthy();
    });

    it('requires title before submit', () => {
      const { getByTestId, onSubmit } = renderForm();
      fireEvent.press(getByTestId('star-button-5'));
      fireEvent.changeText(getByTestId('review-body-input'), 'Body text');
      fireEvent.press(getByTestId('submit-review-button'));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('requires body before submit', () => {
      const { getByTestId, onSubmit } = renderForm();
      fireEvent.press(getByTestId('star-button-5'));
      fireEvent.changeText(getByTestId('review-title-input'), 'Title');
      fireEvent.press(getByTestId('submit-review-button'));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('calls onSubmit with review data when valid', () => {
      const { getByTestId, onSubmit } = renderForm();
      fireEvent.press(getByTestId('star-button-5'));
      fireEvent.changeText(getByTestId('review-title-input'), 'Great futon');
      fireEvent.changeText(getByTestId('review-body-input'), 'Love this product.');
      fireEvent.press(getByTestId('submit-review-button'));
      expect(onSubmit).toHaveBeenCalledWith({
        rating: 5,
        title: 'Great futon',
        body: 'Love this product.',
        photos: [],
      });
    });

    it('disables submit button when isSubmitting prop is true', () => {
      const { getByTestId } = renderForm({ isSubmitting: true });
      expect(getByTestId('submit-review-button').props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('star selector has group role', () => {
      const { getByTestId } = renderForm();
      expect(getByTestId('star-selector').props.accessibilityRole).toBe('radiogroup');
    });

    it('submit button has accessibility label', () => {
      const { getByTestId } = renderForm();
      expect(getByTestId('submit-review-button').props.accessibilityLabel).toBe('Submit review');
      expect(getByTestId('submit-review-button').props.accessibilityRole).toBe('button');
    });
  });
});
