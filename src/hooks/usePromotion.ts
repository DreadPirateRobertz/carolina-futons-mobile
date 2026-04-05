/**
 * @module usePromotion
 *
 * Fetches promotional banner items from Wix CMS "Promotions" collection.
 * Falls back to static LAUNCH_PROMOS when the CMS is unavailable,
 * returns an empty result set, or encounters a network error.
 */

import { useCallback, useMemo } from 'react';
import { useDataCache } from '@/hooks/useDataCache';
import { useOptionalWixClient } from '@/services/wix';
import type { WixClient } from '@/services/wix/wixClient';
import { LAUNCH_PROMOS, type PromoBannerItem } from '@/components/PromoBannerCarousel';

const CMS_COLLECTION_ID = 'Promotions';
const PROMO_CACHE_MAX_AGE = 15 * 60 * 1000; // 15 minutes

interface WixPromoItem {
  _id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  deepLink: string;
  emoji: string;
  accentColor: string;
  active?: boolean;
  sortOrder?: number;
}

function isValidPromoItem(item: Partial<WixPromoItem>): item is WixPromoItem {
  return (
    typeof item._id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.subtitle === 'string' &&
    typeof item.ctaText === 'string' &&
    typeof item.deepLink === 'string' &&
    typeof item.emoji === 'string' &&
    typeof item.accentColor === 'string'
  );
}

function transformPromoItem(item: WixPromoItem): PromoBannerItem {
  return {
    id: item._id,
    title: item.title,
    subtitle: item.subtitle,
    ctaText: item.ctaText,
    deepLink: item.deepLink,
    emoji: item.emoji,
    accentColor: item.accentColor,
  };
}

function createFetcher(client: WixClient | null) {
  return async (): Promise<PromoBannerItem[]> => {
    if (!client) return LAUNCH_PROMOS;

    const result = await client.queryData<WixPromoItem>(CMS_COLLECTION_ID, {
      filter: { active: true },
      sort: [{ fieldName: 'sortOrder', order: 'ASC' }],
      limit: 10,
    });

    const valid = result.items.filter(isValidPromoItem).map(transformPromoItem);
    return valid.length > 0 ? valid : LAUNCH_PROMOS;
  };
}

export function usePromotion(): {
  items: PromoBannerItem[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const client = useOptionalWixClient();
  const fetcher = useCallback(() => createFetcher(client)(), [client]);

  const { data, isLoading, error, refresh } = useDataCache<PromoBannerItem[]>(
    'promotions',
    fetcher,
    { maxAge: PROMO_CACHE_MAX_AGE },
  );

  return useMemo(
    () => ({
      items: data ?? LAUNCH_PROMOS,
      isLoading,
      error,
      refresh,
    }),
    [data, isLoading, error, refresh],
  );
}
