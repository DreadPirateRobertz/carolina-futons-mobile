/**
 * Tests for BNPLModal — Klarna + Affirm bottom sheet modal.
 * Bead: cm-qmr
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { BNPLModal } from '../BNPLModal';
import { openBNPLDeeplink } from '@/services/bnplService';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#2C1810',
      espressoLight: '#6B5B4F',
      sandLight: '#F5EDD8',
      white: '#FFFFFF',
      mountainBlue: '#5B8FA8',
      sunsetCoral: '#E8634A',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
    borderRadius: { sm: 4, pill: 20, lg: 16, button: 8 },
    shadows: { modal: {} },
  }),
}));

jest.mock('@/utils', () => ({
  formatPrice: (n: number) => `$${n.toFixed(2)}`,
}));

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn() }));

jest.mock('@/services/bnplService', () => ({
  ...jest.requireActual('@/services/bnplService'),
  openBNPLDeeplink: jest.fn().mockResolvedValue(undefined),
}));

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  price: 800,
};

afterEach(() => jest.clearAllMocks());

describe('BNPLModal — rendering', () => {
  it('renders when visible=true', () => {
    const { getByTestId } = render(<BNPLModal {...baseProps} />);
    expect(getByTestId('bnpl-modal')).toBeTruthy();
  });

  it('does not render content when visible=false', () => {
    const { queryByTestId } = render(<BNPLModal {...baseProps} visible={false} />);
    expect(queryByTestId('bnpl-continue-btn')).toBeNull();
  });

  it('shows "Pay over time" heading', () => {
    const { getByText } = render(<BNPLModal {...baseProps} />);
    expect(getByText('Pay over time')).toBeTruthy();
  });

  it('defaults to Klarna provider', () => {
    const { getByTestId } = render(<BNPLModal {...baseProps} />);
    const klarnaTab = getByTestId('bnpl-tab-klarna');
    expect(klarnaTab).toBeTruthy();
  });

  it('accepts initialProvider=affirm', () => {
    const { getByText } = render(<BNPLModal {...baseProps} initialProvider="affirm" />);
    expect(getByText(/Continue with Affirm/i)).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = render(<BNPLModal {...baseProps} testID="my-bnpl" />);
    expect(getByTestId('my-bnpl')).toBeTruthy();
  });
});

describe('BNPLModal — Klarna installments', () => {
  it('shows 4 installment rows for Klarna', () => {
    const { getByText } = render(<BNPLModal {...baseProps} price={800} />);
    // Klarna: 4 payments at 14-day intervals
    // 0d → "Today", 14d → "In 2 weeks", 28d → "In 4 weeks", 42d → "In 1 month"
    expect(getByText('Today')).toBeTruthy();
    expect(getByText('In 2 weeks')).toBeTruthy();
    expect(getByText('In 4 weeks')).toBeTruthy();
    expect(getByText('In 1 month')).toBeTruthy();
  });

  it('shows Klarna tagline', () => {
    const { getByText } = render(<BNPLModal {...baseProps} />);
    expect(getByText('Pay in 4 interest-free installments')).toBeTruthy();
  });

  it('CTA reads "Continue with Klarna" by default', () => {
    const { getByText } = render(<BNPLModal {...baseProps} />);
    expect(getByText('Continue with Klarna')).toBeTruthy();
  });

  it('installment amounts sum to product price for Klarna', () => {
    const price = 800;
    const { getAllByText } = render(<BNPLModal {...baseProps} price={price} />);
    // Each payment = $200.00 for $800
    const payments = getAllByText('$200.00');
    expect(payments.length).toBeGreaterThanOrEqual(4);
  });
});

describe('BNPLModal — Affirm toggle', () => {
  it('switches to Affirm when Affirm tab is pressed', async () => {
    const { getByTestId, getByText } = render(<BNPLModal {...baseProps} />);
    fireEvent.press(getByTestId('bnpl-tab-affirm'));
    await waitFor(() => {
      expect(getByText('Continue with Affirm')).toBeTruthy();
    });
  });

  it('shows Affirm tagline after switching', async () => {
    const { getByTestId, getByText } = render(<BNPLModal {...baseProps} />);
    fireEvent.press(getByTestId('bnpl-tab-affirm'));
    await waitFor(() => {
      expect(getByText('Buy now, pay over time')).toBeTruthy();
    });
  });

  it('shows monthly interval labels for Affirm (30-day intervals)', async () => {
    const { getByTestId, getByText } = render(<BNPLModal {...baseProps} price={800} />);
    fireEvent.press(getByTestId('bnpl-tab-affirm'));
    await waitFor(() => {
      expect(getByText('Today')).toBeTruthy();
      expect(getByText('In 1 month')).toBeTruthy();
      expect(getByText('In 2 months')).toBeTruthy();
      expect(getByText('In 3 months')).toBeTruthy();
    });
  });

  it('can switch back to Klarna after selecting Affirm', async () => {
    const { getByTestId, getByText } = render(<BNPLModal {...baseProps} />);
    fireEvent.press(getByTestId('bnpl-tab-affirm'));
    fireEvent.press(getByTestId('bnpl-tab-klarna'));
    await waitFor(() => {
      expect(getByText('Continue with Klarna')).toBeTruthy();
    });
  });
});

describe('BNPLModal — deeplink dispatch', () => {
  it('calls openBNPLDeeplink("klarna") when Klarna CTA pressed', async () => {
    const { getByTestId } = render(<BNPLModal {...baseProps} />);
    fireEvent.press(getByTestId('bnpl-continue-btn'));
    await waitFor(() => {
      expect(openBNPLDeeplink).toHaveBeenCalledWith('klarna');
    });
  });

  it('calls openBNPLDeeplink("affirm") when Affirm CTA pressed', async () => {
    const { getByTestId } = render(<BNPLModal {...baseProps} />);
    fireEvent.press(getByTestId('bnpl-tab-affirm'));
    fireEvent.press(getByTestId('bnpl-continue-btn'));
    await waitFor(() => {
      expect(openBNPLDeeplink).toHaveBeenCalledWith('affirm');
    });
  });
});

describe('BNPLModal — deeplink error handling', () => {
  it('shows error message when deeplink fails', async () => {
    (openBNPLDeeplink as jest.Mock).mockRejectedValueOnce(new Error('No app'));
    const { getByTestId, getByText } = render(<BNPLModal {...baseProps} />);
    fireEvent.press(getByTestId('bnpl-continue-btn'));
    await waitFor(() => {
      expect(getByTestId('bnpl-deeplink-error')).toBeTruthy();
      expect(getByText(/Unable to open/i)).toBeTruthy();
    });
  });

  it('clears deeplink error when switching providers', async () => {
    (openBNPLDeeplink as jest.Mock).mockRejectedValueOnce(new Error('No app'));
    const { getByTestId, queryByTestId } = render(<BNPLModal {...baseProps} />);
    fireEvent.press(getByTestId('bnpl-continue-btn'));
    await waitFor(() => {
      expect(getByTestId('bnpl-deeplink-error')).toBeTruthy();
    });
    fireEvent.press(getByTestId('bnpl-tab-affirm'));
    await waitFor(() => {
      expect(queryByTestId('bnpl-deeplink-error')).toBeNull();
    });
  });
});

describe('BNPLModal — dismiss', () => {
  it('calls onClose when close button pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<BNPLModal {...baseProps} onClose={onClose} />);
    fireEvent.press(getByTestId('bnpl-modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<BNPLModal {...baseProps} onClose={onClose} />);
    fireEvent.press(getByTestId('bnpl-modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('BNPLModal — ineligible price', () => {
  it('shows ineligible message when price below Klarna minimum', () => {
    // Klarna minAmount is 35; price of 10 is ineligible
    const { getByText } = render(<BNPLModal {...baseProps} price={10} />);
    expect(getByText(/Not available/i)).toBeTruthy();
  });

  it('CTA button is disabled when price is ineligible', () => {
    const { getByTestId } = render(<BNPLModal {...baseProps} price={10} />);
    const btn = getByTestId('bnpl-continue-btn');
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBeTruthy();
  });
});
