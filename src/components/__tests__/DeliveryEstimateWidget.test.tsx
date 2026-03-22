/**
 * @module DeliveryEstimateWidget tests (cm-uyd)
 *
 * Zip input + delivery window display for Product Detail Screen.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { DeliveryEstimateWidget } from '../DeliveryEstimateWidget';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mockUseDeliveryEstimate = jest.fn();
jest.mock('@/hooks/useDeliveryEstimate', () => ({
  useDeliveryEstimate: (zip: string, ids: string[]) => mockUseDeliveryEstimate(zip, ids),
}));

function renderWidget(props: Partial<React.ComponentProps<typeof DeliveryEstimateWidget>> = {}) {
  return render(
    <ThemeProvider>
      <DeliveryEstimateWidget productIds={['prod-1']} {...props} />
    </ThemeProvider>,
  );
}

const IDLE = { estimate: null, isLoading: false, error: null, refresh: jest.fn() };
const LOADING = { estimate: null, isLoading: true, error: null, refresh: jest.fn() };
const SUCCESS_UPS = {
  estimate: { displayText: 'Arrives Mar 27 – Mar 31', isFallback: false, service: 'UPS Ground' },
  isLoading: false,
  error: null,
  refresh: jest.fn(),
};
const SUCCESS_FALLBACK = {
  estimate: { displayText: '2-5 business days', isFallback: true, service: null },
  isLoading: false,
  error: null,
  refresh: jest.fn(),
};
const ERROR_STATE = {
  estimate: null,
  isLoading: false,
  error: 'Invalid zip code',
  refresh: jest.fn(),
};

describe('DeliveryEstimateWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDeliveryEstimate.mockReturnValue(IDLE);
  });

  it('renders zip input field', () => {
    const { getByTestId } = renderWidget();
    expect(getByTestId('delivery-estimate-zip-input')).toBeTruthy();
  });

  it('has correct accessibility label on zip input', () => {
    const { getByTestId } = renderWidget();
    const input = getByTestId('delivery-estimate-zip-input');
    expect(input.props.accessibilityLabel).toContain('zip');
  });

  it('calls useDeliveryEstimate with entered zip and productIds', async () => {
    mockUseDeliveryEstimate.mockReturnValue(IDLE);
    const { getByTestId } = renderWidget({ productIds: ['prod-1', 'prod-2'] });

    fireEvent.changeText(getByTestId('delivery-estimate-zip-input'), '28801');

    await waitFor(() => {
      expect(mockUseDeliveryEstimate).toHaveBeenCalledWith('28801', ['prod-1', 'prod-2']);
    });
  });

  it('shows loading indicator while estimate is loading', () => {
    mockUseDeliveryEstimate.mockReturnValue(LOADING);
    const { getByTestId, queryByTestId } = renderWidget();
    fireEvent.changeText(getByTestId('delivery-estimate-zip-input'), '28801');
    expect(queryByTestId('delivery-estimate-loading')).toBeTruthy();
  });

  it('shows delivery window text on success', async () => {
    mockUseDeliveryEstimate.mockReturnValue(SUCCESS_UPS);
    const { getByTestId, getByText } = renderWidget();
    fireEvent.changeText(getByTestId('delivery-estimate-zip-input'), '28801');
    expect(getByTestId('delivery-estimate-result')).toBeTruthy();
    expect(getByText('Arrives Mar 27 – Mar 31')).toBeTruthy();
  });

  it('shows UPS service name when available', () => {
    mockUseDeliveryEstimate.mockReturnValue(SUCCESS_UPS);
    const { getByTestId, getByText } = renderWidget();
    fireEvent.changeText(getByTestId('delivery-estimate-zip-input'), '28801');
    expect(getByText('UPS Ground')).toBeTruthy();
    expect(getByTestId('delivery-estimate-result')).toBeTruthy();
  });

  it('shows fallback estimate text without service name', () => {
    mockUseDeliveryEstimate.mockReturnValue(SUCCESS_FALLBACK);
    const { getByTestId, getByText, queryByText } = renderWidget();
    fireEvent.changeText(getByTestId('delivery-estimate-zip-input'), '28801');
    expect(getByText('2-5 business days')).toBeTruthy();
    expect(queryByText('UPS Ground')).toBeNull();
    expect(getByTestId('delivery-estimate-result')).toBeTruthy();
  });

  it('shows error message on invalid zip', () => {
    mockUseDeliveryEstimate.mockReturnValue(ERROR_STATE);
    const { getByTestId, getByText } = renderWidget();
    fireEvent.changeText(getByTestId('delivery-estimate-zip-input'), '999');
    expect(getByTestId('delivery-estimate-error')).toBeTruthy();
    expect(getByText('Invalid zip code')).toBeTruthy();
  });

  it('shows nothing when zip is empty', () => {
    mockUseDeliveryEstimate.mockReturnValue(IDLE);
    const { queryByTestId } = renderWidget();
    expect(queryByTestId('delivery-estimate-result')).toBeNull();
    expect(queryByTestId('delivery-estimate-error')).toBeNull();
    expect(queryByTestId('delivery-estimate-loading')).toBeNull();
  });

  it('limits zip input to 5 characters', () => {
    const { getByTestId } = renderWidget();
    const input = getByTestId('delivery-estimate-zip-input');
    expect(input.props.maxLength).toBe(5);
  });

  it('uses numeric keyboard for zip entry', () => {
    const { getByTestId } = renderWidget();
    const input = getByTestId('delivery-estimate-zip-input');
    expect(input.props.keyboardType).toBe('number-pad');
  });
});
