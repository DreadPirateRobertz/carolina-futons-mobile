import type { WixClient } from './wix/wixClient';

const COLLECTION_ID = 'CartSessions';

export interface CartSessionItem {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface CartSession {
  sessionToken: string;
  memberId: string | null;
  items: CartSessionItem[];
  lastUpdated: number;
  mergedAt: number | null;
}

interface CartSessionDoc {
  sessionToken: string;
  memberId: string | null;
  items: unknown[];
  lastUpdated: number;
  mergedAt: number | null;
  _serverUpdatedAt?: number;
}

function isValidItem(item: unknown): item is CartSessionItem {
  if (item == null || typeof item !== 'object') return false;
  const o = item as Record<string, unknown>;
  return (
    typeof o.productId === 'string' &&
    o.productId.length > 0 &&
    typeof o.variantId === 'string' &&
    typeof o.quantity === 'number' &&
    o.quantity > 0 &&
    o.quantity <= 10
  );
}

function sanitizeItems(raw: unknown[]): CartSessionItem[] {
  return raw.filter(isValidItem);
}

export class CartSessionService {
  constructor(private readonly client: WixClient) {}

  async loadGuestSession(sessionToken: string): Promise<CartSession | null> {
    if (!sessionToken) return null;

    const result = await this.client.queryData<CartSessionDoc>(COLLECTION_ID, {
      filter: { sessionToken: { $eq: sessionToken } },
      limit: 1,
    });

    if (result.items.length === 0) return null;

    return this._docToSession(result.items[0]);
  }

  async loadMemberSession(memberId: string): Promise<CartSession | null> {
    if (!memberId) return null;

    const result = await this.client.queryData<CartSessionDoc>(COLLECTION_ID, {
      filter: { memberId: { $eq: memberId } },
      limit: 10,
    });

    if (result.items.length === 0) return null;

    // Pick the most recently updated when multiple sessions exist
    const sorted = result.items
      .map((doc) => this._docToSession(doc))
      .sort((a, b) => b.lastUpdated - a.lastUpdated);

    return sorted[0];
  }

  async saveSession(
    sessionToken: string,
    memberId: string | null,
    items: CartSessionItem[],
    mergedAt: number | null = null,
  ): Promise<number> {
    const now = Date.now();
    const data: Record<string, unknown> = {
      sessionToken,
      memberId,
      items,
      lastUpdated: now,
      mergedAt,
    };

    const result = await this.client.upsertDataItem(
      COLLECTION_ID,
      { sessionToken: { $eq: sessionToken } },
      data,
    );

    return result._updatedDate ? new Date(result._updatedDate).getTime() : now;
  }

  async mergeOnLogin(sessionToken: string, memberId: string): Promise<CartSession> {
    if (!sessionToken) throw new Error('sessionToken is required');
    if (!memberId) throw new Error('memberId is required');

    const [guestSession, memberSession] = await Promise.all([
      this.loadGuestSession(sessionToken),
      this.loadMemberSession(memberId),
    ]);

    const guestItems = guestSession?.items ?? [];
    const memberItems = memberSession?.items ?? [];
    const guestTs = guestSession?.lastUpdated ?? 0;
    const memberTs = memberSession?.lastUpdated ?? 0;

    const merged = CartSessionService.unionItems(guestItems, memberItems, guestTs, memberTs);
    const mergedAt = Date.now();

    await this.saveSession(sessionToken, memberId, merged, mergedAt);

    return {
      sessionToken,
      memberId,
      items: merged,
      lastUpdated: mergedAt,
      mergedAt,
    };
  }

  /**
   * Union two item lists. For duplicate productId+variantId, the item from
   * the list with the newer timestamp wins (last-write-wins quantity).
   * On tie, `a` wins.
   */
  static unionItems(
    a: CartSessionItem[],
    b: CartSessionItem[],
    aTimestamp: number,
    bTimestamp: number,
  ): CartSessionItem[] {
    const map = new Map<string, CartSessionItem>();

    for (const item of a) {
      map.set(`${item.productId}:${item.variantId}`, item);
    }

    for (const item of b) {
      const key = `${item.productId}:${item.variantId}`;
      if (!map.has(key)) {
        map.set(key, item);
      } else if (bTimestamp > aTimestamp) {
        // b is strictly newer — b wins
        map.set(key, item);
      }
      // else: a wins (a is newer or tie)
    }

    return Array.from(map.values());
  }

  private _docToSession(doc: CartSessionDoc): CartSession {
    return {
      sessionToken: doc.sessionToken,
      memberId: doc.memberId,
      items: sanitizeItems(doc.items ?? []),
      lastUpdated: doc.lastUpdated ?? doc._serverUpdatedAt ?? 0,
      mergedAt: doc.mergedAt ?? null,
    };
  }
}
