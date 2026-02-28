/**
 * Tests for StoreLocatorScreen refactor: verifying it uses useStores hook
 * instead of importing STORES directly.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { StoreLocatorScreen } from '../StoreLocatorScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { STORES } from '@/data/stores';

const mockUseStores = jest.fn();
jest.mock('@/hooks/useStores', () => ({
  useStores: (...args: any[]) => mockUseStores(...args),
}));

function renderScreen(props: Partial<React.ComponentProps<typeof StoreLocatorScreen>> = {}) {
  return render(
    <ThemeProvider>
      <StoreLocatorScreen {...props} />
    </ThemeProvider>,
  );
}

describe('StoreLocatorScreen hook integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStores.mockReturnValue({
      stores: STORES,
      isLoading: false,
      error: null,
      getStoreById: (id: string) => STORES.find((s) => s.id === id),
    });
  });

  it('calls useStores to get store data', () => {
    renderScreen();
    expect(mockUseStores).toHaveBeenCalled();
  });

  it('renders normally when hook returns data', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('store-locator-screen')).toBeTruthy();
    expect(getByTestId('store-list')).toBeTruthy();
  });

  it('shows loading state when stores are loading', () => {
    mockUseStores.mockReturnValue({
      stores: [],
      isLoading: true,
      error: null,
      getStoreById: () => undefined,
    });

    const { getByTestId, getByText } = renderScreen();
    expect(getByTestId('stores-loading')).toBeTruthy();
    expect(getByText(/loading/i)).toBeTruthy();
  });

  it('shows error state when stores fail to load', () => {
    mockUseStores.mockReturnValue({
      stores: [],
      isLoading: false,
      error: new Error('Failed to fetch'),
      getStoreById: () => undefined,
    });

    const { getByTestId, getByText } = renderScreen();
    expect(getByTestId('stores-error')).toBeTruthy();
    expect(getByText(/couldn't load/i)).toBeTruthy();
  });

  it('uses hook data for store count subtitle', () => {
    const { getByText } = renderScreen();
    expect(getByText(`${STORES.length} locations across the Carolinas`)).toBeTruthy();
  });
});
