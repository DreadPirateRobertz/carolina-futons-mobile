/**
 * TDD tests for AddressForm component — cm-v54.
 *
 * Covers:
 * - Field rendering (fullName, line1, line2 optional, city, state, zip)
 * - Required-field validation on submit
 * - Zip code format validation (5 digits)
 * - Pre-filled values when editing
 * - Valid submit calls onSubmit with address data
 * - Cancel calls onCancel
 * - Loading state disables submit button
 * - Accessibility labels on all inputs
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddressForm } from '../AddressForm';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderForm(props: Partial<React.ComponentProps<typeof AddressForm>> = {}) {
  const onSubmit = props.onSubmit ?? jest.fn();
  const onCancel = props.onCancel ?? jest.fn();
  return render(
    <ThemeProvider>
      <AddressForm onSubmit={onSubmit} onCancel={onCancel} {...props} />
    </ThemeProvider>,
  );
}

const VALID_ADDRESS = {
  fullName: 'Jane Smith',
  line1: '789 Pine Rd',
  line2: '',
  city: 'Chapel Hill',
  state: 'NC',
  zip: '27514',
};

describe('AddressForm — field rendering', () => {
  it('renders fullName input', () => {
    const { getByTestId } = renderForm();
    expect(getByTestId('address-full-name-input')).toBeTruthy();
  });

  it('renders line1 input', () => {
    const { getByTestId } = renderForm();
    expect(getByTestId('address-line1-input')).toBeTruthy();
  });

  it('renders line2 input', () => {
    const { getByTestId } = renderForm();
    expect(getByTestId('address-line2-input')).toBeTruthy();
  });

  it('renders city input', () => {
    const { getByTestId } = renderForm();
    expect(getByTestId('address-city-input')).toBeTruthy();
  });

  it('renders state input', () => {
    const { getByTestId } = renderForm();
    expect(getByTestId('address-state-input')).toBeTruthy();
  });

  it('renders zip input', () => {
    const { getByTestId } = renderForm();
    expect(getByTestId('address-zip-input')).toBeTruthy();
  });

  it('renders save button', () => {
    const { getByTestId } = renderForm();
    expect(getByTestId('address-save-button')).toBeTruthy();
  });

  it('renders cancel button', () => {
    const { getByTestId } = renderForm();
    expect(getByTestId('address-cancel-button')).toBeTruthy();
  });
});

describe('AddressForm — pre-filling when editing', () => {
  it('pre-fills fullName from initialValues', () => {
    const { getByTestId } = renderForm({ initialValues: VALID_ADDRESS });
    expect(getByTestId('address-full-name-input').props.value).toBe('Jane Smith');
  });

  it('pre-fills line1 from initialValues', () => {
    const { getByTestId } = renderForm({ initialValues: VALID_ADDRESS });
    expect(getByTestId('address-line1-input').props.value).toBe('789 Pine Rd');
  });

  it('pre-fills city from initialValues', () => {
    const { getByTestId } = renderForm({ initialValues: VALID_ADDRESS });
    expect(getByTestId('address-city-input').props.value).toBe('Chapel Hill');
  });

  it('pre-fills state from initialValues', () => {
    const { getByTestId } = renderForm({ initialValues: VALID_ADDRESS });
    expect(getByTestId('address-state-input').props.value).toBe('NC');
  });

  it('pre-fills zip from initialValues', () => {
    const { getByTestId } = renderForm({ initialValues: VALID_ADDRESS });
    expect(getByTestId('address-zip-input').props.value).toBe('27514');
  });
});

describe('AddressForm — validation', () => {
  it('shows fullName error when submitted empty', async () => {
    const { getByTestId } = renderForm();
    fireEvent.press(getByTestId('address-save-button'));
    await waitFor(() => {
      expect(getByTestId('address-full-name-error')).toBeTruthy();
    });
  });

  it('shows line1 error when submitted empty', async () => {
    const { getByTestId } = renderForm();
    fireEvent.changeText(getByTestId('address-full-name-input'), 'John Doe');
    fireEvent.press(getByTestId('address-save-button'));
    await waitFor(() => {
      expect(getByTestId('address-line1-error')).toBeTruthy();
    });
  });

  it('shows city error when submitted empty', async () => {
    const { getByTestId } = renderForm();
    fireEvent.changeText(getByTestId('address-full-name-input'), 'John Doe');
    fireEvent.changeText(getByTestId('address-line1-input'), '123 Main St');
    fireEvent.press(getByTestId('address-save-button'));
    await waitFor(() => {
      expect(getByTestId('address-city-error')).toBeTruthy();
    });
  });

  it('shows state error when submitted empty', async () => {
    const { getByTestId } = renderForm();
    fireEvent.changeText(getByTestId('address-full-name-input'), 'John Doe');
    fireEvent.changeText(getByTestId('address-line1-input'), '123 Main St');
    fireEvent.changeText(getByTestId('address-city-input'), 'Raleigh');
    fireEvent.press(getByTestId('address-save-button'));
    await waitFor(() => {
      expect(getByTestId('address-state-error')).toBeTruthy();
    });
  });

  it('shows zip error when submitted empty', async () => {
    const { getByTestId } = renderForm();
    fireEvent.changeText(getByTestId('address-full-name-input'), 'John Doe');
    fireEvent.changeText(getByTestId('address-line1-input'), '123 Main St');
    fireEvent.changeText(getByTestId('address-city-input'), 'Raleigh');
    fireEvent.changeText(getByTestId('address-state-input'), 'NC');
    fireEvent.press(getByTestId('address-save-button'));
    await waitFor(() => {
      expect(getByTestId('address-zip-error')).toBeTruthy();
    });
  });

  it('shows zip format error for non-5-digit zip', async () => {
    const { getByTestId } = renderForm();
    fireEvent.changeText(getByTestId('address-full-name-input'), 'John Doe');
    fireEvent.changeText(getByTestId('address-line1-input'), '123 Main St');
    fireEvent.changeText(getByTestId('address-city-input'), 'Raleigh');
    fireEvent.changeText(getByTestId('address-state-input'), 'NC');
    fireEvent.changeText(getByTestId('address-zip-input'), '123');
    fireEvent.press(getByTestId('address-save-button'));
    await waitFor(() => {
      expect(getByTestId('address-zip-error')).toBeTruthy();
    });
  });

  it('does not call onSubmit when validation fails', async () => {
    const onSubmit = jest.fn();
    const { getByTestId } = renderForm({ onSubmit });
    fireEvent.press(getByTestId('address-save-button'));
    await waitFor(() => {
      expect(getByTestId('address-full-name-error')).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('accepts 5-digit zip code', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByTestId, queryByTestId } = renderForm({ onSubmit });
    fireEvent.changeText(getByTestId('address-full-name-input'), 'John Doe');
    fireEvent.changeText(getByTestId('address-line1-input'), '123 Main St');
    fireEvent.changeText(getByTestId('address-city-input'), 'Raleigh');
    fireEvent.changeText(getByTestId('address-state-input'), 'NC');
    fireEvent.changeText(getByTestId('address-zip-input'), '27601');
    fireEvent.press(getByTestId('address-save-button'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(queryByTestId('address-zip-error')).toBeNull();
  });
});

describe('AddressForm — submit', () => {
  it('calls onSubmit with address data when valid', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = renderForm({ onSubmit });
    fireEvent.changeText(getByTestId('address-full-name-input'), VALID_ADDRESS.fullName);
    fireEvent.changeText(getByTestId('address-line1-input'), VALID_ADDRESS.line1);
    fireEvent.changeText(getByTestId('address-line2-input'), VALID_ADDRESS.line2);
    fireEvent.changeText(getByTestId('address-city-input'), VALID_ADDRESS.city);
    fireEvent.changeText(getByTestId('address-state-input'), VALID_ADDRESS.state);
    fireEvent.changeText(getByTestId('address-zip-input'), VALID_ADDRESS.zip);
    fireEvent.press(getByTestId('address-save-button'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        fullName: VALID_ADDRESS.fullName,
        line1: VALID_ADDRESS.line1,
        line2: VALID_ADDRESS.line2,
        city: VALID_ADDRESS.city,
        state: VALID_ADDRESS.state,
        zip: VALID_ADDRESS.zip,
      });
    });
  });

  it('trims whitespace from fields before submit', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = renderForm({ onSubmit });
    fireEvent.changeText(getByTestId('address-full-name-input'), '  Jane Smith  ');
    fireEvent.changeText(getByTestId('address-line1-input'), '  789 Pine Rd  ');
    fireEvent.changeText(getByTestId('address-city-input'), ' Chapel Hill ');
    fireEvent.changeText(getByTestId('address-state-input'), ' NC ');
    fireEvent.changeText(getByTestId('address-zip-input'), ' 27514 ');
    fireEvent.press(getByTestId('address-save-button'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Jane Smith',
          line1: '789 Pine Rd',
          city: 'Chapel Hill',
          state: 'NC',
          zip: '27514',
        }),
      );
    });
  });
});

describe('AddressForm — cancel', () => {
  it('calls onCancel when cancel button pressed', () => {
    const onCancel = jest.fn();
    const { getByTestId } = renderForm({ onCancel });
    fireEvent.press(getByTestId('address-cancel-button'));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('AddressForm — loading state', () => {
  it('shows loading indicator when saving is true', () => {
    const { getByTestId } = renderForm({ saving: true });
    expect(getByTestId('address-save-loading')).toBeTruthy();
  });

  it('disables save button when saving is true', () => {
    const { getByTestId } = renderForm({ saving: true });
    expect(getByTestId('address-save-button').props.accessibilityState?.disabled).toBe(true);
  });
});

describe('AddressForm — accessibility', () => {
  it('fullName input has accessibilityLabel', () => {
    const { getByTestId } = renderForm();
    expect(getByTestId('address-full-name-input').props.accessibilityLabel).toBeTruthy();
  });

  it('line1 input has accessibilityLabel', () => {
    const { getByTestId } = renderForm();
    expect(getByTestId('address-line1-input').props.accessibilityLabel).toBeTruthy();
  });

  it('city input has accessibilityLabel', () => {
    const { getByTestId } = renderForm();
    expect(getByTestId('address-city-input').props.accessibilityLabel).toBeTruthy();
  });

  it('state input has accessibilityLabel', () => {
    const { getByTestId } = renderForm();
    expect(getByTestId('address-state-input').props.accessibilityLabel).toBeTruthy();
  });

  it('zip input has accessibilityLabel', () => {
    const { getByTestId } = renderForm();
    expect(getByTestId('address-zip-input').props.accessibilityLabel).toBeTruthy();
  });

  it('save button has accessibilityRole button', () => {
    const { getByTestId } = renderForm();
    expect(getByTestId('address-save-button').props.accessibilityRole).toBe('button');
  });

  it('cancel button has accessibilityRole button', () => {
    const { getByTestId } = renderForm();
    expect(getByTestId('address-cancel-button').props.accessibilityRole).toBe('button');
  });
});
