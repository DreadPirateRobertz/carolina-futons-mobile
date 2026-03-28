/**
 * Review photo upload service.
 *
 * Strips EXIF data from a local image URI before uploading to Wix Media.
 * EXIF stripping is a zhora security requirement — user location and device
 * metadata must never be sent to the server.
 *
 * Uses expo-image-manipulator to re-encode the JPEG, which drops all metadata
 * segments (EXIF APP1, GPS, device model, timestamps).
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

export interface ReviewPhotoUploadResult {
  mediaUrl: string;
}

/**
 * Injectable upload function — takes a Blob and filename, returns the
 * remote media URL. Swap out in tests without touching network code.
 */
export type WixUploadFn = (blob: Blob, filename: string) => Promise<string>;

/**
 * Strips EXIF metadata from a local JPEG URI by re-encoding the image via
 * expo-image-manipulator. The re-encode decodes the pixel data and writes a
 * fresh JPEG, dropping all metadata segments (EXIF APP1, GPS, device info,
 * timestamps). Returns a new local URI pointing to the stripped copy.
 */
export async function stripExifFromUri(localUri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [], // no geometric transforms — re-encode only
    { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

/**
 * Default upload implementation: POSTs a blob to the Wix Media upload endpoint.
 * In production, the site ID comes from the Wix config.
 */
export const defaultWixUploadFn: WixUploadFn = async (blob, filename) => {
  const formData = new FormData();
  formData.append('file', blob, filename);

  const response = await fetch('https://www.wixapis.com/site-media/v1/files/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`[uploadReviewPhoto] Wix Media upload failed: ${response.status}`);
  }

  const data = (await response.json()) as { file?: { url?: string } };
  const url = data.file?.url;
  if (!url) throw new Error('[uploadReviewPhoto] No URL in upload response');
  return url;
};

/**
 * Strips EXIF from a local image URI, then uploads it to Wix Media via the
 * provided uploadFn (defaults to the real Wix Media API).
 * Returns the remote mediaUrl on success.
 *
 * Throws on file read error or upload failure — callers are responsible for
 * graceful degradation (e.g. fall back to text-only review).
 */
export async function uploadReviewPhoto(
  localUri: string,
  uploadFn: WixUploadFn = defaultWixUploadFn,
): Promise<ReviewPhotoUploadResult> {
  try {
    // Strip EXIF before sending
    const strippedUri = await stripExifFromUri(localUri);

    // Read the stripped file as base64 to create a Blob
    const base64 = await FileSystem.readAsStringAsync(strippedUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const binaryData = Buffer.from(base64, 'base64');
    const blob = new Blob([binaryData], { type: 'image/jpeg' });

    const filename = `review_${Date.now()}.jpg`;
    const mediaUrl = await uploadFn(blob, filename);

    return { mediaUrl };
  } catch (e) {
    console.error('[uploadReviewPhoto] upload failed:', e);
    throw e;
  }
}
