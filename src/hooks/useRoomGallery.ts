/**
 * @module useRoomGallery
 *
 * Fetches approved customer room photos from the Wix Data `RealRoomPhotos`
 * CMS collection (status=approved). Each item includes member attribution,
 * product hotspot tags with positional data, caption, and location.
 *
 * Tags (hotspots) contain productId, productName, and x/y/width/height
 * as fractional values (0–1) for overlay positioning.
 *
 * Falls back gracefully when no Wix client is available (unauthenticated).
 */
import { useState, useCallback, useEffect } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { parseWixImageUrl } from '@/utils/parseWixImageUrl';

export interface RoomPhotoTag {
  productId: string;
  productName: string;
  /** Fractional horizontal position (0–1) of hotspot center */
  x: number;
  /** Fractional vertical position (0–1) of hotspot center */
  y: number;
  /** Fractional width of hotspot bounding box (0–1) */
  width: number;
  /** Fractional height of hotspot bounding box (0–1) */
  height: number;
}

export interface RoomGalleryItem {
  roomId: string;
  imageUrl: string;
  /** Derived from tags[].productId for filter compatibility */
  productIds: string[];
  /** Mapped from caption for filter/display compatibility */
  roomStyle: string;
  /** Mapped from createdAt */
  createdDate: string;
  featured?: boolean;
  memberName: string;
  city: string;
  state: string;
  caption: string;
  slug: string;
  altText: string;
  tags: RoomPhotoTag[];
  pointsAwarded?: number;
}

interface RawRoomPhotoData {
  memberId?: string;
  memberName?: string;
  imageUrl?: string;
  city?: string;
  state?: string;
  tags?: string | RoomPhotoTag[];
  caption?: string;
  slug?: string;
  status?: string;
  pointsAwarded?: number;
  createdAt?: string;
  altText?: string;
}

interface UseRoomGalleryReturn {
  rooms: RoomGalleryItem[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
  /** True when rooms are placeholder stand-ins, not real customer submissions. */
  isPlaceholder: boolean;
}

const COLLECTION_ID = 'RealRoomPhotos';
const FETCH_LIMIT = 50;

/**
 * Placeholder room photos shown while the RealRoomPhotos CMS collection is
 * being populated with real CF customer submissions.
 *
 * PLACEHOLDER: These are stand-in lifestyle images — replace with actual
 *   CF customer room photos once available.
 * TODO(stilgar): Wire real Wix Media URLs here once content is curated.
 */
export const PLACEHOLDER_ROOMS: RoomGalleryItem[] = [
  {
    roomId: 'placeholder-001',
    imageUrl: 'https://via.placeholder.com/400x300/F5E6CC/8B6F47?text=Modern+Living',
    productIds: ['asheville-full'],
    roomStyle: 'Modern Living Room',
    createdDate: '2026-01-01T00:00:00Z',
    memberName: 'Carolina Futons',
    city: 'Charlotte',
    state: 'NC',
    caption: 'Modern Living Room',
    slug: 'placeholder-001',
    altText: 'Modern living room with Carolina Futons furniture',
    tags: [{ productId: 'asheville-full', productName: 'Asheville Full', x: 0.5, y: 0.5, width: 0.1, height: 0.1 }],
  },
  {
    roomId: 'placeholder-002',
    imageUrl: 'https://via.placeholder.com/400x300/D4E8EE/4A7C8E?text=Coastal+Living',
    productIds: ['biltmore-queen'],
    roomStyle: 'Coastal Retreat',
    createdDate: '2026-01-02T00:00:00Z',
    memberName: 'Carolina Futons',
    city: 'Wilmington',
    state: 'NC',
    caption: 'Coastal Retreat',
    slug: 'placeholder-002',
    altText: 'Coastal living room with Biltmore Queen futon',
    tags: [{ productId: 'biltmore-queen', productName: 'Biltmore Queen', x: 0.5, y: 0.5, width: 0.1, height: 0.1 }],
  },
  {
    roomId: 'placeholder-003',
    imageUrl: 'https://via.placeholder.com/400x300/E8D5C4/7A5C42?text=Rustic+Living',
    productIds: ['blue-ridge-full'],
    roomStyle: 'Rustic Mountain Style',
    createdDate: '2026-01-03T00:00:00Z',
    memberName: 'Carolina Futons',
    city: 'Asheville',
    state: 'NC',
    caption: 'Rustic Mountain Style',
    slug: 'placeholder-003',
    altText: 'Rustic living room with Blue Ridge Full futon',
    tags: [{ productId: 'blue-ridge-full', productName: 'Blue Ridge Full', x: 0.5, y: 0.5, width: 0.1, height: 0.1 }],
  },
  {
    roomId: 'placeholder-004',
    imageUrl: 'https://via.placeholder.com/400x300/EEEEEE/888888?text=Minimal+Living',
    productIds: ['asheville-full'],
    roomStyle: 'Minimal & Clean',
    createdDate: '2026-01-04T00:00:00Z',
    memberName: 'Carolina Futons',
    city: 'Durham',
    state: 'NC',
    caption: 'Minimal & Clean',
    slug: 'placeholder-004',
    altText: 'Minimalist living room with Asheville Full futon',
    tags: [{ productId: 'asheville-full', productName: 'Asheville Full', x: 0.5, y: 0.5, width: 0.1, height: 0.1 }],
  },
];

function parseTags(raw: string | RoomPhotoTag[] | undefined): RoomPhotoTag[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function transformRoom(raw: RawRoomPhotoData): RoomGalleryItem | null {
  const resolvedUrl = raw.imageUrl ? parseWixImageUrl(raw.imageUrl) : null;
  if (!resolvedUrl) return null;

  const tags = parseTags(raw.tags);
  const productIds = tags.map((t) => t.productId);
  const caption = raw.caption ?? '';

  return {
    roomId: raw.slug ?? '',
    imageUrl: resolvedUrl,
    productIds,
    roomStyle: caption,
    createdDate: raw.createdAt ?? '',
    featured: false,
    memberName: raw.memberName ?? '',
    city: raw.city ?? '',
    state: raw.state ?? '',
    caption,
    slug: raw.slug ?? '',
    altText: raw.altText ?? '',
    tags,
    pointsAwarded: raw.pointsAwarded,
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
        const { items } = await wixClient.queryData<RawRoomPhotoData>(COLLECTION_ID, {
          limit: FETCH_LIMIT,
          filter: { status: { $eq: 'approved' } },
          sort: [{ fieldName: 'createdAt', order: 'DESC' }],
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
