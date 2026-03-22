import { parseWixVideoUrl, parseWixVideoPosterUrl } from '../parseWixVideoUrl';

describe('parseWixVideoUrl', () => {
  describe('valid wix:video:// URIs', () => {
    it('extracts videoId and returns wixstatic video CDN URL', () => {
      const uri =
        'wix:video://v1/e04e89_ea16ef6edfe64c03a5bfdd0ee468ab7f/1080p/mp4/file.mp4#posterUri=e04e89_abc123/image.jpg';
      expect(parseWixVideoUrl(uri)).toBe(
        'https://video.wixstatic.com/video/e04e89_ea16ef6edfe64c03a5bfdd0ee468ab7f/1080p/mp4/file.mp4',
      );
    });

    it('handles URI without posterUri fragment', () => {
      const uri = 'wix:video://v1/e04e89_abc123def456/video.mp4';
      expect(parseWixVideoUrl(uri)).toBe(
        'https://video.wixstatic.com/video/e04e89_abc123def456/video.mp4',
      );
    });

    it('handles URI with nested path (videoId/quality/codec/filename)', () => {
      const uri = 'wix:video://v1/e04e89_8483b56d2ef5417c95242c821934e2b2/1080p/mp4/file.mp4';
      expect(parseWixVideoUrl(uri)).toBe(
        'https://video.wixstatic.com/video/e04e89_8483b56d2ef5417c95242c821934e2b2/1080p/mp4/file.mp4',
      );
    });

    it('strips hash fragment from output URL', () => {
      const uri =
        'wix:video://v1/e04e89_abc123/vid.mp4#posterUri=e04e89_thumb/thumb.jpg&something=else';
      const result = parseWixVideoUrl(uri);
      expect(result).not.toContain('#');
      expect(result).not.toContain('posterUri');
    });
  });

  describe('https:// pass-through', () => {
    it('passes through https:// video URLs unchanged', () => {
      const url =
        'https://video.wixstatic.com/video/e04e89_ea16ef6edfe64c03a5bfdd0ee468ab7f/1080p/mp4/file.mp4';
      expect(parseWixVideoUrl(url)).toBe(url);
    });

    it('passes through http:// URLs unchanged', () => {
      const url = 'http://example.com/video.mp4';
      expect(parseWixVideoUrl(url)).toBe(url);
    });
  });

  describe('invalid / null inputs', () => {
    it('returns null for empty string', () => {
      expect(parseWixVideoUrl('')).toBeNull();
    });

    it('returns null for null', () => {
      expect(parseWixVideoUrl(null as unknown as string)).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(parseWixVideoUrl(undefined as unknown as string)).toBeNull();
    });

    it('returns null for wix:image:// URI (wrong scheme)', () => {
      expect(
        parseWixVideoUrl('wix:image://v1/e04e89_abc123/image.jpg#originWidth=800&originHeight=600'),
      ).toBeNull();
    });

    it('returns null for arbitrary string', () => {
      expect(parseWixVideoUrl('not-a-url')).toBeNull();
    });
  });
});

describe('parseWixVideoPosterUrl', () => {
  it('extracts posterUri and returns wixstatic CDN image URL', () => {
    const uri = 'wix:video://v1/e04e89_abc123/vid.mp4#posterUri=e04e89_thumb123abc/thumbnail.jpg';
    expect(parseWixVideoPosterUrl(uri)).toBe(
      'https://static.wixstatic.com/media/e04e89_thumb123abc',
    );
  });

  it('returns null when no posterUri in fragment', () => {
    const uri = 'wix:video://v1/e04e89_abc123/vid.mp4';
    expect(parseWixVideoPosterUrl(uri)).toBeNull();
  });

  it('returns null for https:// input (no wix fragment)', () => {
    const uri = 'https://video.wixstatic.com/video/e04e89_abc123/vid.mp4';
    expect(parseWixVideoPosterUrl(uri)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseWixVideoPosterUrl('')).toBeNull();
  });

  it('handles posterUri with nested path (strips to mediaId only)', () => {
    const uri =
      'wix:video://v1/e04e89_vid/vid.mp4#posterUri=e04e89_poster456def/image.jpg&extra=val';
    expect(parseWixVideoPosterUrl(uri)).toBe(
      'https://static.wixstatic.com/media/e04e89_poster456def',
    );
  });
});
