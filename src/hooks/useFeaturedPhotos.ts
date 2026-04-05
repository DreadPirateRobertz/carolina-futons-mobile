/**
 * @module useFeaturedPhotos
 *
 * Fetches featured UGC photos from the Wix UGCPhotos collection
 * (status === 'featured'). Used by the Room Gallery to badge and
 * filter featured customer submissions.
 *
 * Returns:
 *   featuredPhotos    — full UGCPhoto objects
 *   featuredPhotoIds  — Set<string> for O(1) badge lookups
 *   isLoading / error — standard async state
 *
 * Gracefully returns empty state when no Wix client is available.
 *
 * @bead hq-s25
 */

import { useState, useEffect } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { captureException } from '@/services/crashReporting';
import type { UGCPhoto } from './useUGCPhotos';

const COLLECTION_ID = 'UGCPhotos';
const FETCH_LIMIT = 100;

export interface UseFeaturedPhotosResult {
  featuredPhotos: UGCPhoto[];
  /** Set of photo IDs with featured status — O(1) badge lookup. */
  featuredPhotoIds: Set<string>;
  isLoading: boolean;
  error: Error | null;
}

export function useFeaturedPhotos(): UseFeaturedPhotosResult {
  const wixClient = useOptionalWixClient();
  const [featuredPhotos, setFeaturedPhotos] = useState<UGCPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      if (!wixClient) {
        if (!cancelled) {
          setFeaturedPhotos([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { items } = await wixClient.queryData<UGCPhoto>(COLLECTION_ID, {
          filter: { status: { $eq: 'featured' } },
          limit: FETCH_LIMIT,
        });

        if (!cancelled) {
          setFeaturedPhotos(items);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const wrapped = err instanceof Error ? err : new Error(String(err));
          setError(wrapped);
          setFeaturedPhotos([]);
          setIsLoading(false);
          captureException(wrapped, 'warning', { action: 'useFeaturedPhotos/fetch' });
        }
      }
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, [wixClient]);

  const featuredPhotoIds = new Set(
    featuredPhotos.map((p) => p.id).filter((id): id is string => Boolean(id)),
  );

  return { featuredPhotos, featuredPhotoIds, isLoading, error };
}
