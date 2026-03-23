/**
 * @module useProductResources
 *
 * Fetches product resources (spec sheets, care guides, videos, assembly guides)
 * from the Wix getProductResources webMethod.
 *
 * CMS collection: ProductResources (created by miquella, CF-wh4 PR #722)
 * Fields: productId, resourceType, label, url, sortOrder
 *
 * cm-z4amm
 */

import { useState, useEffect } from 'react';
import { useOptionalWixClient } from '@/services/wix';

export type ResourceType =
  | 'SPEC_SHEET'
  | 'CARE_GUIDE'
  | 'WARRANTY'
  | 'VIDEO'
  | 'POLICY_LINK'
  | 'ASSEMBLY_GUIDE';

const RESOURCE_ICONS: Record<ResourceType, string> = {
  SPEC_SHEET: '📋',
  CARE_GUIDE: '🧹',
  WARRANTY: '🛡️',
  VIDEO: '🎬',
  POLICY_LINK: '📄',
  ASSEMBLY_GUIDE: '🔧',
};

export interface ProductResource {
  productId: string;
  resourceType: ResourceType;
  label: string;
  url: string;
  sortOrder: number;
  icon: string;
}

interface ApiResource {
  productId: string;
  resourceType: string;
  label: string;
  url: string;
  sortOrder: number;
}

export interface UseProductResourcesResult {
  resources: ProductResource[];
  loading: boolean;
  error: Error | null;
}

function mapResource(api: ApiResource): ProductResource {
  const type = api.resourceType as ResourceType;
  return {
    productId: api.productId,
    resourceType: type,
    label: api.label,
    url: api.url,
    sortOrder: api.sortOrder,
    icon: RESOURCE_ICONS[type] ?? '📄',
  };
}

export function useProductResources(productId: string): UseProductResourcesResult {
  const wixClient = useOptionalWixClient();
  const [resources, setResources] = useState<ProductResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!productId) {
      setResources([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (!wixClient) {
      setResources([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    wixClient
      .callFunction<{ resources: ApiResource[] | null }>(
        '/_functions/getProductResources',
        'POST',
        { productId },
      )
      .then((res) => {
        if (cancelled) return;
        const items = Array.isArray(res?.resources) ? res.resources : [];
        setResources(items.map(mapResource).sort((a, b) => a.sortOrder - b.sortOrder));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error('Failed to fetch resources'));
        setResources([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [wixClient, productId]);

  return { resources, loading, error };
}
