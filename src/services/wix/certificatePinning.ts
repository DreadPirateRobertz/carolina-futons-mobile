/**
 * @module certificatePinning
 *
 * JS-layer hostname allowlist for Wix API calls — cm-keo.
 *
 * This provides defense-in-depth against:
 *  - SSRF via misconfigured baseUrl
 *  - Accidental requests to non-Wix hosts
 *  - URL injection if baseUrl is sourced from untrusted input
 *
 * NOTE: This is NOT a substitute for TLS certificate pinning at the native
 * layer. For full cert pinning, configure Android network_security_config.xml
 * (via expo-build-properties) and iOS NSAppTransportSecurity in app.json.
 * Those platform-level controls pin the cert fingerprint at the OS level.
 *
 * This module provides the JS validation layer.
 */

/**
 * The set of trusted Wix API hostnames.
 * Only HTTPS requests to these hosts are permitted by validateWixEndpoint.
 */
export const ALLOWED_WIX_HOSTS: readonly string[] = [
  'www.wixapis.com', // Primary Wix REST API
  'manage.wix.com', // Wix management API
  'frog.wix.com', // Wix OAuth / authentication
  'www.wix.com', // Wix general API
  'editor.wix.com', // Wix editor API (for webMethods)
];

/**
 * Returns true if the hostname is in the trusted Wix host allowlist.
 * Performs exact-match only — no suffix matching to prevent subdomain spoofing.
 */
export function isAllowedWixHost(hostname: string): boolean {
  if (!hostname) return false;
  return (ALLOWED_WIX_HOSTS as string[]).includes(hostname);
}

/**
 * Validates that a URL targets a trusted Wix API host over HTTPS.
 *
 * Throws:
 *   - "Invalid URL: ..." if the URL cannot be parsed
 *   - "HTTPS required: ..." if the protocol is not https:
 *   - "Blocked request to untrusted host: ..." if the hostname is not in the allowlist
 */
export function validateWixEndpoint(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`HTTPS required — got ${parsed.protocol} for ${url}`);
  }

  if (!isAllowedWixHost(parsed.hostname)) {
    throw new Error(`Blocked request to untrusted host: ${parsed.hostname}`);
  }
}
