/**
 * CategoryScreen gap tests — covers:
 *   - handleRefresh (lines 88-92)
 *   - getItemLayout callback (lines 109-114)
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { CategoryScreen } from '../CategoryScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';

// No fake timers — avoid leaking into adjacent workers

async function renderCategory(props: Partial<React.ComponentProps<typeof CategoryScreen>> = {}) {
  const result = render(
    <ThemeProvider>
      <WishlistProvider>
        <CompareProvider>
          <CategoryScreen onProductPress={jest.fn()} onBack={jest.fn()} {...props} />
        </CompareProvider>
      </WishlistProvider>
    </ThemeProvider>,
  );
  // Wait for initial data load and async state updates to settle
  await waitFor(() => result.getByTestId('category-product-list'), { timeout: 3000 });
  return result;
}

describe('CategoryScreen — pull-to-refresh handler', () => {
  it('calling onRefresh on the refresh control triggers handleRefresh', async () => {
    const { getByTestId } = await renderCategory({ categoryId: 'futons' });
    const list = getByTestId('category-product-list');
    await act(async () => {
      list.props.refreshControl.props.onRefresh();
    });
    // Wait for the 600ms setTimeout to fire and refreshing to become false
    await waitFor(
      () => {
        expect(
          getByTestId('category-product-list').props.refreshControl.props.refreshing,
        ).toBeFalsy();
      },
      { timeout: 2000 },
    );
  });
});

describe('CategoryScreen — getItemLayout', () => {
  it('FlatList has getItemLayout prop', async () => {
    const { getByTestId } = await renderCategory({ categoryId: 'futons' });
    const list = getByTestId('category-product-list');
    expect(typeof list.props.getItemLayout).toBe('function');
  });

  it('getItemLayout returns correct shape for index 0', async () => {
    const { getByTestId } = await renderCategory({ categoryId: 'futons' });
    const list = getByTestId('category-product-list');
    const result = list.props.getItemLayout(null, 0);
    expect(result).toMatchObject({
      index: 0,
      length: expect.any(Number),
      offset: expect.any(Number),
    });
  });

  it('getItemLayout returns correct shape for index 3', async () => {
    const { getByTestId } = await renderCategory({ categoryId: 'futons' });
    const list = getByTestId('category-product-list');
    const result = list.props.getItemLayout(null, 3);
    expect(result).toMatchObject({ index: 3 });
    expect(result.offset).toBe(result.length * 3);
  });
});
