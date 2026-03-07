import type { WixClient } from './wix/wixClient';
import type { WishlistItem } from '@/hooks/useWishlist';
import type { QueuedAction } from './offlineQueue';

const COLLECTION_ID = 'user_wishlists';

interface WishlistDocument {
  userId: string;
  items: WishlistItem[];
  _serverUpdatedAt?: number;
}

interface SyncState {
  items: WishlistItem[];
  serverTimestamp: number;
}

interface ConflictResult {
  source: 'local' | 'server';
  items: WishlistItem[];
}

export class WishlistSyncService {
  constructor(private readonly client: WixClient) {}

  async pullWishlist(userId: string): Promise<SyncState | null> {
    const result = await this.client.queryData<WishlistDocument>(COLLECTION_ID, {
      filter: { userId: { $eq: userId } },
      limit: 1,
    });

    if (result.items.length === 0) return null;

    const doc = result.items[0];
    return {
      items: doc.items ?? [],
      serverTimestamp: doc._serverUpdatedAt ?? 0,
    };
  }

  async pushWishlist(userId: string, items: WishlistItem[]): Promise<number> {
    const result = await this.client.upsertDataItem(
      COLLECTION_ID,
      { userId: { $eq: userId } },
      { userId, items },
    );

    return result._updatedDate
      ? new Date(result._updatedDate).getTime()
      : Date.now();
  }

  resolveConflict(local: SyncState, server: SyncState): ConflictResult {
    if (server.serverTimestamp > local.serverTimestamp) {
      return { source: 'server', items: server.items };
    }
    return { source: 'local', items: local.items };
  }

  async replayActions(userId: string, actions: QueuedAction[]): Promise<number> {
    if (actions.length === 0) return 0;

    const lastAction = actions[actions.length - 1];
    const items = (lastAction.payload.items as WishlistItem[]) ?? [];

    return this.pushWishlist(userId, items);
  }
}
