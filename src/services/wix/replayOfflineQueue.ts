/**
 * Replays queued offline actions against Wix eCommerce REST APIs.
 *
 * Cart actions are sent to Wix; wishlist actions are local-only (skipped).
 */

import type { QueuedAction } from '@/services/offlineQueue';
import type { WixClient } from './wixClient';

const WIX_STORES_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e';

export interface ReplayError {
  action: QueuedAction;
  error: Error;
}

export interface ReplayResult {
  succeeded: number;
  failed: number;
  skipped: number;
  errors: ReplayError[];
}

async function replayCartAction(
  action: QueuedAction,
  cartId: string,
  client: WixClient,
): Promise<'ok' | 'skipped'> {
  const { payload } = action;

  switch (action.action) {
    case 'ADD_ITEM': {
      const productId = payload.productId as string;
      const variantId = payload.variantId as string | undefined;
      const quantity = (payload.quantity as number) || 1;
      await client.addToCart(cartId, [
        {
          catalogReference: {
            catalogItemId: productId,
            appId: WIX_STORES_APP_ID,
            options: variantId ? { variantId } : {},
          },
          quantity,
        },
      ]);
      return 'ok';
    }

    case 'REMOVE_ITEM': {
      const lineItemIds = payload.lineItemIds as string[] | undefined;
      const itemId = payload.itemId as string | undefined;
      const ids = lineItemIds ?? (itemId ? [itemId] : []);
      await client.removeCartLineItems(cartId, ids);
      return 'ok';
    }

    case 'UPDATE_QUANTITY': {
      const lineItemId = payload.lineItemId as string;
      const quantity = payload.quantity as number;
      await client.updateCartLineItems(cartId, [{ id: lineItemId, quantity }]);
      return 'ok';
    }

    default:
      return 'skipped';
  }
}

export async function replayOfflineQueue(
  actions: QueuedAction[],
  cartId: string,
  client: WixClient,
): Promise<ReplayResult> {
  const result: ReplayResult = { succeeded: 0, failed: 0, skipped: 0, errors: [] };

  for (const action of actions) {
    if (action.domain === 'wishlist') {
      result.skipped++;
      continue;
    }

    try {
      const outcome = await replayCartAction(action, cartId, client);
      if (outcome === 'ok') {
        result.succeeded++;
      } else {
        result.skipped++;
      }
    } catch (err) {
      result.failed++;
      result.errors.push({
        action,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  return result;
}
