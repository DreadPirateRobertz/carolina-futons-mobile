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
}

const COLLECTION_ID = 'roomGallery';
const FETCH_LIMIT = 50;

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
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setIsLoading(true);
      setError(null);

      if (!wixClient) {
        if (!cancelled) {
          setRooms([]);
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
          setRooms(sortByDate(transformed));
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setRooms([]);
          setIsLoading(false);
        }
      }
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, [wixClient, refreshKey]);

  return { rooms, isLoading, error, refresh };
}
