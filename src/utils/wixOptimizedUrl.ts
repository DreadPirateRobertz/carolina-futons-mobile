/**
 * @module wixOptimizedUrl
 *
 * Transforms Wix CDN image URLs to serve WebP with optional dimension overrides.
 *
 * Wix's image CDN supports format negotiation via URL path tokens:
 *   https://static.wixstatic.com/media/<id>/v1/fit/w_<W>,h_<H>,q_<Q>/file.<ext>
 *
 * Changing the trailing extension to `.webp` causes the CDN to transcode on the fly.
 * WebP at q_85 is visually equivalent to JPEG at q_95+ with 25-35% smaller payload.
 *
 * Usage:
 *   wixOptimizedUrl(product.images[0].uri)
 *   wixOptimizedUrl(item.imageUrl, { width: 400, height: 400 })
 *   wixOptimizedUrl(url, { quality: 80 })
 *
 * Non-Wix URLs are returned unchanged (safe to call unconditionally).
 */

const WIXSTATIC_MEDIA_RE = /^https?:\/\/static\.wixstatic\.com\/media\//;
const FILE_EXT_RE = /\/file\.(jpe?g|png|gif|webp)$/i;
const FIT_PARAMS_RE = /\/v1\/fit\//;
const PARAM_W_RE = /\bw_\d+/;
const PARAM_H_RE = /\bh_\d+/;
const PARAM_Q_RE = /\bq_\d+/;

export interface WixOptimizeOptions {
  /** Override image width in pixels. Only applied when URL already has /v1/fit/ params. */
  width?: number;
  /** Override image height in pixels. Only applied when URL already has /v1/fit/ params. */
  height?: number;
  /**
   * Output quality (1–100). Defaults to 85.
   * WebP at 85 is visually lossless vs JPEG at 90+ but ~30% smaller.
   */
  quality?: number;
}

/**
 * Returns an optimized WebP variant of a Wix CDN image URL.
 *
 * - Preserves existing dimension params; only substitutes the file extension.
 * - Optionally overrides width, height, and quality.
 * - Falls back to sensible defaults (800×600) when a bare CDN URL is given.
 * - Returns non-Wix URLs and null/undefined unchanged.
 */
export function wixOptimizedUrl(
  url: string | null | undefined,
  { width, height, quality = 85 }: WixOptimizeOptions = {},
): string | null {
  if (!url) return null;

  if (!WIXSTATIC_MEDIA_RE.test(url)) {
    return url;
  }

  // URL already has /v1/fit/ transform params — patch in-place
  if (FIT_PARAMS_RE.test(url)) {
    let result = url;
    if (width !== undefined) result = result.replace(PARAM_W_RE, `w_${width}`);
    if (height !== undefined) result = result.replace(PARAM_H_RE, `h_${height}`);
    result = result.replace(PARAM_Q_RE, `q_${quality}`);
    result = result.replace(FILE_EXT_RE, '/file.webp');
    return result;
  }

  // Bare CDN URL (no transform path) — append a transform segment
  const w = width ?? 800;
  const h = height ?? 600;
  return `${url}/v1/fit/w_${w},h_${h},q_${quality}/file.webp`;
}
