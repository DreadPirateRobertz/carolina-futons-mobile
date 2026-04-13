/**
 * Tests for StoreDetailScreen refactor: verifying it uses useStoreById hook
 * instead of importing STORES directly.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { StoreDetailScreen } from '../StoreDetailScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { STORES } from '@/data/stores';

const mockUseStoreById = jest.fn();
jest.mock('@/hooks/useStores', () => ({
  ...jest.requireActual('@/hooks/useStores'),
  useStoreById: (...args: any[]) => mockUseStoreById(...args),
}));

function renderScreen(props: Partial<React.ComponentProps<typeof StoreDetailScreen>> = {}) {
  return render(
    <ThemeProvider>
      <StoreDetailScreen {...props} />
    </ThemeProvider>,
  );
}

describe('StoreDetailScreen hook integration', () => {
  const ashevilleStore = STORES[0];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStoreById.mockReturnValue({
      store: ashevilleStore,
      isLoading: false,
      error: null,
    });
  });

  it('calls useStoreById with the store id', () => {
    renderScreen({ storeId: 'store-asheville' });
    expect(mockUseStoreById).toHaveBeenCalledWith('store-asheville');
  });

  it('renders normally when hook returns store', () => {
    const { getByTestId } = renderScreen({ storeId: 'store-asheville' });
    expect(getByTestId('store-detail-screen')).toBeTruthy();
    expect(getByTestId('store-detail-name')).toBeTruthy();
  });

  it('shows loading state when store is loading', () => {
    mockUseStoreById.mockReturnValue({
      store: null,
      isLoading: true,
      error: null,
    });

    const { getByTestId, getByText } = renderScreen({ storeId: 'store-asheville' });
    expect(getByTestId('store-loading')).toBeTruthy();
    expect(getByText(/loading/i)).toBeTruthy();
  });

  it('shows error state when store fails to load', () => {
    mockUseStoreById.mockReturnValue({
      store: null,
      isLoading: false,
      error: new Error('Network error'),
    });

    const { getByTestId, getByText } = renderScreen({ storeId: 'store-asheville' });
    expect(getByTestId('store-error')).toBeTruthy();
    expect(getByText(/couldn't load/i)).toBeTruthy();
  });

  it('shows not-found when hook returns null store without error', () => {
    mockUseStoreById.mockReturnValue({
      store: null,
      isLoading: false,
      error: null,
    });

    const { getByText } = renderScreen({ storeId: 'nonexistent' });
    expect(getByText('Store not found')).toBeTruthy();
  });

  it('prefers store prop over hook when provided', () => {
    const { getByTestId } = renderScreen({ store: ashevilleStore });
    expect(getByTestId('store-detail-name').props.children).toBe(ashevilleStore.name);
  });
});
