import React from 'react';
import { render } from '@testing-library/react-native';

import { CheckoutFormSkeleton } from '../CheckoutFormSkeleton';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { sandDark: '#D4BC96' },
    spacing: { sm: 8, md: 16 },
    borderRadius: { sm: 4 },
  }),
}));

it('renders checkout-form-skeleton testID', () => {
  const { getByTestId } = render(<CheckoutFormSkeleton />);
  expect(getByTestId('checkout-form-skeleton')).toBeTruthy();
});

it('renders without crashing', () => {
  expect(() => render(<CheckoutFormSkeleton />)).not.toThrow();
});
