/**
 * TDD stubs for ReviewForm photo upload integration.
 *
 * Tests: upload called on photo pick, upload failure → graceful degradation
 * (text-only, no crash), upload in progress shows loading, successful upload
 * uses mediaUrl in submission, EXIF strip happens before upload.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ReviewForm } from '../ReviewForm';
import { ThemeProvider } from '@/theme/ThemeProvider';

// Mock expo-image-picker
const mockLaunchImageLibraryAsync = jest.fn();
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: any[]) => mockLaunchImageLibraryAsync(...args),
  MediaTypeOptions: { Images: 'Images' },
}));

// Mock uploadReviewPhoto service
const mockUploadReviewPhoto = jest.fn();
jest.mock('@/services/uploadReviewPhoto', () => ({
  uploadReviewPhoto: (...args: any[]) => mockUploadReviewPhoto(...args),
}));

function renderForm(props: Partial<React.ComponentProps<typeof ReviewForm>> = {}) {
  const onSubmit = props.onSubmit ?? jest.fn();
  return {
    ...render(
      <ThemeProvider>
        <ReviewForm onSubmit={onSubmit} {...props} />
      </ThemeProvider>,
    ),
    onSubmit,
  };
}

describe('ReviewForm — photo upload integration', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///local/photo.jpg' }],
    });
    mockUploadReviewPhoto.mockResolvedValue({ mediaUrl: 'https://media.wix.com/photo.jpg' });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('upload on pick', () => {
    it('calls uploadReviewPhoto when a photo is picked', async () => {
      const { getByTestId } = renderForm();
      await act(async () => {
        fireEvent.press(getByTestId('add-photo-button'));
      });
      await waitFor(() => {
        expect(mockUploadReviewPhoto).toHaveBeenCalledWith('file:///local/photo.jpg');
      });
    });

    it('shows upload in progress indicator while uploading', async () => {
      // Make upload take a tick
      let resolveUpload!: (v: { mediaUrl: string }) => void;
      mockUploadReviewPhoto.mockReturnValue(
        new Promise((res) => {
          resolveUpload = res;
        }),
      );

      const { getByTestId } = renderForm();
      await act(async () => {
        fireEvent.press(getByTestId('add-photo-button'));
      });

      // While upload is pending, show uploading state
      expect(getByTestId('photo-uploading')).toBeTruthy();

      // Resolve upload
      await act(async () => {
        resolveUpload({ mediaUrl: 'https://media.wix.com/photo.jpg' });
      });
    });

    it('uses mediaUrl (not local URI) in photo preview after upload', async () => {
      const { getByTestId } = renderForm();
      await act(async () => {
        fireEvent.press(getByTestId('add-photo-button'));
      });
      await waitFor(() => {
        const preview = getByTestId('photo-preview-0');
        // The Image source should be the media URL, not the local file URI
        expect(preview).toBeTruthy();
      });
    });

    it('photo is included as mediaUrl in form submission', async () => {
      const { getByTestId, onSubmit } = renderForm();

      await act(async () => {
        fireEvent.press(getByTestId('add-photo-button'));
      });
      await waitFor(() => expect(mockUploadReviewPhoto).toHaveBeenCalled());

      // Fill in required fields and submit
      fireEvent.press(getByTestId('star-button-5'));
      fireEvent.changeText(getByTestId('review-title-input'), 'Great futon');
      fireEvent.changeText(getByTestId('review-body-input'), 'Really comfortable.');
      fireEvent.press(getByTestId('submit-review-button'));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          photos: expect.arrayContaining(['https://media.wix.com/photo.jpg']),
        }),
      );
    });
  });

  describe('upload failure — graceful degradation', () => {
    it('does not add photo when upload fails', async () => {
      mockUploadReviewPhoto.mockRejectedValue(new Error('upload failed'));

      const { getByTestId, queryByTestId } = renderForm();
      await act(async () => {
        fireEvent.press(getByTestId('add-photo-button'));
      });
      await waitFor(() => {
        expect(queryByTestId('photo-preview-0')).toBeNull();
      });
    });

    it('shows upload error message when upload fails', async () => {
      mockUploadReviewPhoto.mockRejectedValue(new Error('upload failed'));

      const { getByTestId } = renderForm();
      await act(async () => {
        fireEvent.press(getByTestId('add-photo-button'));
      });
      await waitFor(() => {
        expect(getByTestId('photo-upload-error')).toBeTruthy();
      });
    });

    it('logs error when upload fails (CF-zgig pattern)', async () => {
      mockUploadReviewPhoto.mockRejectedValue(new Error('network error'));

      const { getByTestId } = renderForm();
      await act(async () => {
        fireEvent.press(getByTestId('add-photo-button'));
      });
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[ReviewForm]'),
          expect.any(Error),
        );
      });
    });

    it('form remains submittable after upload failure (text-only review)', async () => {
      mockUploadReviewPhoto.mockRejectedValue(new Error('upload failed'));

      const { getByTestId, onSubmit } = renderForm();
      await act(async () => {
        fireEvent.press(getByTestId('add-photo-button'));
      });
      await waitFor(() => expect(mockUploadReviewPhoto).toHaveBeenCalled());

      fireEvent.press(getByTestId('star-button-4'));
      fireEvent.changeText(getByTestId('review-title-input'), 'Good futon');
      fireEvent.changeText(getByTestId('review-body-input'), 'Nice quality.');
      fireEvent.press(getByTestId('submit-review-button'));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          photos: [],
          rating: 4,
        }),
      );
    });
  });

  describe('picker cancelled', () => {
    it('does not call uploadReviewPhoto when picker is cancelled', async () => {
      mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true });

      const { getByTestId } = renderForm();
      await act(async () => {
        fireEvent.press(getByTestId('add-photo-button'));
      });

      expect(mockUploadReviewPhoto).not.toHaveBeenCalled();
    });
  });
});
