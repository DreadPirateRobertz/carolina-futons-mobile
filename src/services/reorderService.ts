/**
 * @module reorderService
 *
 * Prepares a reorder preview for an order's line items — cm-bjq.
 *
 * Resolves each line item to its current FutonModel + Fabric from the
 * catalog, then checks stock availability via the injected StockChecker.
 * Items whose model or fabric no longer exist (discontinued) are marked
 * unavailable. Returns separate lists so the UI can warn about OOS items
 * before the user confirms.
 */

import type { OrderLineItem } from '@/data/orders';
import type { FutonModel, Fabric } from '@/data/futons';

// ── Types ─────────────────────────────────────────────────────────────────────

/** A line item that can be added to cart — model and fabric both resolved. */
export interface ReorderLineItem {
  lineItem: OrderLineItem;
  model: FutonModel;
  fabric: Fabric;
}

/** Categorized result from buildReorderPreview. */
export interface ReorderPreview {
  /** Items whose model + fabric exist in catalog and pass the stock check. */
  available: ReorderLineItem[];
  /** Items whose model/fabric is discontinued or failed the stock check. */
  unavailable: OrderLineItem[];
}

/**
 * Returns true if the given model+fabric combination is currently in stock.
 * Inject a real implementation (e.g. Wix API check) or a mock in tests.
 */
export type StockChecker = (modelId: string, fabricId: string) => boolean;

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Build a ReorderPreview from an order's line items.
 *
 * @param items       Line items from the order.
 * @param getModel    Catalog lookup — returns FutonModel or undefined.
 * @param getFabric   Catalog lookup — returns Fabric or undefined.
 * @param checkStock  Optional stock checker — defaults to always-in-stock.
 */
export function buildReorderPreview(
  items: OrderLineItem[],
  getModel: (id: string) => FutonModel | undefined,
  getFabric: (id: string) => Fabric | undefined,
  checkStock: StockChecker = () => true,
): ReorderPreview {
  const available: ReorderLineItem[] = [];
  const unavailable: OrderLineItem[] = [];

  for (const lineItem of items) {
    const model = getModel(lineItem.modelId);
    const fabric = getFabric(lineItem.fabricId);

    // Discontinued — model or fabric no longer in catalog
    if (!model || !fabric) {
      unavailable.push(lineItem);
      continue;
    }

    // Stock check (only called for items that exist in catalog)
    if (!checkStock(lineItem.modelId, lineItem.fabricId)) {
      unavailable.push(lineItem);
      continue;
    }

    available.push({ lineItem, model, fabric });
  }

  return { available, unavailable };
}
