import AsyncStorage from '@react-native-async-storage/async-storage';

const FIT_SCORE_KEY = '@cf_fit_score_cache';
const SOMMELIER_KEY = '@cf_sommelier_cache';
const TTL_MS = 60 * 60 * 1000; // 1 hour

export interface FitScoreCacheEntry {
  score: number;
  reasons: string[];
}

export interface SommelierCacheEntry {
  memberId: string;
  topStyle: string;
  flavors: string[];
  recommendations: unknown[];
}

async function readCache<T extends Record<string, unknown>>(key: string): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

export async function getCachedFitScore(
  productId: string,
  memberId: string,
): Promise<FitScoreCacheEntry | null> {
  try {
    const cache = await readCache<Record<string, FitScoreCacheEntry & { cachedAt: number }>>(
      FIT_SCORE_KEY,
    );
    const entry = cache[`${productId}_${memberId}`];
    if (!entry || Date.now() - entry.cachedAt > TTL_MS) return null;
    return { score: entry.score, reasons: entry.reasons };
  } catch {
    return null;
  }
}

export async function setCachedFitScore(
  productId: string,
  memberId: string,
  data: FitScoreCacheEntry,
): Promise<void> {
  try {
    const cache = await readCache<Record<string, FitScoreCacheEntry & { cachedAt: number }>>(
      FIT_SCORE_KEY,
    );
    cache[`${productId}_${memberId}`] = { ...data, cachedAt: Date.now() };
    await AsyncStorage.setItem(FIT_SCORE_KEY, JSON.stringify(cache));
  } catch {
    // non-fatal — cache write failure is acceptable
  }
}

export async function getCachedSommelierResult(
  memberId: string,
): Promise<SommelierCacheEntry | null> {
  try {
    const cache = await readCache<Record<string, SommelierCacheEntry & { cachedAt: number }>>(
      SOMMELIER_KEY,
    );
    const entry = cache[memberId];
    if (!entry || Date.now() - entry.cachedAt > TTL_MS) return null;
    const { cachedAt: _, ...rest } = entry;
    return rest;
  } catch {
    return null;
  }
}

export async function setCachedSommelierResult(
  memberId: string,
  data: SommelierCacheEntry,
): Promise<void> {
  try {
    const cache = await readCache<Record<string, SommelierCacheEntry & { cachedAt: number }>>(
      SOMMELIER_KEY,
    );
    cache[memberId] = { ...data, cachedAt: Date.now() };
    await AsyncStorage.setItem(SOMMELIER_KEY, JSON.stringify(cache));
  } catch {
    // non-fatal
  }
}

export async function invalidatePersonalizationCache(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(FIT_SCORE_KEY),
    AsyncStorage.removeItem(SOMMELIER_KEY),
  ]);
}
