/**
 * @module warrantyRegistration
 *
 * Writes a warranty registration record to the Wix WarrantyRegistrations
 * collection — cm-wrt.
 *
 * Requires an authenticated Wix client with write access to the collection.
 * Returns a typed result object; never throws.
 */

import { captureException } from '@/services/crashReporting';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WarrantyRegistrationData {
  orderId: string;
  orderNumber: string;
  productName: string;
  purchaseDate: string; // ISO date string, e.g. "2026-02-10"
  receiptPhotoUrl?: string;
}

export interface WarrantyRegistrationResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface WixClientLike {
  insertDataItem: (collectionId: string, data: Record<string, unknown>) => Promise<{ id: string }>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLLECTION_ID = 'WarrantyRegistrations';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Register a product warranty by inserting a record into Wix.
 *
 * @param client  Wix client instance — pass null to receive a graceful error.
 * @param data    Warranty registration fields.
 */
export async function registerWarranty(
  client: WixClientLike | null,
  data: WarrantyRegistrationData,
): Promise<WarrantyRegistrationResult> {
  if (!client) {
    return { success: false, error: 'Wix service unavailable' };
  }

  try {
    const record: Record<string, unknown> = {
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      productName: data.productName,
      purchaseDate: data.purchaseDate,
      registeredAt: new Date().toISOString(),
    };

    if (data.receiptPhotoUrl !== undefined) {
      record.receiptPhotoUrl = data.receiptPhotoUrl;
    }

    const result = await client.insertDataItem(COLLECTION_ID, record);

    return { success: true, id: result.id };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureException(error);
    return { success: false, error: error.message };
  }
}
