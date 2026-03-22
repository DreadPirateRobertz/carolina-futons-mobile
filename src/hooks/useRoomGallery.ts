/**
 * @module useRoomGallery
 *
 * Fetches customer room gallery entries from the Wix Data `roomGallery`
 * collection. Each item contains a room photo, associated product IDs, and
 * a room style label. The hook resolves `wix:image://` media references to
 * HTTPS CDN URLs and filters out items with invalid images or no products.
 *
 * Falls back gracefully when no Wix client is available (unauthenticated).
 */
import { useState, useCallback, useEffect } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { parseWixImageUrl } from '@/utils/parseWixImageUrl';

export interface RoomGalleryItem {
  roomId: string;
  imageUrl: string;
  productIds: string[];
  roomStyle: string;
  createdDate: string;
}

interface RawRoomData {
  roomId?: string;
  imageUrl?: string;
  productIds?: string[];
  roomStyle?: string;
  createdDate?: string;
}

interface UseRoomGalleryReturn {
  rooms: RoomGalleryItem[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
  /** True when rooms are placeholder stand-ins, not real customer submissions. */
  isPlaceholder: boolean;
}

const COLLECTION_ID = 'roomGallery';
const FETCH_LIMIT = 50;

/**
 * Placeholder room photos shown while the Wix Media Manager collection is
 * being curated with real CF customer submissions.
 *
 * PLACEHOLDER: These are stand-in lifestyle images — replace with actual
 *   CF customer room photos once available.
 * TODO(stilgar): Wire real Wix Media URLs here once content is curated.
 * SOURCE: Will come from Wix Media Manager post-purchase upload collection.
 */
export const PLACEHOLDER_ROOMS: RoomGalleryItem[] = [
  {
    roomId: 'placeholder-001',
    // PLACEHOLDER: Warm neutral solid — replace with actual CF customer room photo
    // TODO(stilgar): Wire real Wix Media URL here once content is curated
    imageUrl: 'https://via.placeholder.com/400x300/F5E6CC/8B6F47?text=Modern+Living',
    productIds: ['asheville-full'],
    roomStyle: 'Modern',
    createdDate: '2026-01-01T00:00:00Z',
  },
  {
    roomId: 'placeholder-002',
    // PLACEHOLDER: Cool coastal solid — replace with actual CF customer room photo
    // TODO(stilgar): Wire real Wix Media URL here once content is curated
    imageUrl: 'https://via.placeholder.com/400x300/D4E8EE/4A7C8E?text=Coastal+Living',
    productIds: ['biltmore-queen'],
    roomStyle: 'Coastal',
    createdDate: '2026-01-02T00:00:00Z',
  },
  {
    roomId: 'placeholder-003',
    // PLACEHOLDER: Earthy rustic solid — replace with actual CF customer room photo
    // TODO(stilgar): Wire real Wix Media URL here once content is curated
    imageUrl: 'https://via.placeholder.com/400x300/E8D5C4/7A5C42?text=Rustic+Living',
    productIds: ['blue-ridge-full'],
    roomStyle: 'Rustic',
    createdDate: '2026-01-03T00:00:00Z',
  },
  {
    roomId: 'placeholder-004',
    // PLACEHOLDER: Soft minimal solid — replace with actual CF customer room photo
    // TODO(stilgar): Wire real Wix Media URL here once content is curated
    imageUrl: 'https://via.placeholder.com/400x300/EEEEEE/888888?text=Minimal+Living',
    productIds: ['asheville-full'],
    roomStyle: 'Minimal',
    createdDate: '2026-01-04T00:00:00Z',
  },
];

function transformRoom(raw: RawRoomData): RoomGalleryItem | null {
  const resolvedUrl = raw.imageUrl ? parseWixImageUrl(raw.imageUrl) : null;
  if (!resolvedUrl) return null;
  if (!raw.productIds?.length) return null;

  return {
    roomId: raw.roomId ?? '',
    imageUrl: resolvedUrl,
    productIds: raw.productIds,
    roomStyle: raw.roomStyle ?? '',
    createdDate: raw.createdDate ?? '',
  };
}

function sortByDate(rooms: RoomGalleryItem[]): RoomGalleryItem[] {
  return [...rooms].sort(
    (a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime(),
  );
}

export function useRoomGallery(): UseRoomGalleryReturn {
  const wixClient = useOptionalWixClient();
  const [rooms, setRooms] = useState<RoomGalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setIsLoading(true);
      setError(null);
      setIsPlaceholder(false);

      if (!wixClient) {
        if (!cancelled) {
          setRooms(PLACEHOLDER_ROOMS);
          setIsPlaceholder(true);
          setIsLoading(false);
        }
        return;
      }

      try {
        const { items } = await wixClient.queryData<RawRoomData>(COLLECTION_ID, {
          limit: FETCH_LIMIT,
          sort: [{ fieldName: 'createdDate', order: 'DESC' }],
        });

        if (!cancelled) {
          const transformed = items
            .map(transformRoom)
            .filter((r): r is RoomGalleryItem => r !== null);
          if (transformed.length === 0) {
            setRooms(PLACEHOLDER_ROOMS);
            setIsPlaceholder(true);
          } else {
            setRooms(sortByDate(transformed));
            setIsPlaceholder(false);
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setRooms([]);
          setIsPlaceholder(false);
          setIsLoading(false);
        }
      }
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, [wixClient, refreshKey]);

  return { rooms, isLoading, error, refresh, isPlaceholder };
}
