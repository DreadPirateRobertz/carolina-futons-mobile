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

// Dynamic lookup avoids babel-preset-expo inlining EXPO_PUBLIC_ vars at build time.
function env(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

/** Build a WixClientConfig from EXPO_PUBLIC_* environment variables. */
export function getWixConfig(): WixClientConfig {
  return {
    apiKey: env('EXPO_PUBLIC_WIX_API_KEY'),
    siteId: env('EXPO_PUBLIC_WIX_SITE_ID'),
    baseUrl: env('EXPO_PUBLIC_WIX_BASE_URL', 'https://www.wixapis.com'),
  };
}

/** Returns true when both the API key and site ID are present in the environment. */
export function isWixConfigured(): boolean {
  return env('EXPO_PUBLIC_WIX_API_KEY').length > 0 && env('EXPO_PUBLIC_WIX_SITE_ID').length > 0;
}
