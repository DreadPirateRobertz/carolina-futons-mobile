/**
 * TDD tests for arLayoutSync.ts — cm-b3b
 *
 * Covers: pushLayouts (upsert to ARLayouts Wix collection),
 * pullLayouts (query + parse from ARLayouts collection),
 * error handling, edge cases.
 *
 * Collection: ARLayouts
 * Schema: { memberId (Text, indexed), layouts (Text/JSON), updatedAt (DateTime) }
 */

import { pushLayouts, pullLayouts, SyncableARLayout } from '../arLayoutSync';
import type { WixClient } from '@/services/wix/wixClient';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MEMBER_ID = 'member-abc-123';

const LAYOUT_A: SyncableARLayout = {
  id: 'ar-layout-001',
  name: 'Living Room',
  items: [{ modelId: 'asheville-full', fabricId: 'natural-linen' }],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const LAYOUT_B: SyncableARLayout = {
  id: 'ar-layout-002',
  name: 'Bedroom',
  items: [
    { modelId: 'blue-ridge-queen', fabricId: 'slate-gray' },
    { modelId: 'asheville-full', fabricId: 'natural-linen' },
  ],
  thumbnailUri: 'file:///tmp/thumb.jpg',
  createdAt: '2026-01-02T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

function makeMockWixClient(overrides: Partial<Record<keyof WixClient, jest.Mock>> = {}): WixClient {
  return {
    upsertDataItem: jest.fn(() =>
      Promise.resolve({ id: 'doc-1', data: {}, _updatedDate: new Date().toISOString() }),
    ),
    queryData: jest.fn(() => Promise.resolve({ items: [], totalResults: 0 })),
    ...overrides,
  } as unknown as WixClient;
}

// ── pushLayouts ───────────────────────────────────────────────────────────────

describe('pushLayouts', () => {
  it('calls upsertDataItem on the ARLayouts collection', async () => {
    const wixClient = makeMockWixClient();
    await pushLayouts(wixClient, MEMBER_ID, [LAYOUT_A]);

    expect(wixClient.upsertDataItem).toHaveBeenCalledWith(
      'ARLayouts',
      expect.anything(),
      expect.anything(),
    );
  });

  it('filters upsert by memberId', async () => {
    const wixClient = makeMockWixClient();
    await pushLayouts(wixClient, MEMBER_ID, [LAYOUT_A]);

    expect(wixClient.upsertDataItem).toHaveBeenCalledWith(
      'ARLayouts',
      { memberId: { $eq: MEMBER_ID } },
      expect.anything(),
    );
  });

  it('serializes layouts array as JSON in the data payload', async () => {
    const wixClient = makeMockWixClient();
    await pushLayouts(wixClient, MEMBER_ID, [LAYOUT_A, LAYOUT_B]);

    expect(wixClient.upsertDataItem).toHaveBeenCalledWith(
      'ARLayouts',
      expect.anything(),
      expect.objectContaining({ layouts: JSON.stringify([LAYOUT_A, LAYOUT_B]) }),
    );
  });

  it('includes memberId in the data payload', async () => {
    const wixClient = makeMockWixClient();
    await pushLayouts(wixClient, MEMBER_ID, [LAYOUT_A]);

    expect(wixClient.upsertDataItem).toHaveBeenCalledWith(
      'ARLayouts',
      expect.anything(),
      expect.objectContaining({ memberId: MEMBER_ID }),
    );
  });

  it('includes updatedAt ISO timestamp in the data payload', async () => {
    const wixClient = makeMockWixClient();
    const before = Date.now();
    await pushLayouts(wixClient, MEMBER_ID, [LAYOUT_A]);
    const after = Date.now();

    const [, , data] = (wixClient.upsertDataItem as jest.Mock).mock.calls[0] as [
      string,
      unknown,
      Record<string, unknown>,
    ];
    expect(typeof data.updatedAt).toBe('string');
    const ts = new Date(data.updatedAt as string).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('resolves successfully with a non-empty layouts array', async () => {
    const wixClient = makeMockWixClient();
    await expect(pushLayouts(wixClient, MEMBER_ID, [LAYOUT_A, LAYOUT_B])).resolves.toBeUndefined();
  });

  it('resolves successfully with an empty layouts array (clears cloud)', async () => {
    const wixClient = makeMockWixClient();
    await expect(pushLayouts(wixClient, MEMBER_ID, [])).resolves.toBeUndefined();

    expect(wixClient.upsertDataItem).toHaveBeenCalledWith(
      'ARLayouts',
      expect.anything(),
      expect.objectContaining({ layouts: JSON.stringify([]) }),
    );
  });

  it('propagates errors thrown by wixClient.upsertDataItem', async () => {
    const wixClient = makeMockWixClient({
      upsertDataItem: jest.fn(() => Promise.reject(new Error('[arLayoutSync] network error'))),
    });

    await expect(pushLayouts(wixClient, MEMBER_ID, [LAYOUT_A])).rejects.toThrow(
      '[arLayoutSync] network error',
    );
  });

  it('preserves all layout fields including optional thumbnailUri', async () => {
    const wixClient = makeMockWixClient();
    await pushLayouts(wixClient, MEMBER_ID, [LAYOUT_B]);

    const [, , data] = (wixClient.upsertDataItem as jest.Mock).mock.calls[0] as [
      string,
      unknown,
      Record<string, unknown>,
    ];
    const parsed = JSON.parse(data.layouts as string) as SyncableARLayout[];
    expect(parsed[0].thumbnailUri).toBe('file:///tmp/thumb.jpg');
  });
});

// ── pullLayouts ───────────────────────────────────────────────────────────────

describe('pullLayouts', () => {
  it('calls queryData on the ARLayouts collection', async () => {
    const wixClient = makeMockWixClient();
    await pullLayouts(wixClient, MEMBER_ID);

    expect(wixClient.queryData).toHaveBeenCalledWith(
      'ARLayouts',
      expect.objectContaining({ filter: { memberId: { $eq: MEMBER_ID } } }),
    );
  });

  it('returns an empty array when no cloud record exists', async () => {
    const wixClient = makeMockWixClient({
      queryData: jest.fn(() => Promise.resolve({ items: [], totalResults: 0 })),
    });

    const result = await pullLayouts(wixClient, MEMBER_ID);
    expect(result).toEqual([]);
  });

  it('parses and returns layouts from the cloud record', async () => {
    const wixClient = makeMockWixClient({
      queryData: jest.fn(() =>
        Promise.resolve({
          items: [{ memberId: MEMBER_ID, layouts: JSON.stringify([LAYOUT_A, LAYOUT_B]) }],
          totalResults: 1,
        }),
      ),
    });

    const result = await pullLayouts(wixClient, MEMBER_ID);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(LAYOUT_A.id);
    expect(result[1].id).toBe(LAYOUT_B.id);
  });

  it('returns an empty array when layouts field is missing', async () => {
    const wixClient = makeMockWixClient({
      queryData: jest.fn(() =>
        Promise.resolve({
          items: [{ memberId: MEMBER_ID }],
          totalResults: 1,
        }),
      ),
    });

    const result = await pullLayouts(wixClient, MEMBER_ID);
    expect(result).toEqual([]);
  });

  it('returns an empty array when layouts field is empty string', async () => {
    const wixClient = makeMockWixClient({
      queryData: jest.fn(() =>
        Promise.resolve({
          items: [{ memberId: MEMBER_ID, layouts: '' }],
          totalResults: 1,
        }),
      ),
    });

    const result = await pullLayouts(wixClient, MEMBER_ID);
    expect(result).toEqual([]);
  });

  it('returns an empty array when layouts JSON is corrupt', async () => {
    const wixClient = makeMockWixClient({
      queryData: jest.fn(() =>
        Promise.resolve({
          items: [{ memberId: MEMBER_ID, layouts: 'not-valid-json{{' }],
          totalResults: 1,
        }),
      ),
    });

    const result = await pullLayouts(wixClient, MEMBER_ID);
    expect(result).toEqual([]);
  });

  it('returns an empty array when layouts JSON is not an array', async () => {
    const wixClient = makeMockWixClient({
      queryData: jest.fn(() =>
        Promise.resolve({
          items: [{ memberId: MEMBER_ID, layouts: JSON.stringify({ not: 'an array' }) }],
          totalResults: 1,
        }),
      ),
    });

    const result = await pullLayouts(wixClient, MEMBER_ID);
    expect(result).toEqual([]);
  });

  it('propagates errors thrown by wixClient.queryData', async () => {
    const wixClient = makeMockWixClient({
      queryData: jest.fn(() => Promise.reject(new Error('[arLayoutSync] query failed'))),
    });

    await expect(pullLayouts(wixClient, MEMBER_ID)).rejects.toThrow('[arLayoutSync] query failed');
  });

  it('preserves all layout fields including optional thumbnailUri', async () => {
    const wixClient = makeMockWixClient({
      queryData: jest.fn(() =>
        Promise.resolve({
          items: [{ memberId: MEMBER_ID, layouts: JSON.stringify([LAYOUT_B]) }],
          totalResults: 1,
        }),
      ),
    });

    const result = await pullLayouts(wixClient, MEMBER_ID);
    expect(result[0].thumbnailUri).toBe('file:///tmp/thumb.jpg');
    expect(result[0].items).toHaveLength(2);
  });

  it('limits query to 1 result (single doc per member)', async () => {
    const wixClient = makeMockWixClient();
    await pullLayouts(wixClient, MEMBER_ID);

    expect(wixClient.queryData).toHaveBeenCalledWith(
      'ARLayouts',
      expect.objectContaining({ limit: 1 }),
    );
  });
});
