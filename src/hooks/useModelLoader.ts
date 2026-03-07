/**
 * @module useModelLoader
 *
 * React hook wrapping the modelLoader service. Tracks download status
 * (idle, checking-cache, downloading with progress, ready, error) so
 * the AR screen can render a progress bar during model fetch.
 */

import { useState, useCallback, useRef } from 'react';
import {
  loadModelForProduct,
  prefetchModel,
  type ModelLoadStatus,
} from '@/services/modelLoader';
import type { ProductId } from '@/data/productId';

export function useModelLoader() {
  const [status, setStatus] = useState<ModelLoadStatus>({ state: 'idle' });
  const abortRef = useRef(false);

  const load = useCallback(async (productId: ProductId): Promise<string | null> => {
    abortRef.current = false;
    setStatus({ state: 'checking-cache' });

    const uri = await loadModelForProduct(productId, (s) => {
      if (!abortRef.current) setStatus(s);
    });

    return uri;
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    setStatus({ state: 'idle' });
  }, []);

  return { status, load, reset, prefetch: prefetchModel };
}
