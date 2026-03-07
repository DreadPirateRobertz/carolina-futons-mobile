import type { WixClient } from './wix/wixClient';
import type { CartItem } from '@/hooks/useCart';
import type { QueuedAction } from './offlineQueue';

const COLLECTION_ID = 'user_carts';

interface CartDocument {
  userId: string;
  items: CartItem[];
  _serverUpdatedAt?: number;
}

interface SyncState {
  items: CartItem[];
  serverTimestamp: number;
}

interface ConflictResult {
  source: 'local' | 'server';
  items: CartItem[];
}

export class CartSyncService {
  constructor(private readonly client: WixClient) {}

  async pullCart(userId: string): Promise<SyncState | null> {
    const result = await this.client.queryData<CartDocument>(COLLECTION_ID, {
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

  async pushCart(userId: string, items: CartItem[]): Promise<number> {
    const result = await this.client.upsertDataItem(
      COLLECTION_ID,
      { userId: { $eq: userId } },
      { userId, items },
    );

    // Return server timestamp from Wix _updatedDate metadata
    return result._updatedDate
      ? new Date(result._updatedDate).getTime()
      : Date.now(); // fallback only if server doesn't return timestamp
  }

  resolveConflict(local: SyncState, server: SyncState): ConflictResult {
    if (server.serverTimestamp > local.serverTimestamp) {
      return { source: 'server', items: server.items };
    }
    return { source: 'local', items: local.items };
  }

  async replayActions(userId: string, actions: QueuedAction[]): Promise<number> {
    if (actions.length === 0) return 0;

    // Coalesce: use the last action's snapshot (most recent state)
    const lastAction = actions[actions.length - 1];
    const items = (lastAction.payload.items as CartItem[]) ?? [];

    return this.pushCart(userId, items);
  }
}
