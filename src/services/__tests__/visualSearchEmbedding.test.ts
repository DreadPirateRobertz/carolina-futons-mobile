/**
 * Tests for visualSearchEmbedding service — deacon-905
 *
 * Covers: happy path (top-5 matches), resize step, network error,
 * empty results, timeout, malformed response, missing products in catalog.
 */

import { searchByImage } from '../visualSearchEmbedding';
import type { CatalogProduct } from '../visualSearch';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CATALOG: CatalogProduct[] = [
  {
    id: 'prod-1',
    name: 'Summit Futon',
    slug: 'summit-futon',
    sku: 'SF-001',
    category: 'futons',
    price: 699,
    images: ['https://example.com/summit.jpg'],
  },
  {
    id: 'prod-2',
    name: 'Valley Sofa',
    slug: 'valley-sofa',
    sku: 'VS-002',
    category: 'sofas',
    price: 899,
    images: ['https://example.com/valley.jpg'],
  },
  {
    id: 'prod-3',
    name: 'Ridge Loveseat',
    slug: 'ridge-loveseat',
    sku: 'RL-003',
    category: 'loveseats',
    price: 549,
    images: [],
  },
  {
    id: 'prod-4',
    name: 'Crest Sectional',
    slug: 'crest-sectional',
    sku: 'CS-004',
    category: 'sectionals',
    price: 1299,
    images: ['https://example.com/crest.jpg'],
  },
  {
    id: 'prod-5',
    name: 'Mesa Chair',
    slug: 'mesa-chair',
    sku: 'MC-005',
    category: 'chairs',
    price: 349,
    images: ['https://example.com/mesa.jpg'],
  },
  {
    id: 'prod-6',
    name: 'Canyon Ottoman',
    slug: 'canyon-ottoman',
    sku: 'CO-006',
    category: 'ottomans',
    price: 249,
    images: ['https://example.com/canyon.jpg'],
  },
];

const IMAGE_URI = 'file:///photos/snap-001.jpg';
const RESIZED_URI = 'file:///tmp/resized-001.jpg';
const BASE64_DATA = 'base64encodedimagedata==';

function mockHappyPath() {
  const { manipulateAsync } = require('expo-image-manipulator');
  const { readAsStringAsync } = require('expo-file-system');

  manipulateAsync.mockResolvedValue({ uri: RESIZED_URI });
  readAsStringAsync.mockResolvedValue(BASE64_DATA);
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      matches: [
        { productId: 'prod-1', score: 0.95 },
        { productId: 'prod-3', score: 0.87 },
        { productId: 'prod-5', score: 0.76 },
        { productId: 'prod-2', score: 0.65 },
        { productId: 'prod-4', score: 0.51 },
      ],
    }),
  });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Happy path ─────────────────────────────────────────────────────────────────

describe('searchByImage — happy path', () => {
  it('returns top-5 matches with products and scores', async () => {
    mockHappyPath();

    const result = await searchByImage(IMAGE_URI, CATALOG);

    expect(result.success).toBe(true);
    expect(result.matches).toHaveLength(5);
    expect(result.matches[0].product.id).toBe('prod-1');
    expect(result.matches[0].score).toBe(0.95);
    expect(result.error).toBeUndefined();
  });

  it('returns matches in descending score order', async () => {
    mockHappyPath();

    const result = await searchByImage(IMAGE_URI, CATALOG);

    const scores = result.matches.map((m) => m.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('resolves product details from catalog', async () => {
    mockHappyPath();

    const result = await searchByImage(IMAGE_URI, CATALOG);

    expect(result.matches[0].product).toMatchObject({
      id: 'prod-1',
      name: 'Summit Futon',
      slug: 'summit-futon',
      price: 699,
    });
  });
});

// ── Image resize step ──────────────────────────────────────────────────────────

describe('searchByImage — image preprocessing', () => {
  it('resizes image to 224x224 JPEG before sending', async () => {
    mockHappyPath();
    const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');

    await searchByImage(IMAGE_URI, CATALOG);

    expect(manipulateAsync).toHaveBeenCalledWith(
      IMAGE_URI,
      [{ resize: { width: 224, height: 224 } }],
      { compress: 0.85, format: SaveFormat.JPEG },
    );
  });

  it('reads resized image as base64', async () => {
    mockHappyPath();
    const { readAsStringAsync, EncodingType } = require('expo-file-system');

    await searchByImage(IMAGE_URI, CATALOG);

    expect(readAsStringAsync).toHaveBeenCalledWith(RESIZED_URI, {
      encoding: EncodingType.Base64,
    });
  });

  it('POSTs base64 image data to the embedding endpoint', async () => {
    mockHappyPath();

    await searchByImage(IMAGE_URI, CATALOG);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/visual-search'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining(BASE64_DATA),
      }),
    );
  });
});

// ── Network errors ─────────────────────────────────────────────────────────────

describe('searchByImage — network error', () => {
  it('returns success:false when fetch throws', async () => {
    const { manipulateAsync } = require('expo-image-manipulator');
    const { readAsStringAsync } = require('expo-file-system');
    manipulateAsync.mockResolvedValue({ uri: RESIZED_URI });
    readAsStringAsync.mockResolvedValue(BASE64_DATA);
    mockFetch.mockRejectedValue(new Error('Network request failed'));

    const result = await searchByImage(IMAGE_URI, CATALOG);

    expect(result.success).toBe(false);
    expect(result.matches).toEqual([]);
    expect(result.error).toMatch(/Network request failed/);
  });

  it('returns success:false when response is not ok (5xx)', async () => {
    const { manipulateAsync } = require('expo-image-manipulator');
    const { readAsStringAsync } = require('expo-file-system');
    manipulateAsync.mockResolvedValue({ uri: RESIZED_URI });
    readAsStringAsync.mockResolvedValue(BASE64_DATA);
    mockFetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });

    const result = await searchByImage(IMAGE_URI, CATALOG);

    expect(result.success).toBe(false);
    expect(result.matches).toEqual([]);
    expect(result.error).toMatch(/503/);
  });

  it('returns success:false on timeout', async () => {
    jest.useFakeTimers();
    const { manipulateAsync } = require('expo-image-manipulator');
    const { readAsStringAsync } = require('expo-file-system');
    manipulateAsync.mockResolvedValue({ uri: RESIZED_URI });
    readAsStringAsync.mockResolvedValue(BASE64_DATA);
    mockFetch.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 60_000)));

    const resultPromise = searchByImage(IMAGE_URI, CATALOG, { timeoutMs: 10_000 });
    await jest.advanceTimersByTimeAsync(11_000);
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/timed out/i);
    jest.useRealTimers();
  });
});

// ── Empty results ──────────────────────────────────────────────────────────────

describe('searchByImage — empty results', () => {
  it('returns success:true with empty matches when API returns no results', async () => {
    const { manipulateAsync } = require('expo-image-manipulator');
    const { readAsStringAsync } = require('expo-file-system');
    manipulateAsync.mockResolvedValue({ uri: RESIZED_URI });
    readAsStringAsync.mockResolvedValue(BASE64_DATA);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ matches: [] }),
    });

    const result = await searchByImage(IMAGE_URI, CATALOG);

    expect(result.success).toBe(true);
    expect(result.matches).toEqual([]);
    expect(result.error).toBeUndefined();
  });

  it('skips matches whose productId is not in the catalog', async () => {
    const { manipulateAsync } = require('expo-image-manipulator');
    const { readAsStringAsync } = require('expo-file-system');
    manipulateAsync.mockResolvedValue({ uri: RESIZED_URI });
    readAsStringAsync.mockResolvedValue(BASE64_DATA);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        matches: [
          { productId: 'prod-1', score: 0.9 },
          { productId: 'unknown-xyz', score: 0.85 }, // not in catalog
        ],
      }),
    });

    const result = await searchByImage(IMAGE_URI, CATALOG);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].product.id).toBe('prod-1');
  });
});

// ── Malformed responses ────────────────────────────────────────────────────────

describe('searchByImage — malformed API response', () => {
  it('returns success:false when response body is not valid JSON', async () => {
    const { manipulateAsync } = require('expo-image-manipulator');
    const { readAsStringAsync } = require('expo-file-system');
    manipulateAsync.mockResolvedValue({ uri: RESIZED_URI });
    readAsStringAsync.mockResolvedValue(BASE64_DATA);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });

    const result = await searchByImage(IMAGE_URI, CATALOG);

    expect(result.success).toBe(false);
    expect(result.matches).toEqual([]);
  });

  it('returns success:true with empty matches when matches field is missing', async () => {
    const { manipulateAsync } = require('expo-image-manipulator');
    const { readAsStringAsync } = require('expo-file-system');
    manipulateAsync.mockResolvedValue({ uri: RESIZED_URI });
    readAsStringAsync.mockResolvedValue(BASE64_DATA);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }), // no matches field
    });

    const result = await searchByImage(IMAGE_URI, CATALOG);

    expect(result.success).toBe(true);
    expect(result.matches).toEqual([]);
  });
});

// ── Resize failure ─────────────────────────────────────────────────────────────

describe('searchByImage — resize failure', () => {
  it('returns success:false when image resize fails', async () => {
    const { manipulateAsync } = require('expo-image-manipulator');
    manipulateAsync.mockRejectedValue(new Error('Failed to decode image'));

    const result = await searchByImage(IMAGE_URI, CATALOG);

    expect(result.success).toBe(false);
    expect(result.matches).toEqual([]);
    expect(result.error).toMatch(/Failed to decode image/);
  });

  it('does not call fetch when resize fails', async () => {
    const { manipulateAsync } = require('expo-image-manipulator');
    manipulateAsync.mockRejectedValue(new Error('resize error'));

    await searchByImage(IMAGE_URI, CATALOG);

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ── Cap at 5 results ───────────────────────────────────────────────────────────

describe('searchByImage — result cap', () => {
  it('returns at most 5 matches even if API sends more', async () => {
    const { manipulateAsync } = require('expo-image-manipulator');
    const { readAsStringAsync } = require('expo-file-system');
    manipulateAsync.mockResolvedValue({ uri: RESIZED_URI });
    readAsStringAsync.mockResolvedValue(BASE64_DATA);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        matches: CATALOG.map((p, i) => ({ productId: p.id, score: 1 - i * 0.1 })),
      }),
    });

    const result = await searchByImage(IMAGE_URI, CATALOG);

    expect(result.matches).toHaveLength(5);
  });
});
