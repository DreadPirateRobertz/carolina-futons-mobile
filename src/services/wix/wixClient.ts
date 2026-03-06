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

import type { Product, ProductImage, ProductCategory } from '@/data/products';
import type { Order, OrderStatus, OrderLineItem, ShippingAddress, TrackingInfo } from '@/data/orders';
import type { Review, ReviewSummary } from '@/data/reviews';
import type { Store, StoreHours } from '@/data/stores';
import { getTrackingUrl } from '@/data/orders';
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

// ── Query options ──────────────────────────────────────────────

export interface QueryProductsOptions {
  limit?: number;
  offset?: number;
  sort?: 'price-asc' | 'price-desc' | 'newest' | 'rating' | 'featured';
  collectionId?: string;
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

// ── Sort mapping ───────────────────────────────────────────────

const SORT_MAP: Record<string, { fieldName: string; order: string }[]> = {
  'price-asc': [{ fieldName: 'price', order: 'ASC' }],
  'price-desc': [{ fieldName: 'price', order: 'DESC' }],
  newest: [{ fieldName: 'lastUpdated', order: 'DESC' }],
  rating: [{ fieldName: 'numericId', order: 'DESC' }],
  featured: [],
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
    const { limit = 50, offset = 0, sort, collectionId, search } = options;

    const filter: Record<string, unknown> = {};
    if (collectionId) {
      filter.collectionIds = { $hasSome: [collectionId] };
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

  // ── Orders (eCommerce) ─────────────────────────────────────

  async queryOrders(options: { limit?: number; offset?: number } = {}): Promise<{
    orders: Order[];
    totalResults: number;
  }> {
    const { limit = 50, offset = 0 } = options;

    const body = {
      query: {
        paging: {
          limit: Math.min(Math.max(1, limit), 100),
          offset: Math.max(0, offset),
        },
        sort: [{ fieldName: 'createdDate', order: 'DESC' }],
      },
    };

    const data = await this.post<{
      orders: WixOrder[];
      pagingMetadata: { total: number };
    }>('/ecom/v1/orders/query', body);

    return {
      orders: (data.orders ?? []).map(transformWixOrder),
      totalResults: data.pagingMetadata?.total ?? 0,
    };
  }

  async getOrder(orderId: string): Promise<Order | null> {
    if (!orderId) throw new WixApiError('Order ID is required');

    const data = await this.get<{ order: WixOrder }>(
      `/ecom/v1/orders/${encodeURIComponent(orderId)}`,
    );

    return data.order ? transformWixOrder(data.order) : null;
  }

  // ── Reviews (CMS) ────────────────────────────────────────

  async queryReviews(
    productId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ reviews: Review[]; totalResults: number }> {
    if (!productId) throw new WixApiError('Product ID is required');

    const { limit = 50, offset = 0 } = options;

    const result = await this.queryData<WixCmsReview>('Reviews', {
      filter: { productId: { $eq: productId } },
      sort: [{ fieldName: 'createdAt', order: 'DESC' }],
      limit,
      offset,
    });

    return {
      reviews: result.items.map((item) => transformWixCmsReview(item, productId)),
      totalResults: result.totalResults,
    };
  }

  async getReviewSummary(productId: string): Promise<ReviewSummary> {
    const result = await this.queryReviews(productId, { limit: 100 });
    const reviews = result.reviews;
    const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];

    for (const review of reviews) {
      if (review.rating >= 1 && review.rating <= 5) {
        distribution[review.rating - 1] += 1;
      }
    }

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
        : 0;

    return { averageRating, totalReviews, distribution };
  }

  // ── Stores (CMS) ─────────────────────────────────────────

  async queryStores(options: { limit?: number; offset?: number } = {}): Promise<{
    stores: Store[];
    totalResults: number;
  }> {
    const { limit = 50, offset = 0 } = options;

    const result = await this.queryData<WixCmsStore>('Stores', { limit, offset });

    return {
      stores: result.items.map(transformWixCmsStore),
      totalResults: result.totalResults,
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

  return {
    id: wix.id,
    name: wix.name,
    slug: wix.slug,
    category: 'futons' as ProductCategory, // Resolved via collection mapping
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

// ── Wix eCommerce Order types ─────────────────────────────────

interface WixOrder {
  id: string;
  number: string;
  status: string;
  lineItems: WixOrderLineItem[];
  priceSummary: {
    subtotal: { amount: string };
    shipping: { amount: string };
    tax: { amount: string };
    total: { amount: string };
  };
  shippingInfo?: {
    logistics?: {
      shippingDestination?: {
        address?: {
          addressLine1?: string;
          city?: string;
          subdivision?: string;
          postalCode?: string;
        };
        contactDetails?: { firstName?: string; lastName?: string };
      };
    };
    carrierId?: string;
    code?: string;
  };
  fulfillments?: WixFulfillment[];
  createdDate: string;
  updatedDate: string;
  paymentStatus?: string;
}

interface WixOrderLineItem {
  id: string;
  productName?: { original?: string };
  catalogReference?: { catalogItemId?: string };
  quantity: number;
  price?: { amount: string };
  totalPrice?: { amount: string };
  image?: { url: string };
  descriptionLines?: { name?: { original?: string }; plainText?: { original?: string } }[];
}

interface WixFulfillment {
  id: string;
  trackingInfo?: {
    trackingNumber?: string;
    shippingProvider?: string;
    trackingLink?: string;
  };
}

function mapWixOrderStatus(status: string): OrderStatus {
  switch (status.toUpperCase()) {
    case 'APPROVED':
    case 'CREATED':
      return 'processing';
    case 'FULFILLED':
      return 'delivered';
    case 'CANCELED':
      return 'cancelled';
    default:
      return 'processing';
  }
}

function transformWixOrder(wix: WixOrder): Order {
  const status = mapWixOrderStatus(wix.status);

  const items: OrderLineItem[] = (wix.lineItems ?? []).map((li) => {
    const descLines = li.descriptionLines ?? [];
    const fabricLine = descLines.find(
      (d) => d.name?.original?.toLowerCase() === 'fabric',
    );

    return {
      id: li.id,
      modelId: li.catalogReference?.catalogItemId ?? li.id,
      modelName: li.productName?.original ?? 'Product',
      fabricId: fabricLine?.plainText?.original ?? '',
      fabricName: fabricLine?.plainText?.original ?? '',
      fabricColor: '',
      quantity: li.quantity ?? 1,
      unitPrice: parseFloat(li.price?.amount ?? '0'),
      lineTotal: parseFloat(li.totalPrice?.amount ?? '0'),
    };
  });

  const dest = wix.shippingInfo?.logistics?.shippingDestination;
  const contact = dest?.contactDetails;
  const addr = dest?.address;
  const shippingAddress: ShippingAddress = {
    name: [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || 'N/A',
    street: addr?.addressLine1 ?? '',
    city: addr?.city ?? '',
    state: addr?.subdivision ?? '',
    zip: addr?.postalCode ?? '',
  };

  let tracking: TrackingInfo | undefined;
  const fulfillment = wix.fulfillments?.[0];
  if (fulfillment?.trackingInfo) {
    const ti = fulfillment.trackingInfo;
    const carrier = ti.shippingProvider ?? '';
    const trackingNumber = ti.trackingNumber ?? '';
    tracking = {
      carrier,
      trackingNumber,
      url: ti.trackingLink ?? getTrackingUrl(carrier, trackingNumber),
    };
  }

  const ps = wix.priceSummary;

  return {
    id: wix.id,
    orderNumber: `CF-${wix.number}`,
    status,
    createdAt: wix.createdDate,
    updatedAt: wix.updatedDate,
    items,
    subtotal: parseFloat(ps?.subtotal?.amount ?? '0'),
    shipping: parseFloat(ps?.shipping?.amount ?? '0'),
    tax: parseFloat(ps?.tax?.amount ?? '0'),
    total: parseFloat(ps?.total?.amount ?? '0'),
    shippingAddress,
    paymentMethod: wix.paymentStatus === 'PAID' ? 'Paid' : 'Pending',
    ...(tracking ? { tracking } : {}),
  };
}

// ── Wix CMS Review types ──────────────────────────────────────

interface WixCmsReview {
  _id: string;
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

function transformWixCmsReview(item: WixCmsReview, productId: string): Review {
  return {
    id: item._id,
    productId,
    authorName: item.authorName ?? 'Anonymous',
    rating: item.rating ?? 5,
    title: item.title ?? '',
    body: item.body ?? '',
    createdAt: item.createdAt ?? new Date().toISOString(),
    helpful: item.helpful ?? 0,
    verified: item.verified ?? false,
    ...(item.photos?.length ? { photos: item.photos } : {}),
  };
}

// ── Wix CMS Store types ───────────────────────────────────────

interface WixCmsStore {
  _id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  latitude: number;
  longitude: number;
  hours: StoreHours[];
  photos: string[];
  features: string[];
  description: string;
}

function transformWixCmsStore(item: WixCmsStore): Store {
  return {
    id: item._id,
    name: item.name ?? '',
    address: item.address ?? '',
    city: item.city ?? '',
    state: item.state ?? '',
    zip: item.zip ?? '',
    phone: item.phone ?? '',
    email: item.email ?? '',
    latitude: item.latitude ?? 0,
    longitude: item.longitude ?? 0,
    hours: item.hours ?? [],
    photos: item.photos ?? [],
    features: item.features ?? [],
    description: item.description ?? '',
  };
}
