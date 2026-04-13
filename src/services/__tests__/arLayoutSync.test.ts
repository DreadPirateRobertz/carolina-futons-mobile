/**
 * TDD tests for arLayoutSync — cm-t6wl
 *
 * Covers: ARLayoutSyncService push/pull, validation, error paths,
 * and standalone wrapper no-op behavior.
 */
import { ARLayoutSyncService, pushLayouts, pullLayouts } from '../arLayoutSync';
import { WixClient, type WixClientConfig } from '../wix/wixClient';
import { resetWixClientSingleton } from '../wix/wixClientSingleton';
import type { SyncableARLayout } from '../arLayoutSync';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const TEST_CONFIG: WixClientConfig = {
  apiKey: 'test-api-key',
  siteId: 'test-site-id',
};

const MEMBER_ID = 'member-abc123';
const SERVER_TIME = '2026-04-13T10:00:00.000Z';

const LAYOUT_1: SyncableARLayout = {
  id: 'ar-layout-1',
  name: 'Living Room',
  items: [{ modelId: 'asheville-full', fabricId: 'natural-linen' }],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const LAYOUT_2: SyncableARLayout = {
  id: 'ar-layout-2',
  name: 'Bedroom',
  items: [{ modelId: 'blue-ridge-queen', fabricId: 'slate-gray' }],
  createdAt: '2026-01-02T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

// ── Mock helpers ──────────────────────────────────────────────────────────────

function mockQueryEmpty() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ dataItems: [], pagingMetadata: { total: 0 } }),
  });
}

function mockQueryWithDoc(layouts: SyncableARLayout[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        dataItems: [
          {
            id: 'doc-1',
            data: { memberId: MEMBER_ID, layouts },
            _updatedDate: SERVER_TIME,
          },
        ],
        pagingMetadata: { total: 1 },
      }),
  });
}

function mockInsertSuccess() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ dataItem: { id: 'doc-1', data: {}, _updatedDate: SERVER_TIME } }),
  });
}

/** Mocks the two-step upsert (query → insert when no existing doc). */
function mockUpsertNew() {
  mockQueryEmpty();
  mockInsertSuccess();
}

function mockNetworkError() {
  mockFetch.mockRejectedValueOnce(new Error('Network request failed'));
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ARLayoutSyncService', () => {
  let client: WixClient;
  let svc: ARLayoutSyncService;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new WixClient(TEST_CONFIG);
    svc = new ARLayoutSyncService(client);
  });

  // ── pushLayouts ────────────────────────────────────────────────────────────

  describe('pushLayouts', () => {
    it('throws when memberId is empty', async () => {
      await expect(svc.pushLayouts('', [LAYOUT_1])).rejects.toThrow('memberId required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('calls upsertDataItem on ARLayouts collection with memberId filter', async () => {
      mockUpsertNew();
      await svc.pushLayouts(MEMBER_ID, [LAYOUT_1]);

      const [, opts] = mockFetch.mock.calls[0];
      const body = JSON.parse(opts.body as string);
      expect(body.dataCollectionId).toBe('ARLayouts');
      expect(body.query.filter).toMatchObject({ memberId: { $eq: MEMBER_ID } });
    });

    it('resolves successfully when layouts are pushed', async () => {
      mockUpsertNew();
      await expect(svc.pushLayouts(MEMBER_ID, [LAYOUT_1, LAYOUT_2])).resolves.toBeUndefined();
    });

    it('propagates network errors', async () => {
      // WixClient retries network errors (up to 2 retries). Queue enough failures.
      mockNetworkError();
      mockNetworkError();
      mockNetworkError();
      await expect(svc.pushLayouts(MEMBER_ID, [LAYOUT_1])).rejects.toThrow();
    });
  });

  // ── pullLayouts ────────────────────────────────────────────────────────────

  describe('pullLayouts', () => {
    it('throws when memberId is empty', async () => {
      await expect(svc.pullLayouts('')).rejects.toThrow('memberId required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns empty array when no document exists for member', async () => {
      mockQueryEmpty();
      const result = await svc.pullLayouts(MEMBER_ID);
      expect(result).toEqual([]);
    });

    it('returns layouts from the server document', async () => {
      mockQueryWithDoc([LAYOUT_1, LAYOUT_2]);
      const result = await svc.pullLayouts(MEMBER_ID);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('ar-layout-1');
      expect(result[1].id).toBe('ar-layout-2');
    });

    it('queries ARLayouts collection with memberId filter', async () => {
      mockQueryEmpty();
      await svc.pullLayouts(MEMBER_ID);

      const [, opts] = mockFetch.mock.calls[0];
      const body = JSON.parse(opts.body as string);
      expect(body.dataCollectionId).toBe('ARLayouts');
      expect(body.query.filter).toMatchObject({ memberId: { $eq: MEMBER_ID } });
    });

    it('propagates network errors', async () => {
      mockNetworkError();
      mockNetworkError();
      mockNetworkError();
      await expect(svc.pullLayouts(MEMBER_ID)).rejects.toThrow();
    });
  });
});

// ── Standalone wrappers ───────────────────────────────────────────────────────

describe('standalone pushLayouts', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    resetWixClientSingleton();
  });

  afterEach(() => {
    resetWixClientSingleton();
    delete process.env.EXPO_PUBLIC_WIX_API_KEY;
    delete process.env.EXPO_PUBLIC_WIX_SITE_ID;
  });

  it('no-ops when memberId is empty string', async () => {
    process.env.EXPO_PUBLIC_WIX_API_KEY = 'key';
    process.env.EXPO_PUBLIC_WIX_SITE_ID = 'site';
    await expect(pushLayouts('', [LAYOUT_1])).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('no-ops when Wix is not configured', async () => {
    await expect(pushLayouts(MEMBER_ID, [LAYOUT_1])).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('standalone pullLayouts', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    resetWixClientSingleton();
  });

  afterEach(() => {
    resetWixClientSingleton();
  });

  it('returns empty array when memberId is empty string', async () => {
    await expect(pullLayouts('')).resolves.toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns empty array when Wix is not configured', async () => {
    await expect(pullLayouts(MEMBER_ID)).resolves.toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
