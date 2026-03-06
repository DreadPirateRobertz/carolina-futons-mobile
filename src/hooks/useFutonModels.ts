/**
 * @module useFutonModels
 *
 * Provides futon model and fabric data for AR (Augmented Reality) room preview
 * and cart configuration. Static fallback today; the interface is shaped for a
 * seamless swap to the Wix Stores API when the backend is ready.
 */
import { useState, useCallback, useMemo } from 'react';
import { FUTON_MODELS, FABRICS, type FutonModel, type Fabric } from '@/data/futons';
import { PRODUCTS, type Product } from '@/data/products';

// Re-export types for screens — avoids direct src/data imports
export type { FutonModel, Fabric };

interface UseFutonModelsReturn {
  models: FutonModel[];
  fabrics: Fabric[];
  isLoading: boolean;
  error: Error | null;
  getModel: (modelId: string) => FutonModel | undefined;
  getModelById: (modelId: string) => FutonModel | undefined;
  getFabric: (fabricId: string) => Fabric | undefined;
  refresh: () => void;
}

/**
 * Fetch futon models and fabrics for AR/cart features.
 *
 * Currently falls back to static FUTON_MODELS/FABRICS.
 * When WixProvider is available, will fetch from Wix Stores API.
 */
export function useFutonModels(): UseFutonModelsReturn {
  const [isLoading] = useState(false);
  const [error] = useState<Error | null>(null);

  const getModel = useCallback((modelId: string): FutonModel | undefined => {
    return FUTON_MODELS.find((m) => m.id === modelId);
  }, []);

  const getFabric = useCallback((fabricId: string): Fabric | undefined => {
    return FABRICS.find((f) => f.id === fabricId);
  }, []);

  const refresh = useCallback(() => {
    // No-op for static fallback. Will trigger API refetch when integrated.
  }, []);

  return {
    models: FUTON_MODELS,
    fabrics: FABRICS,
    isLoading,
    error,
    getModel,
    getModelById: getModel,
    getFabric,
    refresh,
  };
}

interface UseProductByModelIdReturn {
  product: Product | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Looks up the Product matching a futon model ID.
 * Convention: product ID = `prod-${modelId}`.
 */
export function useProductByModelId(modelId: string | undefined): UseProductByModelIdReturn {
  const product = useMemo(() => {
    if (!modelId) return null;
    return PRODUCTS.find((p) => p.id === `prod-${modelId}`) ?? null;
  }, [modelId]);

  return { product, isLoading: false, error: null };
}
