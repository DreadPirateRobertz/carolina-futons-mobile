/**
 * Tests for warrantyRegistration service — cm-wrt
 *
 * Covers: successful registration, missing wix client, insert throws,
 * receipt photo included/excluded, data shape written to Wix collection.
 */

import { registerWarranty } from '../warrantyRegistration';
import type { WarrantyRegistrationData } from '../warrantyRegistration';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockInsertDataItem = jest.fn();

const mockClient = {
  insertDataItem: mockInsertDataItem,
};

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_DATA: WarrantyRegistrationData = {
  orderId: 'ord-001',
  orderNumber: 'CF-2026-0147',
  productName: 'The Asheville Futon',
  purchaseDate: '2026-02-10',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Happy path ─────────────────────────────────────────────────────────────────

describe('registerWarranty — happy path', () => {
  it('returns success:true with id on successful insert', async () => {
    mockInsertDataItem.mockResolvedValue({ id: 'warranty-abc-123' });

    const result = await registerWarranty(mockClient as any, BASE_DATA);

    expect(result.success).toBe(true);
    expect(result.id).toBe('warranty-abc-123');
    expect(result.error).toBeUndefined();
  });

  it('inserts into the WarrantyRegistrations collection', async () => {
    mockInsertDataItem.mockResolvedValue({ id: 'w-1' });

    await registerWarranty(mockClient as any, BASE_DATA);

    expect(mockInsertDataItem).toHaveBeenCalledWith('WarrantyRegistrations', expect.any(Object));
  });

  it('writes all required fields to the collection', async () => {
    mockInsertDataItem.mockResolvedValue({ id: 'w-2' });

    await registerWarranty(mockClient as any, BASE_DATA);

    expect(mockInsertDataItem).toHaveBeenCalledWith(
      'WarrantyRegistrations',
      expect.objectContaining({
        orderId: 'ord-001',
        orderNumber: 'CF-2026-0147',
        productName: 'The Asheville Futon',
        purchaseDate: '2026-02-10',
      }),
    );
  });

  it('includes registeredAt ISO timestamp in the record', async () => {
    mockInsertDataItem.mockResolvedValue({ id: 'w-3' });
    const before = new Date().toISOString();

    await registerWarranty(mockClient as any, BASE_DATA);

    const [, data] = mockInsertDataItem.mock.calls[0] as [string, Record<string, unknown>];
    expect(typeof data.registeredAt).toBe('string');
    expect((data.registeredAt as string) >= before).toBe(true);
  });
});

// ── Receipt photo ─────────────────────────────────────────────────────────────

describe('registerWarranty — receipt photo', () => {
  it('includes receiptPhotoUrl when provided', async () => {
    mockInsertDataItem.mockResolvedValue({ id: 'w-4' });

    await registerWarranty(mockClient as any, {
      ...BASE_DATA,
      receiptPhotoUrl: 'https://media.wix.com/receipt-001.jpg',
    });

    expect(mockInsertDataItem).toHaveBeenCalledWith(
      'WarrantyRegistrations',
      expect.objectContaining({
        receiptPhotoUrl: 'https://media.wix.com/receipt-001.jpg',
      }),
    );
  });

  it('omits receiptPhotoUrl field when not provided', async () => {
    mockInsertDataItem.mockResolvedValue({ id: 'w-5' });

    await registerWarranty(mockClient as any, BASE_DATA);

    const [, data] = mockInsertDataItem.mock.calls[0] as [string, Record<string, unknown>];
    expect('receiptPhotoUrl' in data).toBe(false);
  });
});

// ── Client unavailable ────────────────────────────────────────────────────────

describe('registerWarranty — client unavailable', () => {
  it('returns success:false when client is null', async () => {
    const result = await registerWarranty(null, BASE_DATA);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unavailable/i);
    expect(mockInsertDataItem).not.toHaveBeenCalled();
  });
});

// ── Insert failure ────────────────────────────────────────────────────────────

describe('registerWarranty — insert failure', () => {
  it('returns success:false when insertDataItem throws', async () => {
    mockInsertDataItem.mockRejectedValue(new Error('Wix collection write failed'));

    const result = await registerWarranty(mockClient as any, BASE_DATA);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Wix collection write failed/);
  });

  it('does not throw — always returns a result object', async () => {
    mockInsertDataItem.mockRejectedValue(new Error('Network error'));

    await expect(registerWarranty(mockClient as any, BASE_DATA)).resolves.toBeDefined();
  });
});
