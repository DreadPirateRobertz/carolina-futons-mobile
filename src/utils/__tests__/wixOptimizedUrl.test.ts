import { wixOptimizedUrl } from '../wixOptimizedUrl';

const WIX_JPEG_WITH_PARAMS =
  'https://static.wixstatic.com/media/cc389e_abc123~mv2.jpg/v1/fit/w_640,h_480,q_90/file.jpg';
const WIX_PNG_WITH_PARAMS =
  'https://static.wixstatic.com/media/cc389e_abc123~mv2.png/v1/fit/w_2000,h_1333,q_90/file.png';
const WIX_LARGE_WITH_PARAMS =
  'https://static.wixstatic.com/media/cc389e_abc123~mv2.jpg/v1/fit/w_2000,h_1330,q_90/file.jpg';
const WIX_BARE_URL = 'https://static.wixstatic.com/media/cc389e_abc123~mv2.jpg';
const NON_WIX_URL = 'https://cdn.carolinafutons.com/models/gemini.jpg';
const NON_WIX_HTTPS = 'https://example.com/image.jpg';

describe('wixOptimizedUrl', () => {
  describe('null / undefined / empty input', () => {
    it('returns null for null', () => {
      expect(wixOptimizedUrl(null)).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(wixOptimizedUrl(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(wixOptimizedUrl('')).toBeNull();
    });
  });

  describe('non-Wix URLs', () => {
    it('passes through non-Wix HTTPS URLs unchanged', () => {
      expect(wixOptimizedUrl(NON_WIX_HTTPS)).toBe(NON_WIX_HTTPS);
    });

    it('passes through non-Wix CDN URLs unchanged', () => {
      expect(wixOptimizedUrl(NON_WIX_URL)).toBe(NON_WIX_URL);
    });
  });

  describe('WebP conversion', () => {
    it('converts .jpg extension to .webp', () => {
      const result = wixOptimizedUrl(WIX_JPEG_WITH_PARAMS);
      expect(result).toMatch(/\/file\.webp$/);
      expect(result).not.toMatch(/\/file\.jpg/);
    });

    it('converts .png extension to .webp', () => {
      const result = wixOptimizedUrl(WIX_PNG_WITH_PARAMS);
      expect(result).toMatch(/\/file\.webp$/);
      expect(result).not.toMatch(/\/file\.png/);
    });

    it('returns null for null input even with options', () => {
      expect(wixOptimizedUrl(null, { width: 400 })).toBeNull();
    });
  });

  describe('quality override', () => {
    it('replaces q_90 with default quality q_85', () => {
      const result = wixOptimizedUrl(WIX_JPEG_WITH_PARAMS);
      expect(result).toContain('q_85');
      expect(result).not.toContain('q_90');
    });

    it('replaces quality with custom value', () => {
      const result = wixOptimizedUrl(WIX_JPEG_WITH_PARAMS, { quality: 70 });
      expect(result).toContain('q_70');
    });
  });

  describe('dimension overrides', () => {
    it('overrides width when provided', () => {
      const result = wixOptimizedUrl(WIX_JPEG_WITH_PARAMS, { width: 400 });
      expect(result).toContain('w_400');
      expect(result).not.toContain('w_640');
    });

    it('overrides height when provided', () => {
      const result = wixOptimizedUrl(WIX_JPEG_WITH_PARAMS, { height: 300 });
      expect(result).toContain('h_300');
      expect(result).not.toContain('h_480');
    });

    it('overrides both width and height', () => {
      const result = wixOptimizedUrl(WIX_LARGE_WITH_PARAMS, { width: 800, height: 600 });
      expect(result).toContain('w_800');
      expect(result).toContain('h_600');
    });

    it('preserves original dimensions when not overriding', () => {
      const result = wixOptimizedUrl(WIX_JPEG_WITH_PARAMS);
      expect(result).toContain('w_640');
      expect(result).toContain('h_480');
    });
  });

  describe('bare CDN URL (no /v1/fit/ params)', () => {
    it('appends default transform path with webp', () => {
      const result = wixOptimizedUrl(WIX_BARE_URL);
      expect(result).toContain('/v1/fit/');
      expect(result).toMatch(/\/file\.webp$/);
      expect(result).toContain('w_800');
      expect(result).toContain('h_600');
      expect(result).toContain('q_85');
    });

    it('appends custom dimensions to bare URL', () => {
      const result = wixOptimizedUrl(WIX_BARE_URL, { width: 400, height: 400 });
      expect(result).toContain('w_400');
      expect(result).toContain('h_400');
    });

    it('still returns webp for bare URL', () => {
      const result = wixOptimizedUrl(WIX_BARE_URL);
      expect(result).toMatch(/\/file\.webp$/);
    });
  });

  describe('idempotency', () => {
    it('is idempotent — applying twice gives the same result', () => {
      const once = wixOptimizedUrl(WIX_JPEG_WITH_PARAMS);
      const twice = wixOptimizedUrl(once);
      expect(twice).toBe(once);
    });
  });
});
