/**
 * @module useRealRoomPhotos
 *
 * Fetches approved real-room photos from the Wix RealRoomPhotos collection
 * for display on RoomGalleryScreen — cm-xnq.
 *
 * MANDATORY: Always filters status=approved. Only approved submissions are
 * ever shown to end users.
 *
 * Schema: imageUrl, city, state, tags (JSON array of shop-this-room hotspots),
 * caption?, memberName?, createdAt, altText?
 *
 * Hotspot shape: { productId, productName, x, y, width, height }
 * (normalized [0,1] coordinates relative to image dimensions)
 *
 * Gracefully returns empty state when no Wix client is available.
 */

import { useState, useEffect, useCallback } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { captureException } from '@/services/crashReporting';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RoomHotspot {
  productId: string;
  productName: string;
  /** Normalized x position [0,1] relative to image width. */
  x: number;
  /** Normalized y position [0,1] relative to image height. */
  y: number;
  /** Normalized width [0,1] relative to image width. */
  width: number;
  /** Normalized height [0,1] relative to image height. */
  height: number;
}

export interface RealRoomPhoto {
  id: string;
  imageUrl: string;
  city: string;
  state: string;
  tags: RoomHotspot[];
  caption?: string;
  memberName?: string;
  altText?: string;
  createdAt: string;
}

export interface UseRealRoomPhotosResult {
  photos: RealRoomPhoto[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLLECTION = 'RealRoomPhotos';
const FETCH_LIMIT = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTags(raw: unknown): RoomHotspot[] {
  if (Array.isArray(raw)) return raw as RoomHotspot[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as RoomHotspot[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapPhoto(item: Record<string, unknown>): RealRoomPhoto {
  return {
    id: (item._id as string) ?? '',
    imageUrl: (item.imageUrl as string) ?? '',
    city: (item.city as string) ?? '',
    state: (item.state as string) ?? '',
    tags: parseTags(item.tags),
    ...(item.caption != null ? { caption: item.caption as string } : {}),
    ...(item.memberName != null ? { memberName: item.memberName as string } : {}),
    ...(item.altText != null ? { altText: item.altText as string } : {}),
    createdAt: (item.createdAt as string) ?? '',
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRealRoomPhotos(): UseRealRoomPhotosResult {
  const wixClient = useOptionalWixClient();
  const [photos, setPhotos] = useState<RealRoomPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      if (!wixClient) {
        if (!cancelled) {
          setPhotos([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { items } = await wixClient.queryData<Record<string, unknown>>(COLLECTION, {
          filter: { status: { $eq: 'approved' } },
          sort: [{ fieldName: 'createdAt', order: 'DESC' }],
          limit: FETCH_LIMIT,
        });

        if (!cancelled) {
          setPhotos(items.map(mapPhoto));
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const wrapped = err instanceof Error ? err : new Error(String(err));
          setError(wrapped);
          setPhotos([]);
          setIsLoading(false);
          captureException(wrapped, 'warning', { action: 'useRealRoomPhotos/fetch' });
        }
      }
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, [wixClient, refreshKey]);

  return { photos, isLoading, error, refresh };
}
