/**
 * Integration tests for modelLoader — covers async filesystem operations.
 * The existing modelLoader.test.ts covers pure/deterministic functions.
 * These tests mock expo-file-system at a granular level to exercise
 * readManifest, writeManifest, ensureCacheDir, getCachedModel,
 * evictIfNeeded, loadModelForProduct, prefetchModel, clearModelCache,
 * and getModelCacheStats.
 */
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

import {
  readManifest,
  writeManifest,
  ensureCacheDir,
  getCachedModel,
  evictIfNeeded,
  loadModelForProduct,
  prefetchModel,
  clearModelCache,
  getModelCacheStats,
  MODEL_CACHE_DIR,
  MODEL_CACHE_BUDGET_BYTES,
  type ModelLoadStatus,
} from '../modelLoader';

// Cast mocks for type safety
const mockGetInfo = FileSystem.getInfoAsync as jest.Mock;
const mockMakeDir = FileSystem.makeDirectoryAsync as jest.Mock;
const mockReadString = FileSystem.readAsStringAsync as jest.Mock;
const mockWriteString = FileSystem.writeAsStringAsync as jest.Mock;
const mockDelete = FileSystem.deleteAsync as jest.Mock;
const mockCreateDownload = FileSystem.createDownloadResumable as jest.Mock;

const originalPlatform = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  // Default: nothing exists
  mockGetInfo.mockResolvedValue({ exists: false });
  mockMakeDir.mockResolvedValue(undefined);
  mockReadString.mockResolvedValue('{}');
  mockWriteString.mockResolvedValue(undefined);
  mockDelete.mockResolvedValue(undefined);
  (Platform as any).OS = 'ios';
});

afterEach(() => {
  (Platform as any).OS = originalPlatform;
});

describe('readManifest', () => {
  it('returns empty manifest when file does not exist', async () => {
    mockGetInfo.mockResolvedValue({ exists: false });
    const manifest = await readManifest();
    expect(manifest).toEqual({ entries: [] });
  });

  it('parses existing manifest file', async () => {
    const entries = [
      {
        productId: 'prod-a',
        fileName: 'prod-a-abc.usdz',
        contentHash: 'abc',
        sizeBytes: 1000,
        lastAccessedMs: 100,
      },
    ];
    mockGetInfo.mockResolvedValue({ exists: true });
    mockReadString.mockResolvedValue(JSON.stringify({ entries }));
    const manifest = await readManifest();
    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0].productId).toBe('prod-a');
  });

  it('returns empty manifest on read error', async () => {
    mockGetInfo.mockResolvedValue({ exists: true });
    mockReadString.mockRejectedValue(new Error('read fail'));
    const manifest = await readManifest();
    expect(manifest).toEqual({ entries: [] });
  });

  it('returns empty manifest on JSON parse error', async () => {
    mockGetInfo.mockResolvedValue({ exists: true });
    mockReadString.mockResolvedValue('not-json');
    const manifest = await readManifest();
    expect(manifest).toEqual({ entries: [] });
  });
});

describe('writeManifest', () => {
  it('ensures cache dir exists before writing', async () => {
    await writeManifest({ entries: [] });
    expect(mockGetInfo).toHaveBeenCalled();
    expect(mockWriteString).toHaveBeenCalledWith(
      expect.stringContaining('manifest.json'),
      expect.any(String),
    );
  });

  it('serializes manifest as JSON', async () => {
    const entries = [
      {
        productId: 'x',
        fileName: 'x.usdz',
        contentHash: 'h',
        sizeBytes: 500,
        lastAccessedMs: 99,
      },
    ];
    await writeManifest({ entries });
    const written = mockWriteString.mock.calls[0][1];
    expect(JSON.parse(written)).toEqual({ entries });
  });
});

describe('ensureCacheDir', () => {
  it('creates directory when it does not exist', async () => {
    mockGetInfo.mockResolvedValue({ exists: false });
    await ensureCacheDir();
    expect(mockMakeDir).toHaveBeenCalledWith(MODEL_CACHE_DIR, { intermediates: true });
  });

  it('does not create directory when it already exists', async () => {
    mockGetInfo.mockResolvedValue({ exists: true });
    await ensureCacheDir();
    expect(mockMakeDir).not.toHaveBeenCalled();
  });
});

describe('getCachedModel', () => {
  it('returns null when file does not exist', async () => {
    mockGetInfo.mockResolvedValue({ exists: false });
    const result = await getCachedModel('prod-a', 'hash123');
    expect(result).toBeNull();
  });

  it('returns file path when cached and updates access time', async () => {
    // First call: file info check → exists
    // Second call: manifest info check → does not exist (so readManifest returns empty)
    // But getCachedModel reads file info, then reads manifest
    mockGetInfo
      .mockResolvedValueOnce({ exists: true }) // file check
      .mockResolvedValueOnce({ exists: true }) // manifest info check in readManifest
      .mockResolvedValueOnce({ exists: true }); // ensureCacheDir check in writeManifest

    const manifestData = {
      entries: [
        {
          productId: 'prod-a',
          contentHash: 'hash123',
          fileName: 'prod-a-hash123.usdz',
          sizeBytes: 1000,
          lastAccessedMs: 100,
        },
      ],
    };
    mockReadString.mockResolvedValue(JSON.stringify(manifestData));

    const result = await getCachedModel('prod-a', 'hash123');
    expect(result).toContain('prod-a-hash123.usdz');
    // Should have written updated manifest with new access time
    expect(mockWriteString).toHaveBeenCalled();
  });

  it('returns path even when entry not in manifest', async () => {
    mockGetInfo
      .mockResolvedValueOnce({ exists: true }) // file exists
      .mockResolvedValueOnce({ exists: false }); // manifest does not exist

    const result = await getCachedModel('prod-a', 'hash123');
    expect(result).toContain('prod-a-hash123.usdz');
    // No write since entry was not found in manifest
  });
});

describe('evictIfNeeded', () => {
  it('does not evict when budget is sufficient', async () => {
    const manifest = {
      entries: [
        {
          productId: 'a',
          fileName: 'a.usdz',
          contentHash: 'h',
          sizeBytes: 1000,
          lastAccessedMs: 100,
        },
      ],
    };
    const result = await evictIfNeeded(manifest, 1000);
    expect(result.entries).toHaveLength(1);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('evicts oldest entry when budget exceeded', async () => {
    const manifest = {
      entries: [
        {
          productId: 'old',
          fileName: 'old.usdz',
          contentHash: 'h1',
          sizeBytes: MODEL_CACHE_BUDGET_BYTES,
          lastAccessedMs: 100,
        },
        {
          productId: 'new',
          fileName: 'new.usdz',
          contentHash: 'h2',
          sizeBytes: 1000,
          lastAccessedMs: 200,
        },
      ],
    };
    const result = await evictIfNeeded(manifest, 5000);
    // Should have deleted the oldest entry
    expect(mockDelete).toHaveBeenCalled();
    // "old" should be evicted, "new" should remain
    expect(result.entries.find((e) => e.productId === 'old')).toBeUndefined();
    expect(result.entries.find((e) => e.productId === 'new')).toBeDefined();
  });

  it('handles delete failure gracefully', async () => {
    mockDelete.mockRejectedValue(new Error('delete failed'));
    const manifest = {
      entries: [
        {
          productId: 'x',
          fileName: 'x.usdz',
          contentHash: 'h',
          sizeBytes: MODEL_CACHE_BUDGET_BYTES,
          lastAccessedMs: 50,
        },
      ],
    };
    // Should not throw
    const result = await evictIfNeeded(manifest, MODEL_CACHE_BUDGET_BYTES);
    expect(result.entries).toHaveLength(0);
  });
});

describe('loadModelForProduct', () => {
  it('returns null and notifies error for unknown product', async () => {
    const statuses: ModelLoadStatus[] = [];
    const result = await loadModelForProduct('prod-nonexistent', (s) => statuses.push(s));
    expect(result).toBeNull();
    expect(statuses).toContainEqual({
      state: 'error',
      message: 'No AR model available for this product',
    });
  });

  it('returns cached path when model is already cached', async () => {
    // prod-asheville-full is in the models3d data
    // Simulate: file exists in cache
    mockGetInfo.mockResolvedValue({ exists: true });
    mockReadString.mockResolvedValue(
      JSON.stringify({
        entries: [
          {
            productId: 'prod-asheville-full',
            contentHash: expect.any(String),
            fileName: 'test.usdz',
            sizeBytes: 1000,
            lastAccessedMs: 100,
          },
        ],
      }),
    );

    const statuses: ModelLoadStatus[] = [];
    const result = await loadModelForProduct('prod-asheville-full', (s) => statuses.push(s));
    expect(result).toContain('prod-asheville-full');
    expect(statuses.some((s) => s.state === 'checking-cache')).toBe(true);
    expect(statuses.some((s) => s.state === 'ready')).toBe(true);
  });

  it('downloads model when not cached', async () => {
    // First getInfoAsync call (getCachedModel → file check) → not exists
    // Subsequent calls → not exists (manifest, cache dir)
    mockGetInfo.mockResolvedValue({ exists: false });

    const mockDownload = jest.fn().mockResolvedValue({
      uri: '/mock-cache/models3d/model.usdz',
      status: 200,
    });
    mockCreateDownload.mockReturnValue({ downloadAsync: mockDownload });

    const statuses: ModelLoadStatus[] = [];
    const result = await loadModelForProduct('prod-asheville-full', (s) => statuses.push(s));

    expect(result).toBe('/mock-cache/models3d/model.usdz');
    expect(statuses.some((s) => s.state === 'downloading')).toBe(true);
    expect(statuses.some((s) => s.state === 'ready')).toBe(true);
    expect(mockWriteString).toHaveBeenCalled(); // manifest updated
  });

  it('returns null when download returns no result', async () => {
    mockGetInfo.mockResolvedValue({ exists: false });
    mockCreateDownload.mockReturnValue({
      downloadAsync: jest.fn().mockResolvedValue(null),
    });

    const statuses: ModelLoadStatus[] = [];
    const result = await loadModelForProduct('prod-asheville-full', (s) => statuses.push(s));
    expect(result).toBeNull();
    expect(statuses.some((s) => s.state === 'error')).toBe(true);
  });

  it('handles download error gracefully', async () => {
    mockGetInfo.mockResolvedValue({ exists: false });
    mockCreateDownload.mockReturnValue({
      downloadAsync: jest.fn().mockRejectedValue(new Error('Network timeout')),
    });

    const statuses: ModelLoadStatus[] = [];
    const result = await loadModelForProduct('prod-asheville-full', (s) => statuses.push(s));
    expect(result).toBeNull();
    expect(statuses).toContainEqual({ state: 'error', message: 'Network timeout' });
  });

  it('handles non-Error throw gracefully', async () => {
    mockGetInfo.mockResolvedValue({ exists: false });
    mockCreateDownload.mockReturnValue({
      downloadAsync: jest.fn().mockRejectedValue('string error'),
    });

    const statuses: ModelLoadStatus[] = [];
    const result = await loadModelForProduct('prod-asheville-full', (s) => statuses.push(s));
    expect(result).toBeNull();
    expect(statuses).toContainEqual({ state: 'error', message: 'Download failed' });
  });

  it('works without onProgress callback', async () => {
    mockGetInfo.mockResolvedValue({ exists: false });
    mockCreateDownload.mockReturnValue({
      downloadAsync: jest.fn().mockResolvedValue({
        uri: '/mock-cache/model.usdz',
        status: 200,
      }),
    });
    // Should not throw
    const result = await loadModelForProduct('prod-asheville-full');
    expect(result).toBe('/mock-cache/model.usdz');
  });

  it('reports download progress via callback', async () => {
    mockGetInfo.mockResolvedValue({ exists: false });

    let progressCallback: any;
    mockCreateDownload.mockImplementation((_url, _path, _opts, onProgress) => {
      progressCallback = onProgress;
      return {
        downloadAsync: jest.fn().mockImplementation(async () => {
          // Simulate progress
          progressCallback({ totalBytesWritten: 50, totalBytesExpectedToWrite: 100 });
          progressCallback({ totalBytesWritten: 100, totalBytesExpectedToWrite: 100 });
          return { uri: '/mock-cache/model.usdz', status: 200 };
        }),
      };
    });

    const statuses: ModelLoadStatus[] = [];
    await loadModelForProduct('prod-asheville-full', (s) => statuses.push(s));

    const downloadStatuses = statuses.filter((s) => s.state === 'downloading');
    expect(downloadStatuses.length).toBeGreaterThanOrEqual(2);
  });

  it('reports 0 progress when totalBytesExpectedToWrite is 0', async () => {
    mockGetInfo.mockResolvedValue({ exists: false });

    let progressCallback: any;
    mockCreateDownload.mockImplementation((_url, _path, _opts, onProgress) => {
      progressCallback = onProgress;
      return {
        downloadAsync: jest.fn().mockImplementation(async () => {
          progressCallback({ totalBytesWritten: 50, totalBytesExpectedToWrite: 0 });
          return { uri: '/mock-cache/model.usdz', status: 200 };
        }),
      };
    });

    const statuses: ModelLoadStatus[] = [];
    await loadModelForProduct('prod-asheville-full', (s) => statuses.push(s));

    const downloadWithZero = statuses.find(
      (s) => s.state === 'downloading' && 'progress' in s && s.progress === 0,
    );
    expect(downloadWithZero).toBeDefined();
  });
});

describe('prefetchModel', () => {
  it('silently succeeds for valid product', async () => {
    mockGetInfo.mockResolvedValue({ exists: false });
    mockCreateDownload.mockReturnValue({
      downloadAsync: jest.fn().mockResolvedValue({
        uri: '/mock-cache/model.usdz',
        status: 200,
      }),
    });
    // Should not throw
    await expect(prefetchModel('prod-asheville-full')).resolves.toBeUndefined();
  });

  it('silently fails for errors', async () => {
    mockGetInfo.mockRejectedValue(new Error('catastrophic'));
    // Should not throw — prefetch swallows errors
    await expect(prefetchModel('prod-asheville-full')).resolves.toBeUndefined();
  });
});

describe('clearModelCache', () => {
  it('deletes the cache directory', async () => {
    await clearModelCache();
    expect(mockDelete).toHaveBeenCalledWith(MODEL_CACHE_DIR, { idempotent: true });
  });

  it('handles delete failure gracefully', async () => {
    mockDelete.mockRejectedValue(new Error('not found'));
    await expect(clearModelCache()).resolves.toBeUndefined();
  });
});

describe('getModelCacheStats', () => {
  it('returns stats from manifest', async () => {
    mockGetInfo.mockResolvedValue({ exists: true });
    mockReadString.mockResolvedValue(
      JSON.stringify({
        entries: [
          {
            productId: 'a',
            fileName: 'a.usdz',
            contentHash: 'h',
            sizeBytes: 5_000_000,
            lastAccessedMs: 100,
          },
          {
            productId: 'b',
            fileName: 'b.usdz',
            contentHash: 'h2',
            sizeBytes: 3_000_000,
            lastAccessedMs: 200,
          },
        ],
      }),
    );
    const stats = await getModelCacheStats();
    expect(stats.entryCount).toBe(2);
    expect(stats.totalSizeBytes).toBe(8_000_000);
    expect(stats.budgetBytes).toBe(MODEL_CACHE_BUDGET_BYTES);
  });

  it('returns zero stats for empty cache', async () => {
    mockGetInfo.mockResolvedValue({ exists: false });
    const stats = await getModelCacheStats();
    expect(stats.entryCount).toBe(0);
    expect(stats.totalSizeBytes).toBe(0);
  });
});
