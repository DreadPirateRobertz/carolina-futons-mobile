/**
 * Wix API configuration.
 *
 * In production, these values come from environment variables or a secure config.
 * For development, they can be set via .env file (expo-constants).
 *
 * Required setup:
 * 1. Create a Wix API key at https://www.wix.com/my-account/site-selector
 * 2. Get your site ID from Wix Dashboard → Settings → Advanced
 * 3. Set WIX_API_KEY and WIX_SITE_ID in your .env file
 */

import type { WixClientConfig } from './wixClient';

// Default to empty — app will show config error if not set
const WIX_API_KEY = process.env.EXPO_PUBLIC_WIX_API_KEY ?? '';
const WIX_SITE_ID = process.env.EXPO_PUBLIC_WIX_SITE_ID ?? '';
const WIX_BASE_URL = process.env.EXPO_PUBLIC_WIX_BASE_URL ?? 'https://www.wixapis.com';

export function getWixConfig(): WixClientConfig {
  return {
    apiKey: WIX_API_KEY,
    siteId: WIX_SITE_ID,
    baseUrl: WIX_BASE_URL,
  };
}

export function isWixConfigured(): boolean {
  return WIX_API_KEY.length > 0 && WIX_SITE_ID.length > 0;
}
