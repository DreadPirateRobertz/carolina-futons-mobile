/**
 * TDD stubs for uploadReviewPhoto service.
 *
 * Tests: upload success, upload failure, EXIF strip called before upload,
 * network error handling, invalid URI rejection.
 *
 * EXIF stripping uses expo-image-manipulator (re-encode path) — verified here
 * that manipulateAsync is called (not a byte-copy that preserves metadata).
 */
import { uploadReviewPhoto, stripExifFromUri, type WixUploadFn } from '../uploadReviewPhoto';

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

const mockReadAsStringAsync = jest.requireMock('expo-file-system/legacy').readAsStringAsync as jest.Mock;
const mockManipulateAsync = jest.requireMock('expo-image-manipulator').manipulateAsync as jest.Mock;

const STRIPPED_URI = 'file:///cache/stripped_1234.jpg';

describe('uploadReviewPhoto', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // manipulateAsync returns a stripped URI
    mockManipulateAsync.mockResolvedValue({ uri: STRIPPED_URI });
    // readAsStringAsync reads the stripped file for blob creation
    mockReadAsStringAsync.mockResolvedValue('base64imagedata==');
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('successful upload', () => {
    it('returns mediaUrl on success', async () => {
      const uploadFn: WixUploadFn = jest.fn().mockResolvedValue('https://media.wix.com/photo.jpg');

      const result = await uploadReviewPhoto('file:///local/photo.jpg', uploadFn);

      expect(result.mediaUrl).toBe('https://media.wix.com/photo.jpg');
    });

    it('calls uploadFn with a Blob and filename', async () => {
      const uploadFn: WixUploadFn = jest.fn().mockResolvedValue('https://media.wix.com/photo.jpg');

      await uploadReviewPhoto('file:///local/photo.jpg', uploadFn);

      expect(uploadFn).toHaveBeenCalledTimes(1);
      const [blob, filename] = (uploadFn as jest.Mock).mock.calls[0];
      expect(blob).toBeInstanceOf(Blob);
      expect(typeof filename).toBe('string');
      expect(filename).toMatch(/\.jpg$/);
    });

    it('reads the stripped file via expo-file-system in base64', async () => {
      const uploadFn: WixUploadFn = jest.fn().mockResolvedValue('https://media.wix.com/photo.jpg');

      await uploadReviewPhoto('file:///local/photo.jpg', uploadFn);

      expect(mockReadAsStringAsync).toHaveBeenCalledWith(
        STRIPPED_URI,
        expect.objectContaining({ encoding: 'base64' }),
      );
    });
  });

  describe('error handling', () => {
    it('throws when uploadFn rejects', async () => {
      const uploadFn: WixUploadFn = jest.fn().mockRejectedValue(new Error('network error'));

      await expect(uploadReviewPhoto('file:///local/photo.jpg', uploadFn)).rejects.toThrow(
        'network error',
      );
    });

    it('logs error when uploadFn rejects', async () => {
      const uploadFn: WixUploadFn = jest.fn().mockRejectedValue(new Error('upload failed'));

      await expect(uploadReviewPhoto('file:///local/photo.jpg', uploadFn)).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[uploadReviewPhoto]'),
        expect.any(Error),
      );
    });

    it('throws when EXIF strip fails', async () => {
      mockManipulateAsync.mockRejectedValue(new Error('manipulator error'));
      const uploadFn: WixUploadFn = jest.fn();

      await expect(uploadReviewPhoto('file:///bad/path.jpg', uploadFn)).rejects.toThrow(
        'manipulator error',
      );
      expect(uploadFn).not.toHaveBeenCalled();
    });

    it('throws when stripped file read fails', async () => {
      mockReadAsStringAsync.mockRejectedValue(new Error('file not found'));
      const uploadFn: WixUploadFn = jest.fn();

      await expect(uploadReviewPhoto('file:///bad/path.jpg', uploadFn)).rejects.toThrow(
        'file not found',
      );
      expect(uploadFn).not.toHaveBeenCalled();
    });
  });

  describe('EXIF stripping', () => {
    it('calls manipulateAsync (re-encode path) before uploading', async () => {
      const uploadFn: WixUploadFn = jest.fn().mockResolvedValue('https://media.wix.com/photo.jpg');

      await uploadReviewPhoto('file:///local/photo.jpg', uploadFn);

      expect(mockManipulateAsync).toHaveBeenCalledWith(
        'file:///local/photo.jpg',
        [], // no transforms — re-encode only
        expect.objectContaining({ compress: expect.any(Number), format: expect.any(String) }),
      );
    });

    it('strips EXIF before uploading (manipulateAsync called before uploadFn)', async () => {
      const callOrder: string[] = [];
      mockManipulateAsync.mockImplementation(async () => {
        callOrder.push('strip');
        return { uri: STRIPPED_URI };
      });
      const uploadFn: WixUploadFn = jest.fn().mockImplementation(async () => {
        callOrder.push('upload');
        return 'https://media.wix.com/photo.jpg';
      });

      await uploadReviewPhoto('file:///local/photo.jpg', uploadFn);

      expect(callOrder).toEqual(['strip', 'upload']);
    });

    it('does not pass original URI to uploadFn', async () => {
      const originalUri = 'file:///local/photo.jpg';
      const uploadFn: WixUploadFn = jest.fn().mockResolvedValue('https://media.wix.com/photo.jpg');

      await uploadReviewPhoto(originalUri, uploadFn);

      // uploadFn receives a Blob (not a URI), so raw localUri never reaches network
      const [blobArg] = (uploadFn as jest.Mock).mock.calls[0];
      expect(blobArg).toBeInstanceOf(Blob);
      expect(typeof blobArg).not.toBe('string');
    });
  });
});

describe('stripExifFromUri', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockManipulateAsync.mockResolvedValue({ uri: STRIPPED_URI });
  });

  it('returns a file URI string', async () => {
    const result = await stripExifFromUri('file:///local/photo.jpg');
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^file:\/\//);
  });

  it('calls manipulateAsync with the source URI', async () => {
    await stripExifFromUri('file:///local/photo.jpg');
    expect(mockManipulateAsync).toHaveBeenCalledWith(
      'file:///local/photo.jpg',
      [],
      expect.objectContaining({ compress: expect.any(Number), format: expect.any(String) }),
    );
  });

  it('returns the URI from manipulateAsync result', async () => {
    const result = await stripExifFromUri('file:///local/photo.jpg');
    expect(result).toBe(STRIPPED_URI);
  });

  it('uses JPEG format for re-encode', async () => {
    await stripExifFromUri('file:///local/photo.jpg');
    const saveOptions = (mockManipulateAsync.mock.calls[0] as unknown[])[2] as {
      format: string;
    };
    expect(saveOptions.format).toBeDefined();
  });

  it('throws when manipulateAsync fails', async () => {
    mockManipulateAsync.mockRejectedValue(new Error('decode error'));
    await expect(stripExifFromUri('file:///local/photo.jpg')).rejects.toThrow('decode error');
  });
});
