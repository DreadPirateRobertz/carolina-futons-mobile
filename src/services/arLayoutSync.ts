/**
 * @module arLayoutSync
 *
 * Cloud sync for saved AR room layouts via the Wix ARLayouts collection.
 *
 * Collection: ARLayouts
 * Schema: { memberId (Text, indexed), layouts (Text/JSON), updatedAt (DateTime) }
 *
 * One document per member — all layouts serialised as a JSON array in the
 * `layouts` field.  Push writes the entire array; pull reads it back.
 */

import type { WixClient } from '@/services/wix/wixClient';

/** Minimal layout shape used for push/pull — mirrors SavedARLayout in useSavedARLayouts. */
export interface SyncableARLayout {
  id: string;
  name: string;
  items: { modelId: string; fabricId: string }[];
  thumbnailUri?: string;
  createdAt: string;
  updatedAt: string;
}

const COLLECTION = 'ARLayouts';

/**
 * Push the user's layouts to the ARLayouts Wix collection.
 * Upserts a single document keyed by memberId — overwrites any prior value.
 *
 * @throws {WixApiError | Error} on network or Wix API failure (caller handles)
 */
export async function pushLayouts(
  wixClient: WixClient,
  memberId: string,
  layouts: SyncableARLayout[],
): Promise<void> {
  const data: Record<string, unknown> = {
    memberId,
    layouts: JSON.stringify(layouts),
    updatedAt: new Date().toISOString(),
  };

  await wixClient.upsertDataItem(COLLECTION, { memberId: { $eq: memberId } }, data);
}

/**
 * Pull layouts from the ARLayouts Wix collection for the given member.
 * Returns an empty array when no cloud record exists or the payload is corrupt.
 *
 * @throws {WixApiError | Error} on network or Wix API failure (caller handles)
 */
export async function pullLayouts(
  wixClient: WixClient,
  memberId: string,
): Promise<SyncableARLayout[]> {
  const result = await wixClient.queryData<Record<string, unknown>>(COLLECTION, {
    filter: { memberId: { $eq: memberId } },
    limit: 1,
  });

  if (result.items.length === 0) return [];

  const raw = result.items[0].layouts;
  if (typeof raw !== 'string' || raw === '') return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SyncableARLayout[];
  } catch {
    // [arLayoutSync] corrupt layouts JSON — treat as empty
    return [];
  }
}
