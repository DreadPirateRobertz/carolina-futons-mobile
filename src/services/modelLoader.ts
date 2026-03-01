/**
 * 3D model asset loader for AR "View in Your Room".
 *
 * Responsibilities:
 * - Resolve platform-appropriate model URL (USDZ on iOS, GLB on Android)
 * - Download model to local cache directory
 * - Track download progress for UI feedback
 * - LRU disk cache with configurable budget
 * - Prefetch models in the background
 *
 * Artemis's AR view calls `loadModelForProduct()` — this returns
 * a local file URI ready to pass to the AR renderer.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

import { getModel3DForProduct, type Model3DAsset } from '@/data/models3d';

/** Maximum disk cache budget for 3D models (200 MB) */
export const MODEL_CACHE_BUDGET_BYTES = 200 * 1024 * 1024;

/** Directory within app cache for 3D model files */
export const MODEL_CACHE_DIR = `${FileSystem.cacheDirectory}models3d/`;

/** Cache manifest stored alongside model files */
interface CacheManifest {
  entries: CacheEntry[];
}

interface CacheEntry {
  productId: string;
  fileName: string;
  contentHash: string;
  sizeBytes: number;
  lastAccessedMs: number;
}

export type ModelLoadStatus =
  | { state: 'idle' }
  | { state: 'checking-cache' }
  | { state: 'downloading'; progress: number }
  | { state: 'ready'; localUri: string }
  | { state: 'error'; message: string };

export type ProgressCallback = (status: ModelLoadStatus) => void;

/** Get platform-appropriate model URL */
export function getModelUrl(asset: Model3DAsset): string {
  return Platform.OS === 'ios' ? asset.usdzUrl : asset.glbUrl;
}

/** Get platform-appropriate file extension */
export function getModelExtension(): string {
  return Platform.OS === 'ios' ? 'usdz' : 'glb';
}

/** Build local cache file path for a model */
export function getCacheFilePath(productId: string, contentHash: string): string {
  const ext = getModelExtension();
  return `${MODEL_CACHE_DIR}${productId}-${contentHash}.${ext}`;
}

/** Path to the cache manifest JSON */
export function getManifestPath(): string {
  return `${MODEL_CACHE_DIR}manifest.json`;
}

/** Read the cache manifest, returning empty manifest if none exists */
export async function readManifest(): Promise<CacheManifest> {
  try {
    const path = getManifestPath();
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return { entries: [] };
    const raw = await FileSystem.readAsStringAsync(path);
    return JSON.parse(raw) as CacheManifest;
  } catch {
    return { entries: [] };
  }
}

/** Write the cache manifest */
export async function writeManifest(manifest: CacheManifest): Promise<void> {
  await ensureCacheDir();
  await FileSystem.writeAsStringAsync(getManifestPath(), JSON.stringify(manifest));
}

/** Ensure the cache directory exists */
export async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(MODEL_CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MODEL_CACHE_DIR, { intermediates: true });
  }
}

/** Check if a model is already cached and valid */
export async function getCachedModel(
  productId: string,
  contentHash: string,
): Promise<string | null> {
  const filePath = getCacheFilePath(productId, contentHash);
  const info = await FileSystem.getInfoAsync(filePath);
  if (info.exists) {
    // Touch the access time in manifest
    const manifest = await readManifest();
    const entry = manifest.entries.find(
      (e) => e.productId === productId && e.contentHash === contentHash,
    );
    if (entry) {
      entry.lastAccessedMs = Date.now();
      await writeManifest(manifest);
    }
    return filePath;
  }
  return null;
}

/** Calculate total cache size from manifest */
export function calculateCacheSize(manifest: CacheManifest): number {
  return manifest.entries.reduce((sum, e) => sum + e.sizeBytes, 0);
}

/** Evict least-recently-used entries until we have room for newBytes */
export async function evictIfNeeded(
  manifest: CacheManifest,
  newBytes: number,
): Promise<CacheManifest> {
  let currentSize = calculateCacheSize(manifest);
  // Sort by lastAccessed ascending (oldest first)
  const sorted = [...manifest.entries].sort((a, b) => a.lastAccessedMs - b.lastAccessedMs);
  const remaining = [...manifest.entries];

  for (const entry of sorted) {
    if (currentSize + newBytes <= MODEL_CACHE_BUDGET_BYTES) break;
    // Delete the file
    const filePath = getCacheFilePath(entry.productId, entry.contentHash);
    try {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    } catch {
      // File may already be gone
    }
    const idx = remaining.findIndex(
      (e) => e.productId === entry.productId && e.contentHash === entry.contentHash,
    );
    if (idx !== -1) {
      remaining.splice(idx, 1);
      currentSize -= entry.sizeBytes;
    }
  }

  return { entries: remaining };
}

/**
 * Load a 3D model for a product, downloading if needed.
 *
 * This is the main entry point Artemis's "View in Your Room" button calls.
 *
 * @param productId - The product ID (e.g. 'prod-asheville-full')
 * @param onProgress - Optional callback for download progress updates
 * @returns Local file URI for the model, or null if no AR model exists
 */
export async function loadModelForProduct(
  productId: string,
  onProgress?: ProgressCallback,
): Promise<string | null> {
  const notify = onProgress ?? (() => {});

  // 1. Look up the model asset
  const asset = getModel3DForProduct(productId);
  if (!asset) {
    notify({ state: 'error', message: 'No AR model available for this product' });
    return null;
  }

  notify({ state: 'checking-cache' });

  // 2. Check cache
  const cached = await getCachedModel(asset.productId, asset.contentHash);
  if (cached) {
    notify({ state: 'ready', localUri: cached });
    return cached;
  }

  // 3. Download
  notify({ state: 'downloading', progress: 0 });
  await ensureCacheDir();

  const remoteUrl = getModelUrl(asset);
  const localPath = getCacheFilePath(asset.productId, asset.contentHash);

  try {
    // Evict if needed before downloading
    let manifest = await readManifest();
    manifest = await evictIfNeeded(manifest, asset.fileSizeBytes);

    const downloadResumable = FileSystem.createDownloadResumable(
      remoteUrl,
      localPath,
      {},
      (downloadProgress) => {
        const progress =
          downloadProgress.totalBytesExpectedToWrite > 0
            ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
            : 0;
        notify({ state: 'downloading', progress });
      },
    );

    const result = await downloadResumable.downloadAsync();
    if (!result) {
      notify({ state: 'error', message: 'Download failed' });
      return null;
    }

    // 4. Update manifest
    manifest.entries.push({
      productId: asset.productId,
      fileName: `${asset.productId}-${asset.contentHash}.${getModelExtension()}`,
      contentHash: asset.contentHash,
      sizeBytes: asset.fileSizeBytes,
      lastAccessedMs: Date.now(),
    });
    await writeManifest(manifest);

    notify({ state: 'ready', localUri: result.uri });
    return result.uri;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Download failed';
    notify({ state: 'error', message });
    return null;
  }
}

/**
 * Prefetch a model in the background (no progress reporting).
 * Call this when the user views a product detail page.
 */
export async function prefetchModel(productId: string): Promise<void> {
  try {
    await loadModelForProduct(productId);
  } catch {
    // Silent fail for prefetch — model will download on-demand later
  }
}

/**
 * Clear the entire 3D model cache.
 */
export async function clearModelCache(): Promise<void> {
  try {
    await FileSystem.deleteAsync(MODEL_CACHE_DIR, { idempotent: true });
  } catch {
    // Directory may not exist
  }
}

/**
 * Get cache stats for diagnostics.
 */
export async function getModelCacheStats(): Promise<{
  entryCount: number;
  totalSizeBytes: number;
  budgetBytes: number;
}> {
  const manifest = await readManifest();
  return {
    entryCount: manifest.entries.length,
    totalSizeBytes: calculateCacheSize(manifest),
    budgetBytes: MODEL_CACHE_BUDGET_BYTES,
  };
}
