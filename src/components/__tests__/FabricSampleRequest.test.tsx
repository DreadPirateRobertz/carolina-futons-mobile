/**
 * Tests for the FabricSampleRequest component.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { FabricSampleRequest } from '../FabricSampleRequest';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#3A2518',
      espressoLight: '#6B5B4F',
      white: '#FFFFFF',
      mountainBlue: '#5B8FA8',
      sandBase: '#F2E8D5',
      sandDark: '#D4C5A9',
      sunsetCoral: '#E8845C',
      muted: '#999',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
    borderRadius: { card: 12, button: 8 },
    shadows: { card: {} },
    typography: {
      headingFamily: 'System',
      bodyFamily: 'System',
      bodyFamilySemiBold: 'System',
      bodyFamilyBold: 'System',
    },
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

const mockSubmitFabricSampleRequest = jest.fn().mockResolvedValue(undefined);

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => ({
    submitFabricSampleRequest: mockSubmitFabricSampleRequest,
  }),
}));

jest.mock('@/services/analytics', () => ({
  events: {
    fabricSampleRequest: jest.fn(),
  },
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

const { events } = require('@/services/analytics');
const { captureException } = require('@/services/crashReporting');

const mockFabrics = [
  { id: 'fabric-1', name: 'Natural Linen', color: '#E8D5B7', price: 0 },
  { id: 'fabric-2', name: 'Slate Gray', color: '#708090', price: 0 },
  { id: 'fabric-3', name: 'Mountain Blue', color: '#5B8FA8', price: 20 },
  { id: 'fabric-4', name: 'Sunset Coral', color: '#E8845C', price: 20 },
  { id: 'fabric-5', name: 'Forest Green', color: '#4A7C59', price: 0 },
  { id: 'fabric-6', name: 'Espresso Brown', color: '#3A2518', price: 10 },
];

describe('FabricSampleRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmitFabricSampleRequest.mockResolvedValue(undefined);
  });

  it('renders the "Request Free Swatches" button', () => {
    const { getByTestId } = render(
      <FabricSampleRequest fabrics={mockFabrics} productName="Asheville Futon" />,
    );
    expect(getByTestId('request-swatches-btn')).toBeTruthy();
  });

  it('expands the form when button is pressed', () => {
    const { getByTestId, queryByTestId } = render(
      <FabricSampleRequest fabrics={mockFabrics} productName="Asheville Futon" />,
    );
    expect(queryByTestId('swatch-form')).toBeNull();
    fireEvent.press(getByTestId('request-swatches-btn'));
    expect(getByTestId('swatch-form')).toBeTruthy();
  });

  it('shows fabric selection chips', () => {
    const { getByTestId, getByText } = render(
      <FabricSampleRequest fabrics={mockFabrics} productName="Asheville Futon" />,
    );
    fireEvent.press(getByTestId('request-swatches-btn'));
    expect(getByText('Natural Linen')).toBeTruthy();
    expect(getByText('Slate Gray')).toBeTruthy();
  });

  it('limits fabric selection to 5', () => {
    const { getByTestId, getAllByTestId } = render(
      <FabricSampleRequest fabrics={mockFabrics} productName="Asheville Futon" />,
    );
    fireEvent.press(getByTestId('request-swatches-btn'));

    // Select all 6 fabrics
    for (let i = 0; i < 6; i++) {
      fireEvent.press(getByTestId(`swatch-chip-fabric-${i + 1}`));
    }

    // Only 5 should be selected (6th should be rejected)
    const selectedChips = getAllByTestId(/swatch-chip-fabric-/).filter((chip) => {
      return chip.props.accessibilityState?.selected === true;
    });
    expect(selectedChips.length).toBeLessThanOrEqual(5);
  });

  it('shows name and address fields', () => {
    const { getByTestId } = render(
      <FabricSampleRequest fabrics={mockFabrics} productName="Asheville Futon" />,
    );
    fireEvent.press(getByTestId('request-swatches-btn'));
    expect(getByTestId('swatch-name-input')).toBeTruthy();
    expect(getByTestId('swatch-address-input')).toBeTruthy();
  });

  it('validates required fields before submission', () => {
    jest.spyOn(Alert, 'alert');
    const { getByTestId } = render(
      <FabricSampleRequest fabrics={mockFabrics} productName="Asheville Futon" />,
    );
    fireEvent.press(getByTestId('request-swatches-btn'));
    fireEvent.press(getByTestId('swatch-submit-btn'));
    expect(Alert.alert).toHaveBeenCalledWith('Missing Information', expect.any(String));
    // Should NOT call the API when validation fails
    expect(mockSubmitFabricSampleRequest).not.toHaveBeenCalled();
  });

  it('submits to Wix API and shows confirmation', async () => {
    const { getByTestId, getByText } = render(
      <FabricSampleRequest fabrics={mockFabrics} productName="Asheville Futon" />,
    );
    fireEvent.press(getByTestId('request-swatches-btn'));

    // Fill form
    fireEvent.changeText(getByTestId('swatch-name-input'), 'John Doe');
    fireEvent.changeText(getByTestId('swatch-address-input'), '123 Main St, Asheville, NC');
    fireEvent.press(getByTestId('swatch-chip-fabric-1'));
    fireEvent.press(getByTestId('swatch-submit-btn'));

    await waitFor(() => {
      expect(mockSubmitFabricSampleRequest).toHaveBeenCalledWith({
        customerName: 'John Doe',
        shippingAddress: '123 Main St, Asheville, NC',
        productName: 'Asheville Futon',
        fabricIds: 'fabric-1',
        fabricNames: 'Natural Linen',
      });
    });

    await waitFor(() => {
      expect(getByText(/Swatches are on the way/)).toBeTruthy();
    });
  });

  it('tracks analytics event on successful submission', async () => {
    const { getByTestId } = render(
      <FabricSampleRequest fabrics={mockFabrics} productName="Asheville Futon" />,
    );
    fireEvent.press(getByTestId('request-swatches-btn'));

    fireEvent.changeText(getByTestId('swatch-name-input'), 'Jane Doe');
    fireEvent.changeText(getByTestId('swatch-address-input'), '456 Oak St');
    fireEvent.press(getByTestId('swatch-chip-fabric-2'));
    fireEvent.press(getByTestId('swatch-submit-btn'));

    await waitFor(() => {
      expect(events.fabricSampleRequest).toHaveBeenCalledWith('Asheville Futon', 1, 'fabric-2');
    });
  });

  it('shows error alert and logs on API failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockSubmitFabricSampleRequest.mockRejectedValueOnce(new Error('Network error'));

    const { getByTestId, queryByText } = render(
      <FabricSampleRequest fabrics={mockFabrics} productName="Asheville Futon" />,
    );
    fireEvent.press(getByTestId('request-swatches-btn'));

    fireEvent.changeText(getByTestId('swatch-name-input'), 'John Doe');
    fireEvent.changeText(getByTestId('swatch-address-input'), '123 Main St');
    fireEvent.press(getByTestId('swatch-chip-fabric-1'));
    fireEvent.press(getByTestId('swatch-submit-btn'));

    await waitFor(() => {
      expect(captureException).toHaveBeenCalled();
    });
    expect(alertSpy).toHaveBeenCalledWith(
      'Request Failed',
      expect.stringContaining('could not submit'),
    );
    // Should NOT show confirmation on failure
    expect(queryByText(/Swatches are on the way/)).toBeNull();
    alertSpy.mockRestore();
  });

  it('disables submit button while submitting', async () => {
    // Make the API call hang
    let resolveSubmit: () => void;
    mockSubmitFabricSampleRequest.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    const { getByTestId, getByText } = render(
      <FabricSampleRequest fabrics={mockFabrics} productName="Asheville Futon" />,
    );
    fireEvent.press(getByTestId('request-swatches-btn'));

    fireEvent.changeText(getByTestId('swatch-name-input'), 'John Doe');
    fireEvent.changeText(getByTestId('swatch-address-input'), '123 Main St');
    fireEvent.press(getByTestId('swatch-chip-fabric-1'));
    fireEvent.press(getByTestId('swatch-submit-btn'));

    // Button should show loading state
    await waitFor(() => {
      expect(getByText('Sending...')).toBeTruthy();
    });

    // Resolve the API call
    resolveSubmit!();

    await waitFor(() => {
      expect(getByText(/Swatches are on the way/)).toBeTruthy();
    });
  });

  it('still shows confirmation if analytics throws after successful API call', async () => {
    events.fabricSampleRequest.mockImplementationOnce(() => {
      throw new Error('Analytics exploded');
    });

    const { getByTestId, getByText } = render(
      <FabricSampleRequest fabrics={mockFabrics} productName="Asheville Futon" />,
    );
    fireEvent.press(getByTestId('request-swatches-btn'));

    fireEvent.changeText(getByTestId('swatch-name-input'), 'John Doe');
    fireEvent.changeText(getByTestId('swatch-address-input'), '123 Main St');
    fireEvent.press(getByTestId('swatch-chip-fabric-1'));
    fireEvent.press(getByTestId('swatch-submit-btn'));

    // Should still show confirmation — analytics failure is non-fatal
    await waitFor(() => {
      expect(getByText(/Swatches are on the way/)).toBeTruthy();
    });
    expect(captureException).toHaveBeenCalled();
  });

  it('enforces maxLength on name and address inputs', () => {
    const { getByTestId } = render(
      <FabricSampleRequest fabrics={mockFabrics} productName="Asheville Futon" />,
    );
    fireEvent.press(getByTestId('request-swatches-btn'));

    expect(getByTestId('swatch-name-input').props.maxLength).toBe(100);
    expect(getByTestId('swatch-address-input').props.maxLength).toBe(300);
  });

  it('renders nothing when fabrics array is empty', () => {
    const { toJSON } = render(<FabricSampleRequest fabrics={[]} productName="Asheville Futon" />);
    expect(toJSON()).toBeNull();
  });
});
