import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PremiumScreen } from '../PremiumScreen';

jest.spyOn(Alert, 'alert');

const mockPurchase = jest.fn().mockResolvedValue('cancelled');
const mockRestore = jest.fn().mockResolvedValue(false);
const mockUsePremium = jest.fn();

const DEFAULT_PREMIUM = {
  isPremium: false,
  isLoading: false,
  offerings: [
    {
      identifier: '$rc_monthly',
      product: { priceString: '$4.99', title: 'CF+ Monthly', description: 'Monthly subscription' },
      packageType: 'MONTHLY',
    },
    {
      identifier: '$rc_annual',
      product: { priceString: '$39.99', title: 'CF+ Annual', description: 'Annual subscription' },
      packageType: 'ANNUAL',
    },
  ],
  error: null,
  purchase: mockPurchase,
  restore: mockRestore,
};

jest.mock('@/hooks/usePremium', () => ({
  PremiumProvider: ({ children }: { children: React.ReactNode }) => children,
  usePremium: () => mockUsePremium(),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sunsetCoral: '#E8845C',
      sunsetCoralDark: '#C96B44',
      mountainBlue: '#5B8FA8',
      mountainBlueLight: '#A8CCD8',
      espresso: '#3A2518',
      espressoLight: '#5C4033',
      sandBase: '#E8D5B7',
      sandLight: '#F2E8D5',
      success: '#4A7C59',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, button: 8 },
    shadows: { card: {}, button: {} },
    typography: { headingFamily: 'System', bodyFamily: 'System', button: {} },
  }),
}));

jest.mock('@/theme/tokens', () => ({
  darkPalette: {
    background: '#1A1210',
    textPrimary: '#F2E8D5',
    textMuted: '#8B7D6B',
    glassBorder: 'rgba(242,232,213,0.1)',
  },
  colors: {
    sunsetCoral: '#E8845C',
    mountainBlue: '#5B8FA8',
    espresso: '#3A2518',
    espressoLight: '#5C4033',
  },
  borderRadius: { sm: 4, md: 8, lg: 12, button: 8 },
  shadows: { button: {} },
  typography: { button: {} },
}));

jest.mock('@/components/MountainSkyline', () => ({
  MountainSkyline: () => null,
}));

jest.mock('@/components/GlassCard', () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => children,
}));

describe('PremiumScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePremium.mockReturnValue({
      ...DEFAULT_PREMIUM,
      purchase: mockPurchase,
      restore: mockRestore,
    });
  });

  it('renders feature list', () => {
    const { getByText } = render(<PremiumScreen onBack={() => {}} />);
    expect(getByText('AR Room Designer')).toBeTruthy();
    expect(getByText('Early Access')).toBeTruthy();
    expect(getByText('Free Shipping')).toBeTruthy();
  });

  it('renders subscription prices', () => {
    const { getByText } = render(<PremiumScreen onBack={() => {}} />);
    expect(getByText('$4.99')).toBeTruthy();
    expect(getByText('$39.99')).toBeTruthy();
  });

  it('calls purchase when monthly plan is selected', () => {
    const { getByTestId } = render(<PremiumScreen onBack={() => {}} />);
    fireEvent.press(getByTestId('purchase-monthly'));
    expect(mockPurchase).toHaveBeenCalled();
  });

  it('calls purchase when annual plan is selected', () => {
    const { getByTestId } = render(<PremiumScreen onBack={() => {}} />);
    fireEvent.press(getByTestId('purchase-annual'));
    expect(mockPurchase).toHaveBeenCalled();
  });

  it('renders restore button and calls restore', () => {
    const { getByTestId } = render(<PremiumScreen onBack={() => {}} />);
    fireEvent.press(getByTestId('restore-purchases'));
    expect(mockRestore).toHaveBeenCalled();
  });

  it('calls onBack when back button is pressed', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(<PremiumScreen onBack={onBack} />);
    fireEvent.press(getByTestId('premium-back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows success alert on successful purchase', async () => {
    mockPurchase.mockResolvedValueOnce('success');
    const { getByTestId } = render(<PremiumScreen onBack={() => {}} />);
    fireEvent.press(getByTestId('purchase-monthly'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Welcome to CF+!',
        'Your premium features are now unlocked.',
      );
    });
  });

  it('shows error alert on purchase failure', async () => {
    mockPurchase.mockResolvedValueOnce('error');
    const { getByTestId } = render(<PremiumScreen onBack={() => {}} />);
    fireEvent.press(getByTestId('purchase-monthly'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Purchase Failed',
        'Something went wrong. Please try again.',
      );
    });
  });

  it('shows no alert on purchase cancellation', async () => {
    mockPurchase.mockResolvedValueOnce('cancelled');
    const { getByTestId } = render(<PremiumScreen onBack={() => {}} />);
    fireEvent.press(getByTestId('purchase-monthly'));

    await waitFor(() => {
      expect(mockPurchase).toHaveBeenCalled();
    });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  // ── Edge cases (cm-2iw) ───────────────────────────────────────────────────

  describe('isPremium=true state', () => {
    it('shows CF+ Active badge when user is already premium', () => {
      mockUsePremium.mockReturnValue({ ...DEFAULT_PREMIUM, isPremium: true });
      const { getByText } = render(<PremiumScreen onBack={() => {}} />);
      expect(getByText('CF+ Active')).toBeTruthy();
    });

    it('shows "You\'re a CF+ member" title when already premium', () => {
      mockUsePremium.mockReturnValue({ ...DEFAULT_PREMIUM, isPremium: true });
      const { getByText } = render(<PremiumScreen onBack={() => {}} />);
      expect(getByText("You're a CF+ member")).toBeTruthy();
    });

    it('does not show purchase buttons when already premium', () => {
      mockUsePremium.mockReturnValue({ ...DEFAULT_PREMIUM, isPremium: true });
      const { queryByTestId } = render(<PremiumScreen onBack={() => {}} />);
      expect(queryByTestId('purchase-monthly')).toBeNull();
      expect(queryByTestId('purchase-annual')).toBeNull();
    });
  });

  describe('hook error state', () => {
    it('shows purchase-error when hook returns an error string', () => {
      mockUsePremium.mockReturnValue({
        ...DEFAULT_PREMIUM,
        error: 'RevenueCat unavailable',
        purchase: mockPurchase,
        restore: mockRestore,
      });
      const { getByTestId } = render(<PremiumScreen onBack={() => {}} />);
      expect(getByTestId('purchase-error')).toBeTruthy();
    });

    it('displays the exact error message text', () => {
      mockUsePremium.mockReturnValue({
        ...DEFAULT_PREMIUM,
        error: 'RevenueCat unavailable',
        purchase: mockPurchase,
        restore: mockRestore,
      });
      const { getByTestId } = render(<PremiumScreen onBack={() => {}} />);
      expect(getByTestId('purchase-error').props.children).toBe('RevenueCat unavailable');
    });
  });

  describe('empty offerings', () => {
    it('hides purchase buttons when offerings list is empty', () => {
      mockUsePremium.mockReturnValue({
        ...DEFAULT_PREMIUM,
        offerings: [],
        purchase: mockPurchase,
        restore: mockRestore,
      });
      const { queryByTestId } = render(<PremiumScreen onBack={() => {}} />);
      expect(queryByTestId('purchase-monthly')).toBeNull();
      expect(queryByTestId('purchase-annual')).toBeNull();
    });
  });

  describe('restore alerts', () => {
    it('shows "Restored!" alert title on successful restore', async () => {
      mockRestore.mockResolvedValueOnce(true);
      const { getByTestId } = render(<PremiumScreen onBack={() => {}} />);
      fireEvent.press(getByTestId('restore-purchases'));
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Restored!',
          'Your CF+ subscription has been restored.',
        );
      });
    });

    it('shows "No Purchases Found" alert title when restore finds nothing', async () => {
      mockRestore.mockResolvedValueOnce(false);
      const { getByTestId } = render(<PremiumScreen onBack={() => {}} />);
      fireEvent.press(getByTestId('restore-purchases'));
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'No Purchases Found',
          'We could not find any previous purchases for this account.',
        );
      });
    });
  });

  describe('buttons disabled during active purchase', () => {
    it('disables both plan buttons while a purchase is in progress', async () => {
      let resolvePurchase!: (v: string) => void;
      mockPurchase.mockReturnValueOnce(
        new Promise((res) => {
          resolvePurchase = res;
        }),
      );
      const { getByTestId } = render(<PremiumScreen onBack={() => {}} />);
      fireEvent.press(getByTestId('purchase-monthly'));
      expect(
        getByTestId('purchase-monthly').props.accessibilityState?.disabled ??
          getByTestId('purchase-monthly').props.disabled,
      ).toBeTruthy();
      expect(
        getByTestId('purchase-annual').props.accessibilityState?.disabled ??
          getByTestId('purchase-annual').props.disabled,
      ).toBeTruthy();
      await act(async () => {
        resolvePurchase('cancelled');
      });
    });
  });

  describe('custom testID', () => {
    it('renders root with custom testID', () => {
      const { getByTestId } = render(<PremiumScreen onBack={() => {}} testID="my-premium" />);
      expect(getByTestId('my-premium')).toBeTruthy();
    });
  });
});
