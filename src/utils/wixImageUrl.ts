/**
 * @module wixImageUrl
 *
 * Produces optimized Wix CDN URLs with resize and WebP encoding transforms.
 *
 * Wix CDN transform format:
 *   https://static.wixstatic.com/media/<mediaId>/v1/fill/w_W,h_H,al_c,q_Q,enc_webp/<mediaId>
 *
 * Supports:
 *   - Bare wixstatic URLs (no transform)     -> appends transform
 *   - wixstatic URLs with existing transform -> rewrites the transform
 *   - wix:image://v1/<mediaId>/... scheme    -> resolves then appends transform
 *   - Non-Wix URLs                           -> returned unchanged
 *   - null / undefined / empty string        -> returns null
 */

const WIXSTATIC_BASE = 'https://static.wixstatic.com/media/';
const WIX_IMAGE_PREFIX = 'wix:image://v1/';

/** Captures the mediaId from a wixstatic CDN URL (with or without a transform segment). */
const WIXSTATIC_RE =
  /^https:\/\/static\.wixstatic\.com\/media\/([^/?]+)(?:\/v1\/[^?]*)?(?:\?.*)?$/;

export interface WixImageOptions {
  /** Target render width in pixels. */
  width?: number;
  /** Target render height in pixels. */
  height?: number;
  /** JPEG quality 1-100. Default: 85. */
  quality?: number;
}

/**
 * Return an optimized Wix CDN URL for the given image reference.
 *
 * @param url  - wixstatic https URL, wix:image:// reference, or any other URL.
 * @param opts - Desired dimensions and quality.
 * @returns Optimized URL string, original non-Wix URL, or null for empty input.
 */
export function wixImageUrl(
  url: string | null | undefined,
  opts: WixImageOptions = {},
): string | null {
  if (!url) return null;

  const { width, height, quality = 85 } = opts;

  // Resolve wix:image:// scheme to a bare CDN URL first.
  let resolved = url;
  if (url.startsWith(WIX_IMAGE_PREFIX)) {
    const withoutPrefix = url.slice(WIX_IMAGE_PREFIX.length).split('#')[0];
    const mediaId = withoutPrefix.split('/')[0];
    if (!mediaId) return null;
    resolved = WIXSTATIC_BASE + mediaId;
  }

  // Non-Wix URL — pass through unchanged.
  const match = WIXSTATIC_RE.exec(resolved);
  if (!match) {
    return resolved.startsWith('https://') || resolved.startsWith('http://') ? resolved : null;
  }

  const mediaId = match[1];

  // No dimensions requested — return bare CDN URL without a transform.
  if (!width && !height) return resolved;

  // Build the transform parameter list.
  const parts: string[] = [];
  if (width) parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);
  parts.push('al_c', `q_${quality}`, 'enc_webp');

  return `${WIXSTATIC_BASE}${mediaId}/v1/fill/${parts.join(',')}/${mediaId}`;
}
