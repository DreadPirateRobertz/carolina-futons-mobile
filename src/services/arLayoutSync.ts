/**
 * @module arLayoutSync
 *
 * Cloud sync for saved AR room layouts via Wix Data (ARLayouts collection).
 * One document per member stores their full layout list.
 *
 * Usage (injectable, for tests):
 *   const svc = new ARLayoutSyncService(client);
 *   await svc.pushLayouts(memberId, layouts);
 *
 * Usage (singleton, for app code):
 *   await pushLayouts(memberId, layouts);
 *   const remote = await pullLayouts(memberId);
 */
import type { WixClient } from './wix/wixClient';
import { getWixClientSingleton } from './wix/wixClientSingleton';

const COLLECTION_ID = 'ARLayouts';

/** Minimal layout shape used for push/pull — mirrors SavedARLayout in useSavedARLayouts. */
export interface SyncableARLayout {
  id: string;
  name: string;
  items: { modelId: string; fabricId: string }[];
  thumbnailUri?: string;
  createdAt: string;
  updatedAt: string;
}

interface ARLayoutDoc {
  memberId: string;
  layouts: SyncableARLayout[];
}

// ── Injectable service (testable) ────────────────────────────────────────────

export class ARLayoutSyncService {
  constructor(private readonly client: WixClient) {}

  /**
   * Upsert the member's full layout list to the ARLayouts collection.
   * Creates a new document on first push; updates the existing one thereafter.
   */
  async pushLayouts(memberId: string, layouts: SyncableARLayout[]): Promise<void> {
    if (!memberId) throw new Error('memberId required');
    await this.client.upsertDataItem(
      COLLECTION_ID,
      { memberId: { $eq: memberId } },
      { memberId, layouts },
    );
  }

  /**
   * Pull the member's layout list from the ARLayouts collection.
   * Returns an empty array if no document exists yet.
   */
  async pullLayouts(memberId: string): Promise<SyncableARLayout[]> {
    if (!memberId) throw new Error('memberId required');
    const result = await this.client.queryData<ARLayoutDoc>(COLLECTION_ID, {
      filter: { memberId: { $eq: memberId } },
      limit: 1,
    });
    if (result.items.length === 0) return [];
    return result.items[0].layouts ?? [];
  }
}

// ── Singleton wrappers (used by useSavedARLayouts) ────────────────────────────

/**
 * Push layouts to the cloud using the app's Wix singleton client.
 * No-ops silently when memberId is empty or Wix is not configured.
 */
export async function pushLayouts(memberId: string, layouts: SyncableARLayout[]): Promise<void> {
  if (!memberId) return;
  const client = getWixClientSingleton();
  if (!client) return;
  await new ARLayoutSyncService(client).pushLayouts(memberId, layouts);
}

/**
 * Pull layouts from the cloud using the app's Wix singleton client.
 * Returns an empty array when memberId is empty or Wix is not configured.
 */
export async function pullLayouts(memberId: string): Promise<SyncableARLayout[]> {
  if (!memberId) return [];
  const client = getWixClientSingleton();
  if (!client) return [];
  return new ARLayoutSyncService(client).pullLayouts(memberId);
}
