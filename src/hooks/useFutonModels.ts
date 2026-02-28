import { useState, useCallback } from 'react';
import { FUTON_MODELS, FABRICS, type FutonModel, type Fabric } from '@/data/futons';

interface UseFutonModelsReturn {
  models: FutonModel[];
  fabrics: Fabric[];
  isLoading: boolean;
  error: Error | null;
  getModel: (modelId: string) => FutonModel | undefined;
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

  const getModel = useCallback(
    (modelId: string): FutonModel | undefined => {
      return FUTON_MODELS.find((m) => m.id === modelId);
    },
    [],
  );

  const getFabric = useCallback(
    (fabricId: string): Fabric | undefined => {
      return FABRICS.find((f) => f.id === fabricId);
    },
    [],
  );

  const refresh = useCallback(() => {
    // No-op for static fallback. Will trigger API refetch when integrated.
  }, []);

  return {
    models: FUTON_MODELS,
    fabrics: FABRICS,
    isLoading,
    error,
    getModel,
    getFabric,
    refresh,
  };
}
