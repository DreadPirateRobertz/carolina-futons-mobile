import {
  WixClient,
  type WixClientConfig,
  type WixProduct,
  type WixCollection,
  transformWixProduct,
  transformWixCollection,
  WixApiError,
  setCollectionCategoryMap,
  getCollectionCategoryMap,
  resolveCategory,
} from '../wixClient';
import type { ProductCategory } from '@/data/products';

// --- Mock fetch globally ---
const mockFetch = jest.fn();
global.fetch = mockFetch;

const TEST_CONFIG: WixClientConfig = {
  apiKey: 'test-api-key-12345',
  siteId: 'test-site-id-67890',
};

// --- Wix API response fixtures ---

const WIX_PRODUCT_FIXTURE: WixProduct = {
  id: 'wix-prod-001',
  name: 'The Asheville Full Futon',
  slug: 'asheville-full-futon',
  visible: true,
  productType: 'physical',
  description: 'Handcrafted solid hardwood frame with premium innerspring mattress.',
  price: {
    currency: 'USD',
    price: 349,
    discountedPrice: 349,
    formatted: { price: '$349.00', discountedPrice: '$349.00' },
  },
  media: {
    items: [
      {
        image: {
          url: 'https://static.wixstatic.com/media/asheville.jpg',
          width: 800,
          height: 600,
          altText: 'Asheville Futon',
        },
        mediaType: 'IMAGE',
      },
    ],
    mainMedia: {
      image: {
        url: 'https://static.wixstatic.com/media/asheville.jpg',
        width: 800,
        height: 600,
        altText: 'Asheville Futon',
      },
      mediaType: 'IMAGE',
    },
  },
  stock: { inStock: true, quantity: 15 },
  ribbons: [{ text: 'Bestseller' }],
  numericId: '1001',
  collectionIds: ['collection-futons'],
  additionalInfoSections: [],
  productOptions: [
    {
      name: 'Fabric',
      choices: [
        { value: 'Natural Linen', description: '' },
        { value: 'Slate Gray', description: '' },
      ],
    },
  ],
  customTextFields: [],
  weight: 85,
  variants: [],
};

const WIX_SALE_PRODUCT_FIXTURE: WixProduct = {
  ...WIX_PRODUCT_FIXTURE,
  id: 'wix-prod-002',
  name: 'The Biltmore Loveseat',
  slug: 'biltmore-loveseat',
  price: {
    currency: 'USD',
    price: 379,
    discountedPrice: 319,
    formatted: { price: '$379.00', discountedPrice: '$319.00' },
  },
  ribbons: [{ text: 'Sale' }],
  stock: { inStock: true, quantity: 5 },
};

const WIX_COLLECTION_FIXTURE: WixCollection = {
  id: 'collection-futons',
  name: 'Futons',
  slug: 'futons',
  visible: true,
  numberOfProducts: 8,
  media: {
    mainMedia: {
      image: {
        url: 'https://static.wixstatic.com/media/futons-hero.jpg',
        width: 1200,
        height: 800,
        altText: 'Futons Collection',
      },
      mediaType: 'IMAGE',
    },
  },
};

// --- Helper: build mock response ---
function mockJsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    headers: new Headers(),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ============================================================
// WixClient Construction
// ============================================================

describe('WixClient', () => {
  describe('construction', () => {
    it('creates a client with required config', () => {
      const client = new WixClient(TEST_CONFIG);
      expect(client).toBeDefined();
    });

    it('uses default base URL when not specified', () => {
      const client = new WixClient(TEST_CONFIG);
      expect(client.baseUrl).toBe('https://www.wixapis.com');
    });

    it('accepts custom base URL', () => {
      const client = new WixClient({ ...TEST_CONFIG, baseUrl: 'https://custom.api.com' });
      expect(client.baseUrl).toBe('https://custom.api.com');
    });
  });

  // ============================================================
  // queryProducts
  // ============================================================

  describe('queryProducts', () => {
    it('fetches products with correct endpoint and headers', async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({
          products: [WIX_PRODUCT_FIXTURE],
          totalResults: 1,
        }),
      );

      const client = new WixClient(TEST_CONFIG);
      await client.queryProducts();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.wixapis.com/stores-reader/v1/products/query',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'test-api-key-12345',
            'wix-site-id': 'test-site-id-67890',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('returns transformed products', async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({
          products: [WIX_PRODUCT_FIXTURE],
          totalResults: 1,
        }),
      );

      const client = new WixClient(TEST_CONFIG);
      const result = await client.queryProducts();

      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('The Asheville Full Futon');
      expect(result.products[0].price).toBe(349);
      expect(result.totalResults).toBe(1);
    });

    it('passes pagination parameters', async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ products: [], totalResults: 0 }));

      const client = new WixClient(TEST_CONFIG);
      await client.queryProducts({ limit: 25, offset: 50 });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query.paging.limit).toBe(25);
      expect(body.query.paging.offset).toBe(50);
    });

    it('passes sort parameters', async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ products: [], totalResults: 0 }));

      const client = new WixClient(TEST_CONFIG);
      await client.queryProducts({ sort: 'price-asc' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query.sort).toEqual([{ fieldName: 'price', order: 'ASC' }]);
    });

    it('passes category filter via collectionIds', async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ products: [], totalResults: 0 }));

      const client = new WixClient(TEST_CONFIG);
      await client.queryProducts({ collectionId: 'collection-futons' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query.filter).toEqual(
        expect.objectContaining({
          collectionIds: { $hasSome: ['collection-futons'] },
        }),
      );
    });

    it('passes search query filter', async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ products: [], totalResults: 0 }));

      const client = new WixClient(TEST_CONFIG);
      await client.queryProducts({ search: 'asheville' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query.filter).toEqual(
        expect.objectContaining({
          name: { $contains: 'asheville' },
        }),
      );
    });

    it('clamps limit to 100 max', async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ products: [], totalResults: 0 }));

      const client = new WixClient(TEST_CONFIG);
      await client.queryProducts({ limit: 500 });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query.paging.limit).toBe(100);
    });

    it('throws WixApiError on non-200 response', async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ message: 'Unauthorized' }, 401));

      const client = new WixClient(TEST_CONFIG);
      await expect(client.queryProducts()).rejects.toThrow(WixApiError);
    });

    it('throws WixApiError on network failure', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const client = new WixClient(TEST_CONFIG);
      await expect(client.queryProducts()).rejects.toThrow(WixApiError);
    });
  });

  // ============================================================
  // getProduct
  // ============================================================

  describe('getProduct', () => {
    it('fetches single product by ID', async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ product: WIX_PRODUCT_FIXTURE }));

      const client = new WixClient(TEST_CONFIG);
      const product = await client.getProduct('wix-prod-001');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.wixapis.com/stores-reader/v1/products/wix-prod-001',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(product.id).toBe('wix-prod-001');
      expect(product.name).toBe('The Asheville Full Futon');
    });

    it('throws WixApiError for not found', async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ message: 'Product not found' }, 404));

      const client = new WixClient(TEST_CONFIG);
      await expect(client.getProduct('nonexistent')).rejects.toThrow(WixApiError);
    });

    it('rejects empty product ID', async () => {
      const client = new WixClient(TEST_CONFIG);
      await expect(client.getProduct('')).rejects.toThrow('Product ID is required');
    });
  });

  // ============================================================
  // getProductBySlug
  // ============================================================

  describe('getProductBySlug', () => {
    it('fetches product by slug via query filter', async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({
          products: [WIX_PRODUCT_FIXTURE],
          totalResults: 1,
        }),
      );

      const client = new WixClient(TEST_CONFIG);
      const product = await client.getProductBySlug('asheville-full-futon');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query.filter).toEqual({ slug: { $eq: 'asheville-full-futon' } });
      expect(body.query.paging.limit).toBe(1);
      expect(product.name).toBe('The Asheville Full Futon');
    });

    it('throws WixApiError when product not found by slug', async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ products: [], totalResults: 0 }));

      const client = new WixClient(TEST_CONFIG);
      await expect(client.getProductBySlug('nonexistent')).rejects.toThrow(
        'Product not found: nonexistent',
      );
    });

    it('rejects empty slug', async () => {
      const client = new WixClient(TEST_CONFIG);
      await expect(client.getProductBySlug('')).rejects.toThrow('Product slug is required');
    });
  });

  // ============================================================
  // queryCollections
  // ============================================================

  describe('queryCollections', () => {
    it('fetches collections with correct endpoint', async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({
          collections: [WIX_COLLECTION_FIXTURE],
          totalResults: 1,
        }),
      );

      const client = new WixClient(TEST_CONFIG);
      const result = await client.queryCollections();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.wixapis.com/stores-reader/v1/collections/query',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result.collections).toHaveLength(1);
      expect(result.collections[0].name).toBe('Futons');
    });

    it('passes pagination parameters', async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ collections: [], totalResults: 0 }));

      const client = new WixClient(TEST_CONFIG);
      await client.queryCollections({ limit: 10, offset: 0 });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query.paging.limit).toBe(10);
    });
  });

  // ============================================================
  // getInventoryStatus
  // ============================================================

  describe('getInventoryStatus', () => {
    it('fetches inventory for a product', async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({
          inventoryItems: [
            {
              id: 'inv-001',
              productId: 'wix-prod-001',
              trackQuantity: true,
              variants: [{ variantId: 'var-1', inStock: true, quantity: 15 }],
            },
          ],
        }),
      );

      const client = new WixClient(TEST_CONFIG);
      const result = await client.getInventoryStatus('wix-prod-001');

      expect(result.inStock).toBe(true);
      expect(result.totalQuantity).toBe(15);
      expect(result.variants).toHaveLength(1);
    });

    it('returns out of stock for zero quantity', async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({
          inventoryItems: [
            {
              id: 'inv-001',
              productId: 'wix-prod-001',
              trackQuantity: true,
              variants: [{ variantId: 'var-1', inStock: false, quantity: 0 }],
            },
          ],
        }),
      );

      const client = new WixClient(TEST_CONFIG);
      const result = await client.getInventoryStatus('wix-prod-001');

      expect(result.inStock).toBe(false);
      expect(result.totalQuantity).toBe(0);
    });

    it('handles missing inventory gracefully', async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ inventoryItems: [] }));

      const client = new WixClient(TEST_CONFIG);
      const result = await client.getInventoryStatus('unknown-product');

      expect(result.inStock).toBe(false);
      expect(result.totalQuantity).toBe(0);
      expect(result.variants).toHaveLength(0);
    });
  });

  // ============================================================
  // queryData (generic CMS collection queries)
  // ============================================================

  describe('queryData', () => {
    it('queries a custom CMS collection', async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({
          dataItems: [
            { data: { _id: 'rev-1', productId: 'prod-1', rating: 5, body: 'Great!' } },
            { data: { _id: 'rev-2', productId: 'prod-1', rating: 4, body: 'Good' } },
          ],
          pagingMetadata: { total: 2 },
        }),
      );

      const client = new WixClient(TEST_CONFIG);
      const result = await client.queryData('Reviews', {
        filter: { productId: { $eq: 'prod-1' }, status: { $eq: 'approved' } },
        sort: [{ fieldName: '_createdDate', order: 'DESC' }],
        limit: 10,
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        _id: 'rev-1',
        productId: 'prod-1',
        rating: 5,
        body: 'Great!',
      });
      expect(result.totalResults).toBe(2);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.dataCollectionId).toBe('Reviews');
      expect(body.query.filter.productId).toEqual({ $eq: 'prod-1' });
    });

    it('sends correct endpoint', async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ dataItems: [], pagingMetadata: { total: 0 } }));

      const client = new WixClient(TEST_CONFIG);
      await client.queryData('SomeCollection');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.wixapis.com/wix-data/v2/items/query',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('rejects empty collection ID', async () => {
      const client = new WixClient(TEST_CONFIG);
      await expect(client.queryData('')).rejects.toThrow('Collection ID is required');
    });

    it('handles empty result set', async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ dataItems: [], pagingMetadata: { total: 0 } }));

      const client = new WixClient(TEST_CONFIG);
      const result = await client.queryData('Reviews');

      expect(result.items).toEqual([]);
      expect(result.totalResults).toBe(0);
    });
  });
});

// ============================================================
// queryReviews
// ============================================================

describe('queryReviews', () => {
  const WIX_REVIEW_FIXTURE = {
    _id: 'rev-wix-001',
    data: {
      productId: 'asheville-full',
      authorName: 'Sarah M.',
      rating: 5,
      title: 'Best futon ever',
      body: 'Love this futon.',
      _createdDate: '2026-02-10T14:22:00Z',
      helpful: 18,
      verified: true,
      photos: ['https://example.com/photo1.jpg'],
    },
  };

  it('queries the Reviews CMS collection with product filter', async () => {
    mockFetch.mockReturnValue(
      mockJsonResponse({
        dataItems: [WIX_REVIEW_FIXTURE],
        pagingMetadata: { total: 1 },
      }),
    );

    const client = new WixClient(TEST_CONFIG);
    await client.queryReviews('asheville-full');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.wixapis.com/wix-data/v2/items/query',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"Reviews"'),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.dataCollectionId).toBe('Reviews');
    expect(body.query.filter.productId.$eq).toBe('asheville-full');
  });

  it('returns transformed review objects', async () => {
    mockFetch.mockReturnValue(
      mockJsonResponse({
        dataItems: [WIX_REVIEW_FIXTURE],
        pagingMetadata: { total: 1 },
      }),
    );

    const client = new WixClient(TEST_CONFIG);
    const result = await client.queryReviews('asheville-full');

    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0]).toEqual({
      id: 'rev-wix-001',
      productId: 'asheville-full',
      authorName: 'Sarah M.',
      rating: 5,
      title: 'Best futon ever',
      body: 'Love this futon.',
      createdAt: '2026-02-10T14:22:00Z',
      helpful: 18,
      verified: true,
      photos: ['https://example.com/photo1.jpg'],
    });
    expect(result.totalResults).toBe(1);
  });

  it('sorts by most recent by default', async () => {
    mockFetch.mockReturnValue(
      mockJsonResponse({
        dataItems: [],
        pagingMetadata: { total: 0 },
      }),
    );

    const client = new WixClient(TEST_CONFIG);
    await client.queryReviews('asheville-full');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.query.sort).toEqual([{ fieldName: '_createdDate', order: 'DESC' }]);
  });

  it('accepts custom sort and limit options', async () => {
    mockFetch.mockReturnValue(
      mockJsonResponse({
        dataItems: [],
        pagingMetadata: { total: 0 },
      }),
    );

    const client = new WixClient(TEST_CONFIG);
    await client.queryReviews('asheville-full', { limit: 10, sort: 'helpful' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.query.paging.limit).toBe(10);
    expect(body.query.sort).toEqual([{ fieldName: 'helpful', order: 'DESC' }]);
  });

  it('returns empty array when no reviews exist', async () => {
    mockFetch.mockReturnValue(
      mockJsonResponse({
        dataItems: [],
        pagingMetadata: { total: 0 },
      }),
    );

    const client = new WixClient(TEST_CONFIG);
    const result = await client.queryReviews('nonexistent-product');

    expect(result.reviews).toEqual([]);
    expect(result.totalResults).toBe(0);
  });

  it('handles reviews without optional photos', async () => {
    const noPhotos = {
      ...WIX_REVIEW_FIXTURE,
      data: { ...WIX_REVIEW_FIXTURE.data, photos: undefined },
    };
    mockFetch.mockReturnValue(
      mockJsonResponse({
        dataItems: [noPhotos],
        pagingMetadata: { total: 1 },
      }),
    );

    const client = new WixClient(TEST_CONFIG);
    const result = await client.queryReviews('asheville-full');

    expect(result.reviews[0].photos).toBeUndefined();
  });

  it('throws WixApiError on API failure', async () => {
    mockFetch.mockReturnValue(
      mockJsonResponse({ message: 'Collection not found' }, 404),
    );

    const client = new WixClient(TEST_CONFIG);
    await expect(client.queryReviews('asheville-full')).rejects.toThrow(WixApiError);
  });
});

// ============================================================
// createReview
// ============================================================

describe('createReview', () => {
  it('posts to the Reviews CMS collection', async () => {
    mockFetch.mockReturnValue(
      mockJsonResponse({
        dataItem: {
          _id: 'rev-new-001',
          data: {
            productId: 'asheville-full',
            authorName: 'Test User',
            rating: 5,
            title: 'Great',
            body: 'Loved it.',
            helpful: 0,
            verified: false,
          },
        },
      }),
    );

    const client = new WixClient(TEST_CONFIG);
    const result = await client.createReview({
      productId: 'asheville-full',
      authorName: 'Test User',
      rating: 5,
      title: 'Great',
      body: 'Loved it.',
      photos: [],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.wixapis.com/wix-data/v2/items',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.dataCollectionId).toBe('Reviews');
    expect(body.dataItem.data.productId).toBe('asheville-full');
    expect(body.dataItem.data.rating).toBe(5);

    expect(result.id).toBe('rev-new-001');
    expect(result.productId).toBe('asheville-full');
    expect(result.rating).toBe(5);
  });

  it('includes photos when provided', async () => {
    mockFetch.mockReturnValue(
      mockJsonResponse({
        dataItem: {
          _id: 'rev-new-002',
          data: {
            productId: 'asheville-full',
            authorName: 'Test',
            rating: 4,
            title: 'Nice',
            body: 'Good.',
            photos: ['https://example.com/photo.jpg'],
            helpful: 0,
            verified: false,
          },
        },
      }),
    );

    const client = new WixClient(TEST_CONFIG);
    await client.createReview({
      productId: 'asheville-full',
      authorName: 'Test',
      rating: 4,
      title: 'Nice',
      body: 'Good.',
      photos: ['https://example.com/photo.jpg'],
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.dataItem.data.photos).toEqual(['https://example.com/photo.jpg']);
  });

  it('throws WixApiError on failure', async () => {
    mockFetch.mockReturnValue(
      mockJsonResponse({ message: 'Unauthorized' }, 401),
    );

    const client = new WixClient(TEST_CONFIG);
    await expect(
      client.createReview({
        productId: 'asheville-full',
        authorName: 'Test',
        rating: 5,
        title: 'Great',
        body: 'Test',
        photos: [],
      }),
    ).rejects.toThrow(WixApiError);
  });
});

// ============================================================
// Transform functions (unit tests)
// ============================================================

describe('transformWixProduct', () => {
  it('maps all required Product fields', () => {
    const product = transformWixProduct(WIX_PRODUCT_FIXTURE);

    expect(product.id).toBe('wix-prod-001');
    expect(product.name).toBe('The Asheville Full Futon');
    expect(product.slug).toBe('asheville-full-futon');
    expect(product.price).toBe(349);
    expect(product.inStock).toBe(true);
    expect(product.badge).toBe('Bestseller');
    expect(product.images).toHaveLength(1);
    expect(product.images[0].uri).toBe('https://static.wixstatic.com/media/asheville.jpg');
    expect(product.images[0].alt).toBe('Asheville Futon');
    expect(product.fabricOptions).toEqual(['Natural Linen', 'Slate Gray']);
  });

  it('sets originalPrice when discountedPrice < price', () => {
    const product = transformWixProduct(WIX_SALE_PRODUCT_FIXTURE);

    expect(product.price).toBe(319);
    expect(product.originalPrice).toBe(379);
    expect(product.badge).toBe('Sale');
  });

  it('does not set originalPrice when prices are equal', () => {
    const product = transformWixProduct(WIX_PRODUCT_FIXTURE);

    expect(product.originalPrice).toBeUndefined();
  });

  it('handles product with no media', () => {
    const noMedia = {
      ...WIX_PRODUCT_FIXTURE,
      media: { items: [], mainMedia: null },
    };
    const product = transformWixProduct(noMedia as WixProduct);

    expect(product.images).toEqual([]);
  });

  it('handles product with no ribbons', () => {
    const noRibbons = { ...WIX_PRODUCT_FIXTURE, ribbons: [] };
    const product = transformWixProduct(noRibbons);

    expect(product.badge).toBeUndefined();
  });

  it('handles product with no productOptions', () => {
    const noOptions = { ...WIX_PRODUCT_FIXTURE, productOptions: [] };
    const product = transformWixProduct(noOptions);

    expect(product.fabricOptions).toEqual([]);
  });

  it('extracts fabric options from Fabric option only', () => {
    const multipleOptions: WixProduct = {
      ...WIX_PRODUCT_FIXTURE,
      productOptions: [
        {
          name: 'Size',
          choices: [
            { value: 'Full', description: '' },
            { value: 'Queen', description: '' },
          ],
        },
        {
          name: 'Fabric',
          choices: [
            { value: 'Linen', description: '' },
            { value: 'Velvet', description: '' },
          ],
        },
      ],
    };
    const product = transformWixProduct(multipleOptions);

    expect(product.fabricOptions).toEqual(['Linen', 'Velvet']);
  });

  it('infers "full" size from product name', () => {
    const wix = { ...WIX_PRODUCT_FIXTURE, name: 'The Asheville Full Futon' };
    const product = transformWixProduct(wix);
    expect(product.size).toBe('full');
  });

  it('infers "queen" size from product name', () => {
    const wix = { ...WIX_PRODUCT_FIXTURE, name: 'The Biltmore Queen Sleeper' };
    const product = transformWixProduct(wix);
    expect(product.size).toBe('queen');
  });

  it('infers "twin" size from product name', () => {
    const wix = { ...WIX_PRODUCT_FIXTURE, name: 'Pisgah Twin Daybed' };
    const product = transformWixProduct(wix);
    expect(product.size).toBe('twin');
  });

  it('does not infer size from partial word matches (e.g. "Beautiful" ≠ "full")', () => {
    const wix = { ...WIX_PRODUCT_FIXTURE, name: 'Beautiful Linen Pillow' };
    const product = transformWixProduct(wix);
    expect(product.size).toBeUndefined();
  });

  it('returns undefined size when name has no size keyword', () => {
    const wix = { ...WIX_PRODUCT_FIXTURE, name: 'Organic Cotton Cover' };
    const product = transformWixProduct(wix);
    expect(product.size).toBeUndefined();
  });

  it('defaults rating and reviewCount to 0', () => {
    const product = transformWixProduct(WIX_PRODUCT_FIXTURE);
    // Wix products don't include rating in product query — that comes separately
    expect(product.rating).toBe(0);
    expect(product.reviewCount).toBe(0);
  });

  it('defaults dimensions to 0x0x0', () => {
    const product = transformWixProduct(WIX_PRODUCT_FIXTURE);
    expect(product.dimensions).toEqual({ width: 0, depth: 0, height: 0 });
  });
});

describe('transformWixCollection', () => {
  it('maps collection fields', () => {
    const collection = transformWixCollection(WIX_COLLECTION_FIXTURE);

    expect(collection.id).toBe('collection-futons');
    expect(collection.name).toBe('Futons');
    expect(collection.slug).toBe('futons');
    expect(collection.productCount).toBe(8);
    expect(collection.imageUrl).toBe('https://static.wixstatic.com/media/futons-hero.jpg');
  });

  it('handles collection with no media', () => {
    const noMedia = { ...WIX_COLLECTION_FIXTURE, media: undefined };
    const collection = transformWixCollection(noMedia as WixCollection);

    expect(collection.imageUrl).toBeUndefined();
  });
});

// ============================================================
// Collection → Category mapping
// ============================================================

describe('collection-category mapping', () => {
  it('resolves known collection slugs to ProductCategory', () => {
    expect(resolveCategory('futons')).toBe('futons');
    expect(resolveCategory('murphy-beds')).toBe('murphy-beds');
    expect(resolveCategory('covers')).toBe('covers');
    expect(resolveCategory('mattresses')).toBe('mattresses');
    expect(resolveCategory('frames')).toBe('frames');
    expect(resolveCategory('pillows')).toBe('pillows');
    expect(resolveCategory('accessories')).toBe('accessories');
  });

  it('resolves alternate collection slugs (aliases)', () => {
    expect(resolveCategory('murphy-cabinet-beds')).toBe('murphy-beds');
    expect(resolveCategory('futon-covers')).toBe('covers');
    expect(resolveCategory('futon-mattresses')).toBe('mattresses');
    expect(resolveCategory('futon-frames')).toBe('frames');
  });

  it('defaults unknown slugs to futons', () => {
    expect(resolveCategory('unknown-collection')).toBe('futons');
    expect(resolveCategory('')).toBe('futons');
  });

  it('allows overriding the collection map', () => {
    const original = getCollectionCategoryMap();

    setCollectionCategoryMap({ 'custom-collection': 'pillows' as ProductCategory });
    expect(resolveCategory('custom-collection')).toBe('pillows');
    expect(resolveCategory('futons')).toBe('futons'); // Default still works? No — map was replaced

    // Restore
    setCollectionCategoryMap(original);
    expect(resolveCategory('futons')).toBe('futons');
  });

  it('getCollectionCategoryMap returns a copy (not reference)', () => {
    const map1 = getCollectionCategoryMap();
    const map2 = getCollectionCategoryMap();
    expect(map1).toEqual(map2);
    expect(map1).not.toBe(map2); // Different object references
  });
});
