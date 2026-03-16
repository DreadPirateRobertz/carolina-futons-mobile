/**
 * Singleton accessor for WixClient.
 *
 * Module-level code (like prefetchCriticalData) runs outside the React tree
 * and cannot call useWixClient(). This module provides a shared WixClient
 * instance that is lazily created from environment variables.
 *
 * The React WixProvider creates its own instance — this singleton is only
 * for non-React code paths (prefetch, background sync, etc.).
 */

import { WixClient } from './wixClient';
import { getWixConfig, isWixConfigured } from './config';

let instance: WixClient | null = null;

/**
 * Returns a shared WixClient configured from EXPO_PUBLIC_WIX_* env vars.
 * Returns null if Wix is not configured (missing API key or site ID).
 * The instance is lazily created on first call and reused thereafter.
 */
export function getWixClientSingleton(): WixClient | null {
  if (instance) return instance;
  if (!isWixConfigured()) return null;
  instance = new WixClient(getWixConfig());
  return instance;
}

/** Reset the singleton (for tests). */
export function resetWixClientSingleton(): void {
  instance = null;
}
