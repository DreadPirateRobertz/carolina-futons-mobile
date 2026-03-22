/**
 * @module parseWixVideoUrl
 *
 * Converts Wix video media references in the format:
 *   wix:video://v1/{videoId}/{filename}#posterUri={thumbnailId}/{thumb.jpg}
 * into standard HTTPS CDN URLs:
 *   https://video.wixstatic.com/video/{videoId}/{filename}
 *
 * Also extracts the optional poster (thumbnail) image URL from the
 * #posterUri hash fragment, returning a wixstatic media URL.
 *
 * Passes through existing https:// or http:// URLs unchanged.
 * Returns null for empty, null, undefined, or unrecognised inputs.
 */

const WIX_VIDEO_PREFIX = 'wix:video://v1/';
const WIXSTATIC_VIDEO_BASE = 'https://video.wixstatic.com/video/';
const WIXSTATIC_MEDIA_BASE = 'https://static.wixstatic.com/media/';

/**
 * Resolve a Wix video URI to an HTTPS CDN URL.
 *
 * @param uri - A `wix:video://v1/...` string, an existing https/http URL, or null/undefined.
 * @returns The resolved CDN video URL, the original URL (if already https/http), or null.
 */
export function parseWixVideoUrl(uri: string): string | null {
  if (!uri) return null;

  if (uri.startsWith('https://') || uri.startsWith('http://')) {
    return uri;
  }

  if (!uri.startsWith(WIX_VIDEO_PREFIX)) {
    return null;
  }

  // Strip prefix and hash fragment
  const withoutPrefix = uri.slice(WIX_VIDEO_PREFIX.length);
  const withoutHash = withoutPrefix.split('#')[0];

  if (!withoutHash) return null;

  return WIXSTATIC_VIDEO_BASE + withoutHash;
}

/**
 * Extract the poster (thumbnail) image URL from a Wix video URI's #posterUri fragment.
 *
 * Format: wix:video://v1/{videoId}/...#posterUri={thumbnailMediaId}/{thumb.jpg}&...
 *
 * @param uri - A `wix:video://v1/...` string.
 * @returns The wixstatic media CDN URL for the poster image, or null if unavailable.
 */
export function parseWixVideoPosterUrl(uri: string): string | null {
  if (!uri) return null;

  const hashIndex = uri.indexOf('#');
  if (hashIndex === -1) return null;

  const fragment = uri.slice(hashIndex + 1);
  const params = new URLSearchParams(fragment);
  const posterUri = params.get('posterUri');
  if (!posterUri) return null;

  // posterUri value: "{mediaId}/{filename}" — extract mediaId (first segment)
  const mediaId = posterUri.split('/')[0];
  if (!mediaId) return null;

  return WIXSTATIC_MEDIA_BASE + mediaId;
}
