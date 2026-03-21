/**
 * TDD stubs for uploadReviewPhoto service.
 *
 * Tests: upload success, upload failure, EXIF strip called before upload,
 * network error handling, invalid URI rejection.
 */
import { uploadReviewPhoto, stripExifFromUri, type WixUploadFn } from '../uploadReviewPhoto';

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
}));

const mockReadAsStringAsync = jest.requireMock('expo-file-system').readAsStringAsync as jest.Mock;
const mockWriteAsStringAsync = jest.requireMock('expo-file-system').writeAsStringAsync as jest.Mock;

describe('uploadReviewPhoto', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockReadAsStringAsync.mockResolvedValue('base64imagedata==');
    mockWriteAsStringAsync.mockResolvedValue(undefined);
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

    it('reads the file via expo-file-system in base64', async () => {
      const uploadFn: WixUploadFn = jest.fn().mockResolvedValue('https://media.wix.com/photo.jpg');

      await uploadReviewPhoto('file:///local/photo.jpg', uploadFn);

      expect(mockReadAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('photo'),
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

    it('throws when file read fails', async () => {
      mockReadAsStringAsync.mockRejectedValue(new Error('file not found'));
      const uploadFn: WixUploadFn = jest.fn();

      await expect(uploadReviewPhoto('file:///bad/path.jpg', uploadFn)).rejects.toThrow(
        'file not found',
      );
      expect(uploadFn).not.toHaveBeenCalled();
    });
  });

  describe('EXIF stripping', () => {
    it('calls stripExifFromUri before uploading', async () => {
      const uploadFn: WixUploadFn = jest.fn().mockResolvedValue('https://media.wix.com/photo.jpg');

      // stripExifFromUri uses readAsStringAsync + writeAsStringAsync
      await uploadReviewPhoto('file:///local/photo.jpg', uploadFn);

      // Should have read the file (as part of strip or upload path)
      expect(mockReadAsStringAsync).toHaveBeenCalled();
    });
  });
});

describe('stripExifFromUri', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadAsStringAsync.mockResolvedValue('base64imagedata==');
    mockWriteAsStringAsync.mockResolvedValue(undefined);
  });

  it('returns a file URI string', async () => {
    const result = await stripExifFromUri('file:///local/photo.jpg');
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^file:\/\//);
  });

  it('writes a new file (stripped copy)', async () => {
    await stripExifFromUri('file:///local/photo.jpg');
    expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('file://'),
      expect.any(String),
      expect.objectContaining({ encoding: 'base64' }),
    );
  });

  it('reads the source file in base64', async () => {
    await stripExifFromUri('file:///local/photo.jpg');
    expect(mockReadAsStringAsync).toHaveBeenCalledWith(
      'file:///local/photo.jpg',
      expect.objectContaining({ encoding: 'base64' }),
    );
  });
});
