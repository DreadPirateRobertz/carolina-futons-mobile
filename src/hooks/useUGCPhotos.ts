/**
 * @module useUGCPhotos
 *
 * UGC (User-Generated Content) photo hook — cm-ae8.
 *
 * Fetches approved+featured photos for a product from the Wix UGCPhotos collection.
 * Exposes submitPhoto (expo-image-picker + insertDataItem) and votePhoto (updateDataItem)
 * with optimistic UI updates and rollback on failure.
 *
 * Features:
 *   - Approved+featured filter (status $in ['approved','featured'])
 *   - Caption validation (max 80 chars) + XSS sanitization
 *   - Media library permission handling
 *   - Optimistic insert on submit, rollback on error
 *   - Optimistic vote increment, rollback on error
 */
import { useState, useEffect, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useOptionalWixClient } from '@/services/wix';
import { useAuth } from '@/hooks/useAuth';
import { sanitizeText } from '@/utils/sanitizeText';

const COLLECTION_ID = 'UGCPhotos';
const MAX_CAPTION_LENGTH = 80;

export type UGCRoomType = 'living-room' | 'bedroom' | 'office' | 'dorm' | 'porch' | 'other';
export type UGCStatus = 'pending' | 'approved' | 'featured' | 'rejected';

export interface UGCPhoto {
  id?: string;
  roomType: UGCRoomType;
  productId: string;
  photoUrl: string;
  caption: string;
  submittedAt: string;
  status: UGCStatus;
  voteCount: number;
  memberId: string;
}

export interface SubmitPhotoInput {
  roomType: UGCRoomType;
  caption: string;
}

export interface UseUGCPhotosResult {
  photos: UGCPhoto[];
  loading: boolean;
  fetchError: string | null;
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: boolean;
  voteError: string | null;
  submitPhoto: (input: SubmitPhotoInput) => Promise<void>;
  votePhoto: (photoId: string) => Promise<void>;
  clearSubmitStatus: () => void;
}

export function useUGCPhotos(productId: string): UseUGCPhotosResult {
  const wixClient = useOptionalWixClient() as {
    queryData: <T>(
      collectionId: string,
      options?: { filter?: Record<string, unknown>; limit?: number },
    ) => Promise<{ items: T[]; totalResults: number }>;
    insertDataItem: (
      collectionId: string,
      data: Record<string, unknown>,
    ) => Promise<{ id: string; data: Record<string, unknown> }>;
    updateDataItem: (
      collectionId: string,
      itemId: string,
      data: Record<string, unknown>,
    ) => Promise<{ id: string; data: Record<string, unknown> }>;
  } | null;

  const { user } = useAuth();

  const [photos, setPhotos] = useState<UGCPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    if (!wixClient) {
      setFetchError('Photo gallery service unavailable');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result = await wixClient.queryData<UGCPhoto>(COLLECTION_ID, {
          filter: {
            productId,
            status: { $in: ['approved', 'featured'] },
          },
          limit: 50,
        });
        if (!cancelled) {
          setPhotos(result.items);
          setFetchError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : 'Failed to load photos');
          console.warn('[useUGCPhotos] fetch failed:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, wixClient]);

  const submitPhoto = useCallback(
    async (input: SubmitPhotoInput) => {
      // Request permission
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) {
        setSubmitError('Photo library permission is required to share photos');
        return;
      }

      // Launch picker
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (pickerResult.canceled || !pickerResult.assets?.length) {
        return;
      }

      const photoUri = pickerResult.assets[0].uri;

      // Validate caption
      const sanitized = sanitizeText(input.caption ?? '');
      if (sanitized.length > MAX_CAPTION_LENGTH) {
        setSubmitError(`Caption must be ${MAX_CAPTION_LENGTH} characters or fewer`);
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      const newPhoto: UGCPhoto = {
        roomType: input.roomType,
        productId,
        photoUrl: photoUri,
        caption: sanitized,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        voteCount: 0,
        memberId: user?.id ?? 'anonymous',
      };

      // Optimistic insert
      setPhotos((prev) => [newPhoto, ...prev]);

      try {
        if (!wixClient) throw new Error('Photo gallery service unavailable');
        await wixClient.insertDataItem(COLLECTION_ID, {
          roomType: newPhoto.roomType,
          productId,
          photoUrl: photoUri,
          caption: sanitized,
          submittedAt: newPhoto.submittedAt,
          status: 'pending',
          voteCount: 0,
          memberId: newPhoto.memberId,
        });
        setSubmitSuccess(true);
      } catch (err) {
        // Rollback optimistic insert
        setPhotos((prev) => prev.filter((p) => p !== newPhoto));
        setSubmitError(err instanceof Error ? err.message : 'Failed to submit photo');
        console.warn('[useUGCPhotos] submit failed:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [productId, user, wixClient],
  );

  const votePhoto = useCallback(
    async (photoId: string) => {
      if (!wixClient) return;

      const photo = photos.find((p) => p.id === photoId);
      if (!photo) return;

      const prevVoteCount = photo.voteCount;
      const newVoteCount = prevVoteCount + 1;

      // Optimistic update
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, voteCount: newVoteCount } : p)),
      );
      setVoteError(null);

      try {
        await wixClient.updateDataItem(COLLECTION_ID, photoId, { voteCount: newVoteCount });
      } catch (err) {
        // Rollback
        setPhotos((prev) =>
          prev.map((p) => (p.id === photoId ? { ...p, voteCount: prevVoteCount } : p)),
        );
        setVoteError(err instanceof Error ? err.message : 'Could not record vote');
        console.warn('[useUGCPhotos] vote failed:', err);
      }
    },
    [photos, wixClient],
  );

  const clearSubmitStatus = useCallback(() => {
    setSubmitError(null);
    setSubmitSuccess(false);
  }, []);

  return {
    photos,
    loading,
    fetchError,
    isSubmitting,
    submitError,
    submitSuccess,
    voteError,
    submitPhoto,
    votePhoto,
    clearSubmitStatus,
  };
}
