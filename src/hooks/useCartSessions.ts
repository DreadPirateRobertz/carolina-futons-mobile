/**
 * @module useCartSessions
 *
 * Cross-device cart sync via the CartSessions Wix collection — bead cm-lqw.
 *
 * Guest flow:    cart keyed by sessionToken (UUID, persisted in AsyncStorage)
 * Member flow:   cart keyed by memberId
 * Login merge:   guest cart + member cart → dedup by productId+variantId,
 *                take higher quantity → write back as member cart
 *
 * Wix collection: CartSessions
 * Schema: { sessionToken, memberId, items (JSON), updatedAt (ISO) }
 */

import { useState, useEffect, useCallback } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { getSessionToken } from '@/services/sessionToken';
import { captureException } from '@/services/crashReporting';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartSessionItem {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface UseCartSessionsOptions {
  memberId: string | null;
}

export interface UseCartSessionsReturn {
  items: CartSessionItem[];
  loading: boolean;
  loadError: string | null;
  saveError: string | null;
  saveCart: (items: CartSessionItem[]) => Promise<void>;
  mergeOnLogin: (memberId: string) => Promise<CartSessionItem[]>;
}

const COLLECTION = 'CartSessions';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseItems(raw: unknown): CartSessionItem[] {
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is CartSessionItem =>
        typeof i?.productId === 'string' &&
        typeof i?.variantId === 'string' &&
        typeof i?.quantity === 'number',
    );
  } catch {
    return [];
  }
}

/**
 * Merge two item arrays. Dedup by productId+variantId, take higher quantity.
 * Member items take precedence on tie.
 */
function mergeItems(guest: CartSessionItem[], member: CartSessionItem[]): CartSessionItem[] {
  const map = new Map<string, CartSessionItem>();

  for (const item of member) {
    map.set(`${item.productId}:${item.variantId}`, item);
  }
  for (const item of guest) {
    const key = `${item.productId}:${item.variantId}`;
    const existing = map.get(key);
    if (!existing || item.quantity > existing.quantity) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCartSessions({ memberId }: UseCartSessionsOptions): UseCartSessionsReturn {
  const wixClient = useOptionalWixClient();

  const [items, setItems] = useState<CartSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Load on mount ───────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      if (!wixClient) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        const sessionToken = await getSessionToken();
        const filter = memberId
          ? { memberId: { $eq: memberId } }
          : { sessionToken: { $eq: sessionToken } };

        const result = await wixClient.queryData<Record<string, unknown>>(COLLECTION, { filter });

        if (cancelled) return;

        if (result.items.length === 0) {
          setItems([]);
        } else {
          setItems(parseItems(result.items[0].items));
        }
      } catch (err) {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        captureException(error);
        setLoadError(error.message);
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [wixClient, memberId]);

  // ── saveCart ────────────────────────────────────────────────────────────────

  const saveCart = useCallback(
    async (newItems: CartSessionItem[]): Promise<void> => {
      if (!wixClient) return;

      setSaveError(null);
      try {
        const sessionToken = await getSessionToken();
        const filter = memberId
          ? { memberId: { $eq: memberId } }
          : { sessionToken: { $eq: sessionToken } };

        const data: Record<string, unknown> = {
          items: JSON.stringify(newItems),
          updatedAt: new Date().toISOString(),
        };
        if (memberId) {
          data.memberId = memberId;
        } else {
          data.sessionToken = sessionToken;
        }

        await wixClient.upsertDataItem(COLLECTION, filter, data);
        setItems(newItems);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        captureException(error);
        setSaveError(error.message);
      }
    },
    [wixClient, memberId],
  );

  // ── mergeOnLogin ────────────────────────────────────────────────────────────

  const mergeOnLogin = useCallback(
    async (loginMemberId: string): Promise<CartSessionItem[]> => {
      if (!wixClient) return [];

      setLoadError(null);
      try {
        const sessionToken = await getSessionToken();

        const [guestResult, memberResult] = await Promise.all([
          wixClient.queryData<Record<string, unknown>>(COLLECTION, {
            filter: { sessionToken: { $eq: sessionToken } },
          }),
          wixClient.queryData<Record<string, unknown>>(COLLECTION, {
            filter: { memberId: { $eq: loginMemberId } },
          }),
        ]);

        const guestItems =
          guestResult.items.length > 0 ? parseItems(guestResult.items[0].items) : [];
        const memberItems =
          memberResult.items.length > 0 ? parseItems(memberResult.items[0].items) : [];

        const merged = mergeItems(guestItems, memberItems);

        // Write merged cart keyed by memberId
        const mergedData: Record<string, unknown> = {
          memberId: loginMemberId,
          items: JSON.stringify(merged),
          updatedAt: new Date().toISOString(),
        };
        await wixClient.upsertDataItem(
          COLLECTION,
          { memberId: { $eq: loginMemberId } },
          mergedData,
        );

        setItems(merged);
        return merged;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        captureException(error);
        setLoadError(error.message);
        return [];
      }
    },
    [wixClient],
  );

  return { items, loading, loadError, saveError, saveCart, mergeOnLogin };
}
