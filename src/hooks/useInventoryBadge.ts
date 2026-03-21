/**
 * @module useInventoryBadge
 *
 * Fetches live inventory for a product and returns an urgency badge type.
 *
 * Badge types:
 *   - 'low_stock'      — 1–5 units remaining ("Only X left")
 *   - 'just_restocked' — 0 units reported but inStock=true (recently restocked)
 *   - 'none'           — well-stocked, truly out-of-stock, or no data
 */
import { useState, useEffect } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import type { InventoryStatus } from '@/services/wix/wixClient';

export type InventoryBadgeType = 'low_stock' | 'just_restocked' | 'none';

const LOW_STOCK_MAX = 5;

interface UseInventoryBadgeResult {
  badge: InventoryBadgeType;
  quantity: number;
  isLoading: boolean;
  error: string | null;
}

export function useInventoryBadge(productId: string | undefined): UseInventoryBadgeResult {
  const wixClient = useOptionalWixClient();

  const [badge, setBadge] = useState<InventoryBadgeType>('none');
  const [quantity, setQuantity] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId || !wixClient) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    wixClient
      .getInventoryStatus(productId)
      .then((status: InventoryStatus) => {
        if (cancelled) return;

        const qty = status.totalQuantity ?? 0;
        setQuantity(qty);

        if (qty >= 1 && qty <= LOW_STOCK_MAX) {
          setBadge('low_stock');
        } else if (qty === 0 && status.inStock) {
          setBadge('just_restocked');
        } else {
          setBadge('none');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
        setBadge('none');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId, wixClient]);

  return { badge, quantity, isLoading, error };
}
