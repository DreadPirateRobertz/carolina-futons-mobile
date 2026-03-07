import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { CollectionsScreen } from '../CollectionsScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mockPremiumValue = {
  isPremium: false,
  isLoading: false,
  offerings: [],
  error: null,
  purchase: jest.fn(),
  restore: jest.fn(),
  refreshStatus: jest.fn(),
};

jest.mock('@/hooks/usePremium', () => ({
  PremiumProvider: ({ children }: any) => children,
  usePremium: () => mockPremiumValue,
}));

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => ({
    queryData: jest.fn().mockResolvedValue({ items: [], totalResults: 0 }),
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

function renderCollectionsScreen() {
  return render(
    <NavigationContainer>
      <ThemeProvider>
        <CollectionsScreen />
      </ThemeProvider>
    </NavigationContainer>,
  );
}

describe('CollectionsScreen', () => {
  it('renders screen with testID', () => {
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collections-screen')).toBeTruthy();
  });

  it('renders Shop the Look header', () => {
    const { getByText } = renderCollectionsScreen();
    expect(getByText('Shop the Look')).toBeTruthy();
  });

  it('renders collection cards', () => {
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collection-card-mountain-lodge-living')).toBeTruthy();
  });

  it('shows early access lock on gated collection for non-premium users', () => {
    mockPremiumValue.isPremium = false;
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('early-access-lock-spring-2026-preview')).toBeTruthy();
    mockPremiumValue.isPremium = false;
  });

  it('hides early access lock for premium users', () => {
    mockPremiumValue.isPremium = true;
    const { queryByTestId } = renderCollectionsScreen();
    expect(queryByTestId('early-access-lock-spring-2026-preview')).toBeNull();
    mockPremiumValue.isPremium = false;
  });
});
