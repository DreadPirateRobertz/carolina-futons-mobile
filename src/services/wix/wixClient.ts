/**
 * Wix Stores REST API client for Carolina Futons mobile app.
 *
 * Replaces static mock data with live product catalog from Wix CMS.
 * Uses Wix Stores Catalog V1 REST API.
 *
 * Endpoints:
 * - POST /stores-reader/v1/products/query (list/search products)
 * - GET  /stores-reader/v1/products/{id}  (single product)
 * - POST /stores-reader/v1/collections/query (list collections)
 * - POST /stores/v1/inventoryItems/query (inventory status)
 */

import type { Product, ProductImage, ProductCategory, ProductSize, SortOption } from '@/data/products';
import { withRetry } from './retry';

// ── Config ─────────────────────────────────────────────────────

export interface WixClientConfig {
  apiKey: string;
  siteId: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://www.wixapis.com';

// ── Wix API Types ──────────────────────────────────────────────

export interface WixProduct {
  id: string;
  name: string;
  slug: string;
  visible: boolean;
  productType: string;
  description: string;
  price: {
    currency: string;
    price: number;
    discountedPrice: number;
    formatted: { price: string; discountedPrice: string };
  };
  media: {
    items: WixMediaItem[];
    mainMedia: WixMediaItem | null;
  };
  stock: { inStock: boolean; quantity?: number };
  ribbons: { text: string }[];
  numericId: string;
  collectionIds: string[];
  additionalInfoSections: unknown[];
  productOptions: WixProductOption[];
  customTextFields: unknown[];
  sku?: string;
  weight?: number;
  variants: unknown[];
}

interface WixMediaItem {
  image: {
    url: string;
    width: number;
    height: number;
    altText?: string;
  };
  mediaType: string;
}

interface WixProductOption {
  name: string;
  choices: { value: string; description: string }[];
}

export interface WixCollection {
  id: string;
  name: string;
  slug: string;
  visible: boolean;
  numberOfProducts: number;
  media?: {
    mainMedia?: {
      image: { url: string; width: number; height: number; altText?: string };
      mediaType: string;
    };
  };
}

interface WixInventoryItem {
  id: string;
  productId: string;
  trackQuantity: boolean;
  variants: { variantId: string; inStock: boolean; quantity: number }[];
}

// ── Order types ───────────────────────────────────────────────

export interface WixOrderResponse {
  _id: string;
  number: string;
  status: string; // INITIALIZED | APPROVED | FULFILLED | CANCELED
  _createdDate: string;
  _updatedDate: string;
  lineItems: {
    _id: string;
    catalogReference: { catalogItemId: string; appId: string };
    productName: { translated: string };
    quantity: number;
    price: { amount: string };
    totalPrice: { amount: string };
    mediaItem?: { url: string };
  }[];
  priceSummary: {
    subtotal: { amount: string };
    shipping: { amount: string };
    tax: { amount: string };
    total: { amount: string };
  };
  shippingInfo?: {
    logistics?: {
      shippingDestination?: {
        contactDetails?: { firstName: string; lastName: string };
        address?: {
          addressLine1: string;
          city: string;
          subdivision: string;
          postalCode: string;
        };
      };
      trackingInfo?: {
        trackingNumber: string;
        shippingProvider: string;
        trackingLink: string;
      };
      deliveryTime?: string;
    };
  };
  paymentStatus: string;
  billingInfo?: {
    paymentMethod?: string;
  };
}

// ── Cart types ────────────────────────────────────────────────

export interface WixCartLineItem {
  _id: string;
  catalogReference: {
    catalogItemId: string;
    appId: string;
    options?: { variantId?: string };
  };
  quantity: number;
}

export interface WixCart {
  lineItems: WixCartLineItem[];
}

// ── Transformed output types ───────────────────────────────────

export interface WixCollectionInfo {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  imageUrl?: string;
}

export interface InventoryStatus {
  inStock: boolean;
  totalQuantity: number;
  variants: { variantId: string; inStock: boolean; quantity: number }[];
}

// ── Coupon types ──────────────────────────────────────────────

export interface CouponResult {
  id: string;
  code: string;
  name: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumSubtotal?: number;
}

// ── Review types ──────────────────────────────────────────────

export interface WixReview {
  id: string;
  productId: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  helpful: number;
  verified: boolean;
  photos?: string[];
}

interface WixReviewData {
  productId: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  _createdDate?: string;
  helpful: number;
  verified: boolean;
  photos?: string[];
}

export interface CreateReviewInput {
  productId: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  photos: string[];
}

// ── Query options ──────────────────────────────────────────────

export interface QueryProductsOptions {
  limit?: number;
  offset?: number;
  sort?: SortOption;
  collectionId?: string;
  productIds?: string[];
  search?: string;
}

export interface QueryCollectionsOptions {
  limit?: number;
  offset?: number;
}

// ── Error class ────────────────────────────────────────────────

/** Structured error thrown by WixClient on HTTP or network failures. */
export class WixApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly endpoint?: string,
  ) {
    super(message);
    this.name = 'WixApiError';
  }
}

// ── Collection → Category mapping ──────────────────────────────
// Maps Wix collection slugs to our local ProductCategory type.
// This is configurable so the app can adapt to collection name changes.

const DEFAULT_COLLECTION_MAP: Record<string, ProductCategory> = {
  futons: 'futons',
  'murphy-beds': 'murphy-beds',
  'murphy-cabinet-beds': 'murphy-beds',
  covers: 'covers',
  'futon-covers': 'covers',
  mattresses: 'mattresses',
  'futon-mattresses': 'mattresses',
  frames: 'frames',
  'futon-frames': 'frames',
  pillows: 'pillows',
  accessories: 'accessories',
};

let collectionMap = { ...DEFAULT_COLLECTION_MAP };

/** Override the default Wix-collection-slug to ProductCategory mapping. */
export function setCollectionCategoryMap(map: Record<string, ProductCategory>): void {
  collectionMap = { ...map };
}

/** Return a copy of the current collection-slug to ProductCategory map. */
export function getCollectionCategoryMap(): Record<string, ProductCategory> {
  return { ...collectionMap };
}

/** Map a Wix collection slug to a local ProductCategory, defaulting to 'futons'. */
export function resolveCategory(collectionSlug: string): ProductCategory {
  return collectionMap[collectionSlug] ?? ('futons' as ProductCategory);
}

// ── Size inference from product names ────────────────────────────
// Word-boundary patterns prevent false matches (e.g. "Beautiful" vs "full")
const SIZE_PATTERNS: [ProductSize, RegExp][] = [
  ['queen', /\bqueen\b/],
  ['twin', /\btwin\b/],
  ['full', /\bfull\b/],
];

// ── Sort mapping ───────────────────────────────────────────────

const SORT_MAP: Record<SortOption, { fieldName: string; order: string }[]> = {
  'price-asc': [{ fieldName: 'price', order: 'ASC' }],
  'price-desc': [{ fieldName: 'price', order: 'DESC' }],
  newest: [{ fieldName: 'lastUpdated', order: 'DESC' }],
  rating: [{ fieldName: 'numericId', order: 'DESC' }],
  popular: [{ fieldName: 'numericId', order: 'DESC' }],
  featured: [],
};

// ── Review sort mapping ─────────────────────────────────────────

const REVIEW_SORT_MAP: Record<string, { fieldName: string; order: string }> = {
  recent: { fieldName: '_createdDate', order: 'DESC' },
  helpful: { fieldName: 'helpful', order: 'DESC' },
  highest: { fieldName: 'rating', order: 'DESC' },
  lowest: { fieldName: 'rating', order: 'ASC' },
};

// ── Client ─────────────────────────────────────────────────────

/**
 * HTTP client for the Wix Stores Catalog REST API (V1).
 * Handles product queries, collection queries, inventory lookups,
 * and generic Wix Data (CMS) queries with automatic retry on transient errors.
 */
export class WixClient {
  readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly siteId: string;

  constructor(config: WixClientConfig) {
    this.apiKey = config.apiKey;
    this.siteId = config.siteId;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  // ── Products ───────────────────────────────────────────────

  async queryProducts(
    options: QueryProductsOptions = {},
  ): Promise<{ products: Product[]; totalResults: number }> {
    const { limit = 50, offset = 0, sort, collectionId, productIds, search } = options;

    const filter: Record<string, unknown> = {};
    if (collectionId) {
      filter.collectionIds = { $hasSome: [collectionId] };
    }
    if (productIds?.length) {
      filter.id = { $in: productIds };
    }
    if (search) {
      filter.name = { $contains: search };
    }

    const sortEntries = sort ? (SORT_MAP[sort] ?? []) : [];

    const body = {
      query: {
        paging: {
          limit: Math.min(Math.max(1, limit), 100),
          offset: Math.max(0, offset),
        },
        ...(sortEntries.length > 0 ? { sort: sortEntries } : {}),
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
      },
    };

    const data = await this.post<{ products: WixProduct[]; totalResults: number }>(
      '/stores-reader/v1/products/query',
      body,
    );

    return {
      products: (data.products ?? []).map(transformWixProduct),
      totalResults: data.totalResults ?? 0,
    };
  }

  async getProduct(id: string): Promise<Product> {
    if (!id) throw new WixApiError('Product ID is required');

    const data = await this.get<{ product: WixProduct }>(
      `/stores-reader/v1/products/${encodeURIComponent(id)}`,
    );

    return transformWixProduct(data.product);
  }

  async getProductBySlug(slug: string): Promise<Product> {
    if (!slug) throw new WixApiError('Product slug is required');

    const body = {
      query: {
        filter: { slug: { $eq: slug } },
        paging: { limit: 1 },
      },
    };

    const data = await this.post<{ products: WixProduct[]; totalResults: number }>(
      '/stores-reader/v1/products/query',
      body,
    );

    if (!data.products?.length) {
      throw new WixApiError(`Product not found: ${slug}`, 404);
    }

    return transformWixProduct(data.products[0]);
  }

  // ── Collections ────────────────────────────────────────────

  async queryCollections(
    options: QueryCollectionsOptions = {},
  ): Promise<{ collections: WixCollectionInfo[]; totalResults: number }> {
    const { limit = 50, offset = 0 } = options;

    const body = {
      query: {
        paging: {
          limit: Math.min(Math.max(1, limit), 100),
          offset: Math.max(0, offset),
        },
      },
    };

    const data = await this.post<{ collections: WixCollection[]; totalResults: number }>(
      '/stores-reader/v1/collections/query',
      body,
    );

    return {
      collections: (data.collections ?? []).map(transformWixCollection),
      totalResults: data.totalResults ?? 0,
    };
  }

  // ── Inventory ──────────────────────────────────────────────

  async getInventoryStatus(productId: string): Promise<InventoryStatus> {
    if (!productId) throw new WixApiError('Product ID is required');

    const data = await this.post<{ inventoryItems: WixInventoryItem[] }>(
      '/stores/v1/inventoryItems/query',
      {
        query: {
          filter: { productId: { $eq: productId } },
          paging: { limit: 1 },
        },
      },
    );

    const item = data.inventoryItems?.[0];
    if (!item) {
      return { inStock: false, totalQuantity: 0, variants: [] };
    }

    const variants = item.variants ?? [];
    const totalQuantity = variants.reduce((sum, v) => sum + (v.quantity ?? 0), 0);
    const inStock = variants.some((v) => v.inStock) || totalQuantity > 0;

    return {
      inStock,
      totalQuantity,
      variants: variants.map((v) => ({
        variantId: v.variantId,
        inStock: v.inStock,
        quantity: v.quantity ?? 0,
      })),
    };
  }

  // ── Payments (eCommerce Payments API) ─────────────────────────

  async createPaymentIntent(
    lineItems: { id: string; name: string; fabric: string; quantity: number; unitPrice: number }[],
    totals: { subtotal: number; shipping: number; tax: number; total: number },
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
    ephemeralKey: string;
    customerId: string;
  }> {
    return this.post('/ecom/v1/payments/create-intent', { lineItems, totals });
  }

  async confirmOrder(
    paymentIntentId: string,
    lineItems: {
      id: string;
      modelId: string;
      modelName: string;
      fabricId: string;
      fabricName: string;
      quantity: number;
      unitPrice: number;
    }[],
    totals: { subtotal: number; shipping: number; tax: number; total: number },
    paymentMethod: string,
  ): Promise<{
    orderId: string;
    orderNumber: string;
    items: unknown[];
    totals: { subtotal: number; shipping: number; tax: number; total: number };
    paymentMethod: string;
    createdAt: string;
    estimatedDelivery: string;
  }> {
    return this.post('/ecom/v1/orders/confirm', {
      paymentIntentId,
      lineItems,
      totals,
      paymentMethod,
    });
  }

  // ── Orders (eCommerce Orders API) ──────────────────────────

  async queryOrders(options: { limit?: number; offset?: number } = {}): Promise<{
    orders: WixOrderResponse[];
    totalResults: number;
  }> {
    const { limit = 50, offset = 0 } = options;
    const data = await this.post<{ orders: WixOrderResponse[]; totalResults: number }>(
      '/ecom/v1/orders/query',
      {
        query: {
          paging: { limit: Math.min(Math.max(1, limit), 100), offset: Math.max(0, offset) },
          sort: [{ fieldName: '_createdDate', order: 'DESC' }],
        },
      },
    );
    return {
      orders: data.orders ?? [],
      totalResults: data.totalResults ?? 0,
    };
  }

  async getOrder(orderId: string): Promise<WixOrderResponse> {
    if (!orderId) throw new WixApiError('Order ID is required');
    const data = await this.get<{ order: WixOrderResponse }>(
      `/ecom/v1/orders/${encodeURIComponent(orderId)}`,
    );
    return data.order;
  }

  // ── Cart queries (eCommerce Cart API) ──────────────────────

  async getCart(): Promise<WixCart> {
    const data = await this.post<{ cart: WixCart }>(
      '/ecom/v1/carts/current',
      {},
    );
    return data.cart ?? { lineItems: [] };
  }

  // ── Cart mutations (eCommerce Cart API) ──────────────────────

  async addToCart(productId: string, quantity: number, variantId?: string): Promise<void> {
    const lineItem: Record<string, unknown> = {
      catalogReference: {
        catalogItemId: productId,
        appId: '1380b703-ce81-ff05-f115-39571d94dfcd', // Wix Stores app ID
        ...(variantId ? { options: { variantId } } : {}),
      },
      quantity,
    };

    await this.post('/ecom/v1/carts/current/add-to-cart', {
      lineItems: [lineItem],
    });
  }

  async removeFromCart(productId: string): Promise<void> {
    // First query the current cart to find the line item ID for this product
    const cart = await this.post<{ cart: { lineItems: { _id: string; catalogReference: { catalogItemId: string } }[] } }>(
      '/ecom/v1/carts/current',
      {},
    );

    const lineItem = cart.cart?.lineItems?.find(
      (li) => li.catalogReference?.catalogItemId === productId,
    );

    if (lineItem) {
      await this.post('/ecom/v1/carts/current/remove-line-items', {
        lineItemIds: [lineItem._id],
      });
    }
  }

  async updateCartItemQuantity(productId: string, quantity: number): Promise<void> {
    const cart = await this.post<{ cart: { lineItems: { _id: string; catalogReference: { catalogItemId: string } }[] } }>(
      '/ecom/v1/carts/current',
      {},
    );

    const lineItem = cart.cart?.lineItems?.find(
      (li) => li.catalogReference?.catalogItemId === productId,
    );

    if (lineItem) {
      await this.post('/ecom/v1/carts/current/update-line-items-quantity', {
        lineItems: [{ _id: lineItem._id, quantity }],
      });
    }
  }

  // ── Coupons (eCommerce Coupons API) ────────────────────────

  async applyCoupon(couponCode: string): Promise<CouponResult> {
    if (!couponCode.trim()) {
      throw new WixApiError('Coupon code is required');
    }

    const data = await this.post<{
      coupon: {
        id: string;
        code: string;
        name: string;
        discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
        discountValue: number;
        active: boolean;
        expired: boolean;
        usageLimit?: number;
        numberOfUsages?: number;
        minimumSubtotal?: number;
      };
    }>('/ecom/v1/coupons/validate', { code: couponCode.trim().toUpperCase() });

    const c = data.coupon;
    if (!c || !c.active || c.expired) {
      throw new WixApiError('Coupon is expired or inactive', 400);
    }

    return {
      id: c.id,
      code: c.code,
      name: c.name,
      discountType: c.discountType === 'PERCENTAGE' ? 'percentage' : 'fixed',
      discountValue: c.discountValue,
      minimumSubtotal: c.minimumSubtotal,
    };
  }

  // ── Wishlist mutations (Wix Data CMS) ───────────────────────

  async addToWishlist(productId: string, savedPrice: number): Promise<void> {
    await this.post('/wix-data/v2/items', {
      dataCollectionId: 'Wishlist',
      dataItem: {
        data: {
          productId,
          savedPrice,
          addedAt: new Date().toISOString(),
        },
      },
    });
  }

  async removeFromWishlist(productId: string): Promise<void> {
    // Find the wishlist item first
    const result = await this.post<{
      dataItems: { _id: string; data: { productId: string } }[];
    }>('/wix-data/v2/items/query', {
      dataCollectionId: 'Wishlist',
      query: {
        filter: { productId: { $eq: productId } },
        paging: { limit: 1 },
      },
    });

    const item = result.dataItems?.[0];
    if (item) {
      await this.post('/wix-data/v2/items/remove', {
        dataCollectionId: 'Wishlist',
        dataItemId: item._id,
      });
    }
  }

  // ── Reviews (Wix Data CMS) ────────────────────────────────

  async queryReviews(
    productId: string,
    options: { limit?: number; offset?: number; sort?: 'recent' | 'helpful' | 'highest' | 'lowest' } = {},
  ): Promise<{ reviews: WixReview[]; totalResults: number }> {
    if (!productId) throw new WixApiError('Product ID is required');

    const { limit = 50, offset = 0, sort = 'recent' } = options;

    const sortField = REVIEW_SORT_MAP[sort] ?? REVIEW_SORT_MAP.recent;

    const data = await this.post<{
      dataItems: { _id: string; data: WixReviewData }[];
      pagingMetadata: { total: number };
    }>('/wix-data/v2/items/query', {
      dataCollectionId: 'Reviews',
      query: {
        filter: { productId: { $eq: productId } },
        sort: [sortField],
        paging: {
          limit: Math.min(Math.max(1, limit), 100),
          offset: Math.max(0, offset),
        },
      },
    });

    return {
      reviews: (data.dataItems ?? []).map(transformWixReview),
      totalResults: data.pagingMetadata?.total ?? 0,
    };
  }

  async createReview(input: CreateReviewInput): Promise<WixReview> {
    const data = await this.post<{
      dataItem: { _id: string; data: WixReviewData };
    }>('/wix-data/v2/items', {
      dataCollectionId: 'Reviews',
      dataItem: {
        data: {
          productId: input.productId,
          authorName: input.authorName,
          rating: input.rating,
          title: input.title,
          body: input.body,
          helpful: 0,
          verified: false,
          ...(input.photos.length > 0 ? { photos: input.photos } : {}),
        },
      },
    });

    return transformWixReview(data.dataItem);
  }

  // ── Wix Data (Custom CMS Collections) ───────────────────────

  async queryData<T = Record<string, unknown>>(
    collectionId: string,
    options: {
      filter?: Record<string, unknown>;
      sort?: { fieldName: string; order: 'ASC' | 'DESC' }[];
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ items: T[]; totalResults: number }> {
    if (!collectionId) throw new WixApiError('Collection ID is required');

    const { filter, sort, limit = 50, offset = 0 } = options;

    const body = {
      dataCollectionId: collectionId,
      query: {
        paging: {
          limit: Math.min(Math.max(1, limit), 100),
          offset: Math.max(0, offset),
        },
        ...(filter ? { filter } : {}),
        ...(sort?.length ? { sort } : {}),
      },
    };

    const data = await this.post<{
      dataItems: { data: T }[];
      pagingMetadata: { total: number };
    }>('/wix-data/v2/items/query', body);

    return {
      items: (data.dataItems ?? []).map((item) => item.data),
      totalResults: data.pagingMetadata?.total ?? 0,
    };
  }

  // ── HTTP helpers ───────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      Authorization: this.apiKey,
      'wix-site-id': this.siteId,
      'Content-Type': 'application/json',
    };
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return withRetry(() => this.rawPost<T>(path, body), { shouldRetry: isRetryableError });
  }

  private async get<T>(path: string): Promise<T> {
    return withRetry(() => this.rawGet<T>(path), { shouldRetry: isRetryableError });
  }

  private async rawPost<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new WixApiError(
        `Network error: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        path,
      );
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new WixApiError(
        (errorBody as Record<string, string>).message ?? `HTTP ${response.status}`,
        response.status,
        path,
      );
    }

    return response.json() as Promise<T>;
  }

  private async rawGet<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: this.headers(),
      });
    } catch (err) {
      throw new WixApiError(
        `Network error: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        path,
      );
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new WixApiError(
        (errorBody as Record<string, string>).message ?? `HTTP ${response.status}`,
        response.status,
        path,
      );
    }

    return response.json() as Promise<T>;
  }
}

// ── Retry policy ───────────────────────────────────────────────

function isRetryableError(err: Error): boolean {
  if (err instanceof WixApiError) {
    // Don't retry client errors (4xx) — they won't resolve with retry
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
      return false;
    }
    // Retry server errors (5xx) and network errors (no statusCode)
    return true;
  }
  // Network/unknown errors — retry
  return true;
}

// ── Transform functions ────────────────────────────────────────

/** Convert a raw Wix API product object into the app's local Product shape. */
export function transformWixProduct(wix: WixProduct): Product {
  const isDiscounted = wix.price.discountedPrice < wix.price.price;

  const images: ProductImage[] = (wix.media?.items ?? [])
    .filter((item) => item.mediaType === 'IMAGE')
    .map((item) => ({
      uri: item.image.url,
      alt: item.image.altText ?? wix.name,
    }));

  const fabricOption = (wix.productOptions ?? []).find(
    (opt) => opt.name.toLowerCase() === 'fabric',
  );
  const fabricOptions = fabricOption ? fabricOption.choices.map((c) => c.value) : [];

  // Infer size from product name using word boundaries to avoid false matches
  // (e.g. "Beautiful" should not match "full")
  const nameLower = wix.name.toLowerCase();
  const size = SIZE_PATTERNS.find(([, re]) => re.test(nameLower))?.[0];

  return {
    id: wix.id,
    name: wix.name,
    slug: wix.slug,
    sku: wix.sku ?? '',
    category: 'futons' as ProductCategory, // TODO: resolve via collection mapping once Wix collection IDs are configured
    ...(size ? { size } : {}),
    price: isDiscounted ? wix.price.discountedPrice : wix.price.price,
    ...(isDiscounted ? { originalPrice: wix.price.price } : {}),
    description: wix.description ?? '',
    shortDescription: wix.name,
    images,
    ...(wix.ribbons?.[0]?.text ? { badge: wix.ribbons[0].text } : {}),
    rating: 0, // Wix product query doesn't include ratings — fetched separately
    reviewCount: 0,
    inStock: wix.stock?.inStock ?? false,
    fabricOptions,
    dimensions: { width: 0, depth: 0, height: 0 }, // From additionalInfoSections or custom fields
  };
}

/** Convert a raw Wix CMS review data item into the app's WixReview shape. */
export function transformWixReview(item: { _id: string; data: WixReviewData }): WixReview {
  const d = item.data;
  return {
    id: item._id,
    productId: d.productId,
    authorName: d.authorName,
    rating: d.rating,
    title: d.title,
    body: d.body,
    createdAt: d._createdDate ?? new Date().toISOString(),
    helpful: d.helpful ?? 0,
    verified: d.verified ?? false,
    ...(d.photos?.length ? { photos: d.photos } : {}),
  };
}

/** Convert a raw Wix API collection object into the app's WixCollectionInfo shape. */
export function transformWixCollection(wix: WixCollection): WixCollectionInfo {
  return {
    id: wix.id,
    name: wix.name,
    slug: wix.slug,
    productCount: wix.numberOfProducts ?? 0,
    ...(wix.media?.mainMedia?.image?.url ? { imageUrl: wix.media.mainMedia.image.url } : {}),
  };
}
