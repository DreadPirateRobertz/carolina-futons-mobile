/**
 * @module visualSearchEmbedding
 *
 * Visual search by image — deacon-905.
 *
 * Takes a photo URI, resizes it to 224×224 JPEG (standard embedding input),
 * encodes it as base64, and POSTs to the mock embedding endpoint.
 * Returns the top-5 matched CatalogProducts with cosine-similarity scores.
 *
 * Mock endpoint: POST https://api.carolinafutons.com/v1/visual-search
 * Body: { imageBase64: string }
 * Response: { matches: [{ productId: string, score: number }] }
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { captureException } from '@/services/crashReporting';
import type { CatalogProduct } from '@/services/visualSearch';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VisualSearchMatch {
  product: CatalogProduct;
  score: number;
}

export interface VisualSearchResult {
  success: boolean;
  matches: VisualSearchMatch[];
  error?: string;
}

interface ApiMatch {
  productId: string;
  score: number;
}

interface ApiResponse {
  matches?: ApiMatch[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VISUAL_SEARCH_ENDPOINT = 'https://api.carolinafutons.com/v1/visual-search';
const EMBED_SIZE = 224;
const MAX_RESULTS = 5;
const DEFAULT_TIMEOUT_MS = 15_000;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Search the product catalog by image similarity.
 *
 * 1. Resizes imageUri to 224×224 JPEG using expo-image-manipulator.
 * 2. Reads the resized file as base64 via expo-file-system.
 * 3. POSTs to the mock embedding endpoint.
 * 4. Resolves productIds from the local catalog array.
 * 5. Returns the top-5 matches sorted by descending score.
 */
export async function searchByImage(
  imageUri: string,
  catalog: CatalogProduct[],
  options: { timeoutMs?: number } = {},
): Promise<VisualSearchResult> {
  const empty: VisualSearchResult = { success: false, matches: [] };
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // ── Step 1: Resize to 224×224 JPEG ────────────────────────────────────────
  let resizedUri: string;
  try {
    const resized = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: EMBED_SIZE, height: EMBED_SIZE } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
    );
    resizedUri = resized.uri;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureException(error);
    return { ...empty, error: error.message };
  }

  // ── Step 2: Read as base64 ─────────────────────────────────────────────────
  let imageBase64: string;
  try {
    imageBase64 = await FileSystem.readAsStringAsync(resizedUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureException(error);
    return { ...empty, error: error.message };
  }

  // ── Step 3: POST to embedding endpoint with timeout ────────────────────────
  let apiResponse: ApiResponse;
  try {
    const response = await Promise.race([
      fetch(VISUAL_SEARCH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Visual search timed out')), timeoutMs),
      ),
    ]);

    if (!response.ok) {
      return { ...empty, error: `Search endpoint returned ${response.status}` };
    }

    apiResponse = await response.json();
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureException(error);
    return { ...empty, error: error.message };
  }

  // ── Step 4: Resolve product matches from catalog ───────────────────────────
  const rawMatches: ApiMatch[] = Array.isArray(apiResponse.matches) ? apiResponse.matches : [];

  const catalogMap = new Map<string, CatalogProduct>(catalog.map((p) => [p.id, p]));

  const matches: VisualSearchMatch[] = rawMatches
    .filter((m) => catalogMap.has(m.productId))
    .map((m) => ({ product: catalogMap.get(m.productId)!, score: m.score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);

  return { success: true, matches };
}
