/**
 * WixClient singleton for hooks that need API access outside WixProvider context.
 * Returns null when Wix is not configured (no API key/site ID).
 */

import { WixClient } from './wixClient';
import { getWixConfig, isWixConfigured } from './config';

let client: WixClient | null = null;

export function getWixClientInstance(): WixClient | null {
  if (!isWixConfigured()) return null;
  if (!client) {
    client = new WixClient(getWixConfig());
  }
  return client;
}

export function resetWixClientInstance(): void {
  client = null;
}
