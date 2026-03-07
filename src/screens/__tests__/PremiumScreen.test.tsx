import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PremiumScreen } from '../PremiumScreen';

const mockPurchase = jest.fn().mockResolvedValue(false);
const mockRestore = jest.fn().mockResolvedValue(false);

jest.mock('@/hooks/usePremium', () => ({
  usePremium: () => ({
    isPremium: false,
    isLoading: false,
    offerings: [
      {
        identifier: '$rc_monthly',
        product: {
          priceString: '$4.99',
          title: 'CF+ Monthly',
          description: 'Monthly subscription',
        },
        packageType: 'MONTHLY',
      },
      {
        identifier: '$rc_annual',
        product: {
          priceString: '$39.99',
          title: 'CF+ Annual',
          description: 'Annual subscription',
        },
        packageType: 'ANNUAL',
      },
    ],
    error: null,
    purchase: mockPurchase,
    restore: mockRestore,
  }),
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
  beforeEach(() => jest.clearAllMocks());

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
});
