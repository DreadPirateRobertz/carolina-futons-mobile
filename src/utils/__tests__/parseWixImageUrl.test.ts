import { parseWixImageUrl } from '../parseWixImageUrl';

describe('parseWixImageUrl', () => {
  describe('valid wix:image:// URLs', () => {
    it('extracts mediaId and returns wixstatic CDN URL', () => {
      const url =
        'wix:image://v1/e04e89_abc123def456abc123def456abc12345/room1.jpg#originWidth=1200&originHeight=800';
      expect(parseWixImageUrl(url)).toBe(
        'https://static.wixstatic.com/media/e04e89_abc123def456abc123def456abc12345',
      );
    });

    it('handles mediaId with e04e89_ prefix', () => {
      const url =
        'wix:image://v1/e04e89_ff00aa11bb22cc33dd44ee55ff66aa77/photo.jpg#originWidth=800&originHeight=600';
      expect(parseWixImageUrl(url)).toBe(
        'https://static.wixstatic.com/media/e04e89_ff00aa11bb22cc33dd44ee55ff66aa77',
      );
    });

    it('handles URL without hash fragment', () => {
      const url = 'wix:image://v1/e04e89_abc123/room.jpg';
      expect(parseWixImageUrl(url)).toBe('https://static.wixstatic.com/media/e04e89_abc123');
    });

    it('handles URL without filename (bare mediaId)', () => {
      const url = 'wix:image://v1/e04e89_deadbeef12345678/';
      expect(parseWixImageUrl(url)).toBe(
        'https://static.wixstatic.com/media/e04e89_deadbeef12345678',
      );
    });

    it('handles different v1 path structures', () => {
      const url = 'wix:image://v1/11062b_someid/myimage.png#originWidth=400&originHeight=300';
      expect(parseWixImageUrl(url)).toBe('https://static.wixstatic.com/media/11062b_someid');
    });
  });

  describe('already-resolved https URLs (passthrough)', () => {
    it('returns wixstatic HTTPS URL unchanged', () => {
      const url = 'https://static.wixstatic.com/media/e04e89_abc123';
      expect(parseWixImageUrl(url)).toBe(url);
    });

    it('returns any https:// URL unchanged', () => {
      const url = 'https://example.com/image.jpg';
      expect(parseWixImageUrl(url)).toBe(url);
    });

    it('returns http:// URL unchanged', () => {
      const url = 'http://example.com/photo.png';
      expect(parseWixImageUrl(url)).toBe(url);
    });
  });

  describe('malformed / edge case inputs', () => {
    it('returns null for empty string', () => {
      expect(parseWixImageUrl('')).toBeNull();
    });

    it('returns null for null input', () => {
      expect(parseWixImageUrl(null as unknown as string)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(parseWixImageUrl(undefined as unknown as string)).toBeNull();
    });

    it('returns null for wix:image:// URL missing mediaId segment', () => {
      expect(parseWixImageUrl('wix:image://v1/')).toBeNull();
    });

    it('returns null for wix:image:// with empty v1 path', () => {
      expect(parseWixImageUrl('wix:image://v1')).toBeNull();
    });

    it('returns null for non-image wix: scheme', () => {
      expect(parseWixImageUrl('wix:video://v1/abc123/video.mp4')).toBeNull();
    });

    it('returns null for completely invalid string', () => {
      expect(parseWixImageUrl('not-a-url-at-all')).toBeNull();
    });
  });
});
