/**
 * @module parseWixImageUrl
 *
 * Converts Wix media references in the format:
 *   wix:image://v1/<mediaId>/<filename>#originWidth=<w>&originHeight=<h>
 * into a standard HTTPS CDN URL:
 *   https://static.wixstatic.com/media/<mediaId>
 *
 * Passes through any URL that is already https:// or http://.
 * Returns null for empty, null, undefined, or unrecognisable inputs.
 */

const WIX_IMAGE_PREFIX = 'wix:image://v1/';
const WIXSTATIC_BASE = 'https://static.wixstatic.com/media/';

/**
 * Resolve a Wix image reference to an HTTPS CDN URL.
 *
 * @param url - A `wix:image://v1/...` string, an existing https URL, or null/undefined.
 * @returns The resolved CDN URL, the original URL (if already https/http), or null on failure.
 */
export function parseWixImageUrl(url: string): string | null {
  if (!url) return null;

  // Already a standard URL — pass through unchanged
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url;
  }

  // Only handle wix:image:// scheme
  if (!url.startsWith(WIX_IMAGE_PREFIX)) {
    return null;
  }

  // Strip the prefix and any hash fragment (#originWidth=...)
  const withoutPrefix = url.slice(WIX_IMAGE_PREFIX.length);
  const withoutHash = withoutPrefix.split('#')[0];

  // Extract mediaId — the first path segment before any slash+filename
  const mediaId = withoutHash.split('/')[0];

  if (!mediaId) return null;

  return WIXSTATIC_BASE + mediaId;
}
