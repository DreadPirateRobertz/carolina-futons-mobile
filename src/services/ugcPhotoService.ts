/**
 * @module ugcPhotoService
 *
 * Pure service layer for UGC (User-Generated Content) photo operations — cm-zcs.
 *
 * Handles all Wix UGCPhotos collection interactions:
 *   - submitPhoto: validates caption, calls Wix insertDataItem
 *   - getApprovedPhotos: queries status 'approved' or 'featured' only
 *
 * Separated from the hook so it can be tested independently and reused
 * from non-React contexts (e.g., background sync, cross-rig event handlers).
 *
 * UGCPhotos Wix collection schema:
 *   roomType    — UGCRoomType
 *   productId   — string
 *   photoUrl    — string (upload URI → final Wix Media URL)
 *   caption     — string (max 80 chars)
 *   submittedAt — ISO 8601 string
 *   status      — 'pending' | 'approved' | 'featured' | 'rejected'
 *   voteCount   — number
 *   memberId    — string
 */

import { sanitizeText } from '@/utils/sanitizeText';

export const COLLECTION_ID = 'UGCPhotos';
export const MAX_CAPTION_LENGTH = 80;

export type UGCRoomType = 'living-room' | 'bedroom' | 'office' | 'dorm' | 'porch' | 'other';
export type UGCStatus = 'pending' | 'approved' | 'featured' | 'rejected';

/** Schema for a single UGC photo item. */
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

/** Parameters required to submit a new UGC photo. */
export interface SubmitPhotoParams {
  roomType: UGCRoomType;
  productId: string;
  photoUrl: string;
  caption: string;
  memberId: string;
}

/** Result returned by submitPhoto on success. */
export interface SubmitPhotoResult {
  id: string;
}

/** Minimal Wix data client interface required by this service. */
export interface WixDataClient {
  queryData: <T>(
    collectionId: string,
    options?: { filter?: Record<string, unknown>; limit?: number },
  ) => Promise<{ items: T[]; totalResults: number }>;
  insertDataItem: (
    collectionId: string,
    data: Record<string, unknown>,
  ) => Promise<{ id: string; data: Record<string, unknown> }>;
}

/**
 * Validates caption length (after sanitization). Returns an error string if
 * invalid, or null if valid.
 */
export function validateCaption(caption: string): string | null {
  const sanitized = sanitizeText(caption ?? '');
  if (sanitized.length > MAX_CAPTION_LENGTH) {
    return `Caption must be ${MAX_CAPTION_LENGTH} characters or fewer`;
  }
  return null;
}

/**
 * Submits a new UGC photo to the Wix UGCPhotos collection.
 *
 * Validates caption length and sanitizes for XSS before submitting.
 * Photo goes into 'pending' status for moderation — it will only appear
 * in getApprovedPhotos after a moderator sets status to 'approved' or 'featured'.
 *
 * @throws Error if caption is too long or if the Wix insert fails.
 */
export async function submitPhoto(
  wixClient: WixDataClient,
  params: SubmitPhotoParams,
): Promise<SubmitPhotoResult> {
  const captionError = validateCaption(params.caption);
  if (captionError) {
    throw new Error(captionError);
  }

  const sanitizedCaption = sanitizeText(params.caption ?? '');

  const data: Record<string, unknown> = {
    roomType: params.roomType,
    productId: params.productId,
    photoUrl: params.photoUrl,
    caption: sanitizedCaption,
    submittedAt: new Date().toISOString(),
    status: 'pending',
    voteCount: 0,
    memberId: params.memberId,
  };

  const result = await wixClient.insertDataItem(COLLECTION_ID, data);
  return { id: result.id };
}

/**
 * Fetches only approved and featured UGC photos from the Wix collection.
 *
 * Photos with status 'pending' or 'rejected' are excluded by the server-side
 * query filter — they are never returned to the client.
 *
 * @param roomType  — optional filter by room type
 * @param productId — optional filter by product
 */
export async function getApprovedPhotos(
  wixClient: WixDataClient,
  options: { roomType?: UGCRoomType; productId?: string; limit?: number } = {},
): Promise<UGCPhoto[]> {
  const filter: Record<string, unknown> = {
    status: { $in: ['approved', 'featured'] },
  };

  if (options.roomType) {
    filter.roomType = options.roomType;
  }
  if (options.productId) {
    filter.productId = options.productId;
  }

  const result = await wixClient.queryData<UGCPhoto>(COLLECTION_ID, {
    filter,
    limit: options.limit ?? 50,
  });

  return result.items;
}
