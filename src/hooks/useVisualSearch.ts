/**
 * useVisualSearch — photo-to-product matching hook.
 *
 * State machine: idle → loading → success | error
 * Launches expo-image-picker (EXIF stripped), POSTs base64 to Wix backend,
 * then scores PRODUCTS locally against returned attributes.
 */
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { PRODUCTS, type Product } from '@/data/products';

export type VisualSearchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface VisualSearchQuery {
  category: string;
  style: string;
  colorFamily: string;
  keywords: string[];
  matchType: 'scored' | 'fallback';
}

export interface UseVisualSearchReturn {
  status: VisualSearchStatus;
  results: Product[];
  query: VisualSearchQuery | null;
  error: string | null;
  trigger: (opts?: { useCamera?: boolean }) => Promise<void>;
  reset: () => void;
}

/** Score a product against AI-returned attributes. Higher = better match. */
function scoreProduct(
  product: Product,
  category: string,
  colorFamily: string,
  style: string,
  keywords: string[],
): number {
  let score = 0;
  if (product.category === category) score += 3;
  if (product.colorFamily && product.colorFamily === colorFamily) score += 2;
  const text = `${product.name} ${product.description}`.toLowerCase();
  for (const kw of keywords) {
    if (kw && text.includes(kw.toLowerCase())) score += 1;
  }
  if (style && product.tags?.includes(style)) score += 1;
  return score;
}

export function useVisualSearch(): UseVisualSearchReturn {
  const [status, setStatus] = useState<VisualSearchStatus>('idle');
  const [results, setResults] = useState<Product[]>([]);
  const [query, setQuery] = useState<VisualSearchQuery | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wixClient = useOptionalWixClient();

  const trigger = useCallback(async (opts?: { useCamera?: boolean }) => {
    // Launch picker with EXIF stripped (security requirement)
    const launcher = opts?.useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const picked = await launcher({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      exif: false,
      quality: 0.7,
    });

    if (picked.canceled || !picked.assets?.[0]?.base64) {
      return; // user cancelled — stay idle
    }

    if (!wixClient) {
      setStatus('error');
      setError('Wix client unavailable — visual search requires a connected session');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const attrs = await wixClient.callVisualSearch(picked.assets[0].base64);
      const { category, style, colorFamily, keywords } = attrs;

      // Score all products locally — no additional network call
      const scored = PRODUCTS.map((p) => ({
        product: p,
        score: scoreProduct(p, category, colorFamily, style, keywords ?? []),
      }));

      const hasScored = scored.some((s) => s.score >= 1);
      let finalResults: Product[];
      const matchType: 'scored' | 'fallback' = hasScored ? 'scored' : 'fallback';

      if (hasScored) {
        finalResults = scored
          .filter((s) => s.score >= 1)
          .sort((a, b) => b.score - a.score)
          .slice(0, 6)
          .map((s) => s.product);
      } else {
        // Fallback: top 3 by rating, same-category preferred
        finalResults = [...PRODUCTS]
          .sort((a, b) => {
            const catBoost =
              (a.category === category ? 1 : 0) - (b.category === category ? 1 : 0);
            return catBoost !== 0 ? -catBoost : b.rating - a.rating;
          })
          .slice(0, 3);
      }

      setResults(finalResults);
      setQuery({ category, style, colorFamily, keywords: keywords ?? [], matchType });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Visual search failed');
    }
  }, [wixClient]);

  const reset = useCallback(() => {
    setStatus('idle');
    setResults([]);
    setQuery(null);
    setError(null);
  }, []);

  return { status, results, query, error, trigger, reset };
}
