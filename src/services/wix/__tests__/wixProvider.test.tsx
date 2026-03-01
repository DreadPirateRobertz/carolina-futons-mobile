import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { WixProvider, useWixClient, useWixProducts, useWixCollections } from '../wixProvider';
import { WixClient } from '../wixClient';
import type { Product } from '@/data/products';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: () => Promise.resolve(data),
    headers: new Headers(),
  });
}

const TEST_PRODUCTS_RESPONSE = {
  products: [
    {
      id: 'wix-001',
      name: 'Test Futon',
      slug: 'test-futon',
      visible: true,
      productType: 'physical',
      description: 'A test product',
      price: {
        currency: 'USD',
        price: 299,
        discountedPrice: 299,
        formatted: { price: '$299', discountedPrice: '$299' },
      },
      media: { items: [], mainMedia: null },
      stock: { inStock: true, quantity: 10 },
      ribbons: [],
      numericId: '1',
      collectionIds: [],
      additionalInfoSections: [],
      productOptions: [],
      customTextFields: [],
      variants: [],
    },
  ],
  totalResults: 1,
};

const TEST_COLLECTIONS_RESPONSE = {
  collections: [
    {
      id: 'col-001',
      name: 'Futons',
      slug: 'futons',
      visible: true,
      numberOfProducts: 8,
    },
  ],
  totalResults: 1,
};

beforeEach(() => {
  mockFetch.mockReset();
});

// ============================================================
// WixProvider + useWixClient
// ============================================================

describe('WixProvider', () => {
  it('provides a WixClient to children via useWixClient', () => {
    let client: WixClient | null = null;

    function Consumer() {
      client = useWixClient();
      return <Text testID="status">connected</Text>;
    }

    render(
      <WixProvider apiKey="key" siteId="site">
        <Consumer />
      </WixProvider>,
    );

    expect(client).toBeInstanceOf(WixClient);
  });

  it('throws when useWixClient is used outside WixProvider', () => {
    function BadConsumer() {
      useWixClient();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow('useWixClient must be used within a WixProvider');
  });

  it('creates client with custom base URL', () => {
    let client: WixClient | null = null;

    function Consumer() {
      client = useWixClient();
      return null;
    }

    render(
      <WixProvider apiKey="key" siteId="site" baseUrl="https://custom.api.com">
        <Consumer />
      </WixProvider>,
    );

    expect(client!.baseUrl).toBe('https://custom.api.com');
  });

  it('memoizes client when props dont change', () => {
    const clients: WixClient[] = [];

    function Consumer() {
      clients.push(useWixClient());
      return <Text>ok</Text>;
    }

    const { rerender } = render(
      <WixProvider apiKey="key" siteId="site">
        <Consumer />
      </WixProvider>,
    );

    rerender(
      <WixProvider apiKey="key" siteId="site">
        <Consumer />
      </WixProvider>,
    );

    expect(clients[0]).toBe(clients[1]);
  });
});

// ============================================================
// useWixProducts hook
// ============================================================

describe('useWixProducts', () => {
  it('fetches products on mount and exposes them', async () => {
    mockFetch.mockReturnValue(mockJsonResponse(TEST_PRODUCTS_RESPONSE));

    let result: { products: Product[]; loading: boolean; error: string | null } | null = null;

    function Consumer() {
      result = useWixProducts();
      return (
        <View>
          <Text testID="loading">{String(result.loading)}</Text>
          <Text testID="count">{result.products.length}</Text>
        </View>
      );
    }

    const { findByText } = render(
      <WixProvider apiKey="key" siteId="site">
        <Consumer />
      </WixProvider>,
    );

    // Should eventually load products
    await findByText('1', { exact: true });
    expect(result!.products[0].name).toBe('Test Futon');
    expect(result!.error).toBeNull();
  });

  it('sets error on API failure', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ message: 'Unauthorized' }, 401));

    let result: { error: string | null } | null = null;

    function Consumer() {
      result = useWixProducts();
      return <Text testID="error">{result.error ?? 'none'}</Text>;
    }

    const { findByText } = render(
      <WixProvider apiKey="key" siteId="site">
        <Consumer />
      </WixProvider>,
    );

    await findByText(/Unauthorized|HTTP 401/);
    expect(result!.error).toBeTruthy();
  });
});

// ============================================================
// useWixCollections hook
// ============================================================

describe('useWixCollections', () => {
  it('fetches collections on mount', async () => {
    mockFetch.mockReturnValue(mockJsonResponse(TEST_COLLECTIONS_RESPONSE));

    let collections: { name: string }[] = [];

    function Consumer() {
      const result = useWixCollections();
      collections = result.collections;
      return <Text testID="count">{result.collections.length}</Text>;
    }

    const { findByText } = render(
      <WixProvider apiKey="key" siteId="site">
        <Consumer />
      </WixProvider>,
    );

    await findByText('1', { exact: true });
    expect(collections[0].name).toBe('Futons');
  });
});
