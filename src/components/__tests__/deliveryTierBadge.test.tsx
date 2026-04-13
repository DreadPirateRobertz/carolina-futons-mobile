/**
 * @module DeliveryTierBadge tests — cm-ej2
 *
 * Covers:
 * - Renders nothing when zip is invalid/empty
 * - Renders "Fastest" tier for NC/SC zip
 * - Renders "Standard" tier for national zip
 * - Renders "Freight" tier for freight-size item
 * - Shows correct day estimate per tier
 * - Accepts optional dimensions prop
 */
import React from 'react';
import { render } from '@testing-library/react-native';

import { DeliveryTierBadge } from '../DeliveryTierBadge';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      success: '#2E7D32',
      mountainBlue: '#5B8FA8',
      sunsetCoral: '#E8845C',
      offWhite: '#FAF7F2',
      espresso: '#3A2518',
    },
    spacing: { xs: 4, sm: 8 },
    typography: { bodyFamily: 'System' },
    borderRadius: { sm: 4 },
  }),
}));

const PARCEL_DIMS = { width: 39, depth: 32, height: 31 };
const FREIGHT_DIMS = { width: 54, depth: 34, height: 33 };

describe('DeliveryTierBadge', () => {
  it('renders nothing for empty zip', () => {
    const { queryByTestId } = render(<DeliveryTierBadge zip="" />);
    expect(queryByTestId('delivery-tier-badge')).toBeNull();
  });

  it('renders nothing for invalid zip', () => {
    const { queryByTestId } = render(<DeliveryTierBadge zip="ABCDE" />);
    expect(queryByTestId('delivery-tier-badge')).toBeNull();
  });

  it('renders "Fastest" for NC zip with small item', () => {
    const { getByTestId, getByText } = render(
      <DeliveryTierBadge zip="28801" dimensions={PARCEL_DIMS} />,
    );
    expect(getByTestId('delivery-tier-badge')).toBeTruthy();
    expect(getByText(/Fastest/i)).toBeTruthy();
    expect(getByText(/2–3 business days/i)).toBeTruthy();
  });

  it('renders "Standard" for national zip', () => {
    const { getByText } = render(<DeliveryTierBadge zip="10001" dimensions={PARCEL_DIMS} />);
    expect(getByText(/Standard/i)).toBeTruthy();
    expect(getByText(/5–7 business days/i)).toBeTruthy();
  });

  it('renders "Standard" for Southeast zip (3–5 days)', () => {
    const { getByText } = render(<DeliveryTierBadge zip="30301" dimensions={PARCEL_DIMS} />);
    expect(getByText(/Standard/i)).toBeTruthy();
    expect(getByText(/3–5 business days/i)).toBeTruthy();
  });

  it('renders "Freight" for freight-size item regardless of zip', () => {
    const { getByText } = render(<DeliveryTierBadge zip="10001" dimensions={FREIGHT_DIMS} />);
    expect(getByText(/Freight/i)).toBeTruthy();
    expect(getByText(/carrier/i)).toBeTruthy();
  });

  it('renders "Freight" for NC zip when item is freight-size', () => {
    const { getByText } = render(<DeliveryTierBadge zip="28801" dimensions={FREIGHT_DIMS} />);
    expect(getByText(/Freight/i)).toBeTruthy();
  });

  it('renders without dimensions (defaults to parcel tier by zip)', () => {
    const { getByText } = render(<DeliveryTierBadge zip="28801" />);
    expect(getByText(/Fastest/i)).toBeTruthy();
  });
});
