import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { PromoCodeInput } from '../PromoCodeInput';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#3A2518',
      sandBase: '#E8D5B7',
      sunsetCoral: '#E8845C',
      success: '#4A7C59',
      offWhite: '#FAF7F2',
      sandDark: '#D4BC96',
    },
    spacing: { xs: 4, sm: 8, md: 16 },
    typography: { bodyFamily: 'System' },
    borderRadius: { sm: 4, md: 8 },
  }),
}));

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => null,
}));

describe('PromoCodeInput a11y (cm-pkp)', () => {
  it('promo input has accessibilityHint', () => {
    const { getByText, getByTestId } = render(
      <PromoCodeInput cartTotal={100} onDiscount={jest.fn()} />,
    );
    fireEvent.press(getByText(/add promo code/i));
    const input = getByTestId('promo-input');
    expect(input.props.accessibilityHint).toMatch(/code/i);
  });
});
