// src/utils/__tests__/wixImageUrl.test.ts
import { wixImageUrl } from '../wixImageUrl';

const BARE = 'https://static.wixstatic.com/media/cc389e_abc123~mv2.jpg';
const WITH_TRANSFORM =
  'https://static.wixstatic.com/media/cc389e_abc123~mv2.jpg/v1/fit/w_2000,h_1330,q_90/file.jpg';
const WIX_SCHEME =
  'wix:image://v1/cc389e_abc123~mv2.jpg/photo.jpg#originWidth=2000&originHeight=1330';
const NON_WIX = 'https://example.com/image.jpg';

describe('wixImageUrl', () => {
  describe('bare wixstatic URL (no transform)', () => {
    it('appends transform with width, height, webp', () => {
      const result = wixImageUrl(BARE, { width: 400, height: 400 });
      expect(result).toMatch(/\/v1\/fill\//);
      expect(result).toMatch(/w_400/);
      expect(result).toMatch(/h_400/);
      expect(result).toMatch(/enc_webp/);
    });

    it('uses default quality 85', () => {
      const result = wixImageUrl(BARE, { width: 400, height: 400 });
      expect(result).toMatch(/q_85/);
    });

    it('respects custom quality', () => {
      const result = wixImageUrl(BARE, { width: 200, height: 200, quality: 70 });
      expect(result).toMatch(/q_70/);
    });

    it('width-only omits height param', () => {
      const result = wixImageUrl(BARE, { width: 300 });
      expect(result).toMatch(/w_300/);
      expect(result).not.toMatch(/h_/);
    });
  });

  describe('URL with existing transform', () => {
    it('rewrites the transform segment, does not double-nest', () => {
      const result = wixImageUrl(WITH_TRANSFORM, { width: 400, height: 300 });
      expect(result).toMatch(/\/v1\/fill\//);
      expect(result).toMatch(/w_400/);
      expect(result).toMatch(/enc_webp/);
      // Should not contain the old w_2000
      expect(result).not.toMatch(/w_2000/);
      // Should not have duplicate /v1/
      const v1Count = (result?.match(/\/v1\//g) || []).length;
      expect(v1Count).toBe(1);
    });
  });

  describe('wix:image:// scheme', () => {
    it('resolves and applies transform', () => {
      const result = wixImageUrl(WIX_SCHEME, { width: 600, height: 400 });
      expect(result).toMatch(/static\.wixstatic\.com\/media\//);
      expect(result).toMatch(/w_600/);
      expect(result).toMatch(/enc_webp/);
    });
  });

  describe('non-Wix URL', () => {
    it('returns non-wixstatic URL unchanged', () => {
      const result = wixImageUrl(NON_WIX, { width: 400, height: 400 });
      expect(result).toBe(NON_WIX);
    });
  });

  describe('null / empty input', () => {
    it('returns null for null input', () => {
      expect(wixImageUrl(null, { width: 400 })).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(wixImageUrl(undefined, { width: 400 })).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(wixImageUrl('', { width: 400 })).toBeNull();
    });
  });

  describe('no options', () => {
    it('returns bare wixstatic URL unchanged when no dimensions given', () => {
      // Without dimensions we cannot construct a valid transform, pass through
      const result = wixImageUrl(BARE);
      expect(result).toBe(BARE);
    });

    it('returns URL-with-transform as-is when no dimensions given', () => {
      const result = wixImageUrl(WITH_TRANSFORM);
      // No width/height → can't resize, but should still inject enc_webp if possible
      // Implementation choice: pass through or add just enc_webp — either is fine.
      // Just ensure it doesn't throw and returns a string.
      expect(typeof result).toBe('string');
    });
  });

  describe('PNG source', () => {
    it('works with .png mediaIds', () => {
      const pngUrl =
        'https://static.wixstatic.com/media/cc389e_png123~mv2.png/v1/fit/w_2000,h_1333,q_90/file.png';
      const result = wixImageUrl(pngUrl, { width: 400, height: 300 });
      expect(result).toMatch(/enc_webp/);
      expect(result).toMatch(/w_400/);
    });
  });
});
