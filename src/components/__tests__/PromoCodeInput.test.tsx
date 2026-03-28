import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as wixService from '@/services/wix';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#3A2518', sandBase: '#E8D5B7', sunsetCoral: '#E8845C',
      success: '#4A7C59', offWhite: '#FAF7F2', sandDark: '#D4BC96',
    },
    spacing: { xs: 4, sm: 8, md: 16 },
    typography: { bodyFamily: 'System' },
    borderRadius: { sm: 4, md: 8 },
  }),
}));

const mockValidate = jest.fn();
jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => ({ callFunction: mockValidate }),
}));

import { PromoCodeInput } from '../PromoCodeInput';

beforeEach(() => jest.clearAllMocks());

it('is collapsed by default', () => {
  const { getByText, queryByTestId } = render(<PromoCodeInput cartTotal={199} onDiscount={jest.fn()} />);
  expect(getByText(/add promo code/i)).toBeTruthy();
  expect(queryByTestId('promo-input')).toBeNull();
});

it('expands on tap', () => {
  const { getByText, getByTestId } = render(<PromoCodeInput cartTotal={199} onDiscount={jest.fn()} />);
  fireEvent.press(getByText(/add promo code/i));
  expect(getByTestId('promo-input')).toBeTruthy();
});

it('calls onDiscount with discount on success', async () => {
  mockValidate.mockResolvedValue({ valid: true, discount: 20, type: 'fixed' });
  const mockOnDiscount = jest.fn();
  const { getByText, getByTestId } = render(<PromoCodeInput cartTotal={199} onDiscount={mockOnDiscount} />);
  fireEvent.press(getByText(/add promo code/i));
  fireEvent.changeText(getByTestId('promo-input'), 'SAVE20');
  fireEvent.press(getByTestId('promo-apply-btn'));
  await waitFor(() => expect(mockOnDiscount).toHaveBeenCalledWith(20, 'fixed'));
});

it('shows error message on invalid code', async () => {
  mockValidate.mockResolvedValue({ valid: false, discount: 0, type: 'fixed', error: 'Code expired' });
  const { getByText, getByTestId } = render(<PromoCodeInput cartTotal={199} onDiscount={jest.fn()} />);
  fireEvent.press(getByText(/add promo code/i));
  fireEvent.changeText(getByTestId('promo-input'), 'BADCODE');
  fireEvent.press(getByTestId('promo-apply-btn'));
  await waitFor(() => expect(getByText(/Code expired/)).toBeTruthy());
});

it('trims whitespace before submitting', async () => {
  mockValidate.mockResolvedValue({ valid: true, discount: 10, type: 'percent' });
  const { getByText, getByTestId } = render(<PromoCodeInput cartTotal={199} onDiscount={jest.fn()} />);
  fireEvent.press(getByText(/add promo code/i));
  fireEvent.changeText(getByTestId('promo-input'), '  SAVE10  ');
  fireEvent.press(getByTestId('promo-apply-btn'));
  await waitFor(() =>
    expect(mockValidate).toHaveBeenCalledWith(
      '/_functions/validatePromoCode',
      'POST',
      expect.objectContaining({ code: 'SAVE10' }),
    ),
  );
});

it('does not submit empty code', () => {
  const { getByText, getByTestId } = render(<PromoCodeInput cartTotal={199} onDiscount={jest.fn()} />);
  fireEvent.press(getByText(/add promo code/i));
  fireEvent.press(getByTestId('promo-apply-btn'));
  expect(mockValidate).not.toHaveBeenCalled();
});

it('shows network error message when Wix call fails', async () => {
  mockValidate.mockRejectedValue(new Error('network'));
  const { getByText, getByTestId } = render(<PromoCodeInput cartTotal={199} onDiscount={jest.fn()} />);
  fireEvent.press(getByText(/add promo code/i));
  fireEvent.changeText(getByTestId('promo-input'), 'CODE');
  fireEvent.press(getByTestId('promo-apply-btn'));
  await waitFor(() => expect(getByText(/unable to verify/i)).toBeTruthy());
});

it('shows unavailable message when no wix client', async () => {
  // Simulate a null client by having the mock return undefined (optional chaining) so
  // callFunction resolves to undefined — tests the guard branch added in handleApply.
  // We override useOptionalWixClient for this test via module mock reset.
  jest.spyOn(wixService, 'useOptionalWixClient').mockReturnValue(null as any);
  // Force a fresh render so the component picks up the new spy return value
  const { getByText, getByTestId, queryByText } = render(
    <PromoCodeInput cartTotal={199} onDiscount={jest.fn()} />,
  );
  fireEvent.press(getByText(/add promo code/i));
  fireEvent.changeText(getByTestId('promo-input'), 'TEST');
  fireEvent.press(getByTestId('promo-apply-btn'));
  // Error is set synchronously — no async needed
  expect(queryByText(/unavailable/i)).toBeTruthy();
  jest.restoreAllMocks();
});
