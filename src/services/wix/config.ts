/**
 * Wix API configuration.
 *
 * SECURITY: The API key is a SECRET and must NEVER be compiled into the client
 * bundle. It uses the `WIX_API_KEY` env var (NOT `EXPO_PUBLIC_*`) so Expo does
 * not inline it. In production, all API calls must be routed through a backend
 * proxy via `EXPO_PUBLIC_WIX_PROXY_URL`. Direct API key usage is only permitted
 * in __DEV__ mode for local development.
 *
 * Required setup:
 * - Development: Set WIX_API_KEY, EXPO_PUBLIC_WIX_SITE_ID in .env
 * - Production: Set EXPO_PUBLIC_WIX_PROXY_URL, EXPO_PUBLIC_WIX_SITE_ID
 */

import type { WixClientConfig } from './wixClient';

function env(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

/** Build a WixClientConfig from environment variables. */
export function getWixConfig(): WixClientConfig {
  const proxyUrl = env('EXPO_PUBLIC_WIX_PROXY_URL');
  const siteId = env('EXPO_PUBLIC_WIX_SITE_ID');

  // In production: require proxy URL, never ship the API key
  if (!__DEV__ && !proxyUrl) {
    console.warn(
      'WIX: EXPO_PUBLIC_WIX_PROXY_URL is required in production. ' +
        'Direct API key usage is not allowed outside __DEV__ mode.',
    );
  }

  // API key is read from non-public env var (NOT compiled into bundle)
  const apiKey = __DEV__ ? env('WIX_API_KEY') : '';

  return {
    apiKey,
    siteId,
    baseUrl: proxyUrl || env('EXPO_PUBLIC_WIX_BASE_URL', 'https://www.wixapis.com'),
    proxyUrl: proxyUrl || undefined,
  };
}

/**
 * Returns true when Wix integration is usable:
 * - In __DEV__: API key + site ID must be present
 * - In production: proxy URL + site ID must be present
 */
export function isWixConfigured(): boolean {
  const siteId = env('EXPO_PUBLIC_WIX_SITE_ID');
  if (!siteId) return false;

  if (__DEV__) {
    return env('WIX_API_KEY').length > 0;
  }
  return env('EXPO_PUBLIC_WIX_PROXY_URL').length > 0;
}
