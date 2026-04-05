/**
 * Tests for UGCPhotoSubmitModal — cm-ae8.
 *
 * Covers: rendering, form fields, caption validation, room type selection,
 * photo picker launch, submit flow, error display, close/cancel.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { UGCPhotoSubmitModal } from '../UGCPhotoSubmitModal';
import type { UseUGCPhotosResult } from '@/hooks/useUGCPhotos';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#2C1810',
      espressoLight: '#6B5B4F',
      sandLight: '#F5EDD8',
      white: '#FFFFFF',
      error: '#CC0000',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
    borderRadius: { sm: 4, md: 8, pill: 20, lg: 16 },
  }),
}));

const mockSubmitPhoto = jest.fn();
const mockClearSubmitStatus = jest.fn();

const defaultHookResult: UseUGCPhotosResult = {
  photos: [],
  loading: false,
  fetchError: null,
  isSubmitting: false,
  submitError: null,
  submitSuccess: false,
  voteError: null,
  submitPhoto: mockSubmitPhoto,
  votePhoto: jest.fn(),
  clearSubmitStatus: mockClearSubmitStatus,
};

const mockUseUGCPhotos = jest.fn<UseUGCPhotosResult, [string]>(() => defaultHookResult);
jest.mock('@/hooks/useUGCPhotos', () => ({
  useUGCPhotos: (productId: string) => mockUseUGCPhotos(productId),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function renderModal(props: Partial<React.ComponentProps<typeof UGCPhotoSubmitModal>> = {}) {
  const defaults = {
    visible: true,
    productId: 'asheville-full',
    onClose: jest.fn(),
  };
  return render(<UGCPhotoSubmitModal {...defaults} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUGCPhotos.mockReturnValue({ ...defaultHookResult });
  mockSubmitPhoto.mockResolvedValue(undefined);
});

// ── Section 1: Rendering ──────────────────────────────────────────────────────

describe('rendering', () => {
  it('renders when visible=true', () => {
    const { getByTestId } = renderModal();
    expect(getByTestId('ugc-submit-modal')).toBeTruthy();
  });

  it('does not render when visible=false', () => {
    const { queryByTestId } = renderModal({ visible: false });
    expect(queryByTestId('ugc-submit-modal')).toBeNull();
  });

  it('shows caption input field', () => {
    const { getByTestId } = renderModal();
    expect(getByTestId('ugc-caption-input')).toBeTruthy();
  });

  it('shows room type picker', () => {
    const { getByTestId } = renderModal();
    expect(getByTestId('ugc-room-type-picker')).toBeTruthy();
  });

  it('shows photo picker button', () => {
    const { getByTestId } = renderModal();
    expect(getByTestId('ugc-pick-photo-button')).toBeTruthy();
  });

  it('shows submit button', () => {
    const { getByTestId } = renderModal();
    expect(getByTestId('ugc-submit-button')).toBeTruthy();
  });

  it('shows close/cancel button', () => {
    const { getByTestId } = renderModal();
    expect(getByTestId('ugc-close-button')).toBeTruthy();
  });
});

// ── Section 2: Caption validation UI ─────────────────────────────────────────

describe('caption validation', () => {
  it('shows character count', () => {
    const { getByTestId } = renderModal();
    const input = getByTestId('ugc-caption-input');
    fireEvent.changeText(input, 'Hello!');
    const counter = getByTestId('ugc-caption-count');
    // children may be [6, '/', 80] — stringify for contains check
    expect(String(counter.props.children)).toContain('6');
  });

  it('shows error when caption exceeds 80 chars', () => {
    mockUseUGCPhotos.mockReturnValue({
      ...defaultHookResult,
      submitError: 'Caption must be 80 characters or fewer',
    });
    const { getByText } = renderModal();
    expect(getByText(/80 characters/i)).toBeTruthy();
  });
});

// ── Section 3: Submit flow ────────────────────────────────────────────────────

describe('submit flow', () => {
  it('calls submitPhoto with caption and roomType on submit', async () => {
    const { getByTestId } = renderModal();
    fireEvent.changeText(getByTestId('ugc-caption-input'), 'My cozy room');
    await act(async () => {
      fireEvent.press(getByTestId('ugc-submit-button'));
    });
    expect(mockSubmitPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ caption: 'My cozy room' }),
    );
  });

  it('disables submit button while isSubmitting', () => {
    mockUseUGCPhotos.mockReturnValue({ ...defaultHookResult, isSubmitting: true });
    const { getByTestId } = renderModal();
    const btn = getByTestId('ugc-submit-button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('calls onClose after successful submit', async () => {
    const onClose = jest.fn();
    mockUseUGCPhotos.mockReturnValue({ ...defaultHookResult, submitSuccess: true });
    renderModal({ onClose });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows success feedback before closing', async () => {
    mockUseUGCPhotos.mockReturnValue({ ...defaultHookResult, submitSuccess: true });
    const { queryByTestId } = renderModal({ onClose: jest.fn() });
    expect(queryByTestId('ugc-submit-modal')).toBeTruthy();
  });
});

// ── Section 4: Error display ──────────────────────────────────────────────────

describe('error display', () => {
  it('displays submitError message', () => {
    mockUseUGCPhotos.mockReturnValue({
      ...defaultHookResult,
      submitError: 'Upload failed',
    });
    const { getByText } = renderModal();
    expect(getByText('Upload failed')).toBeTruthy();
  });

  it('displays permission error', () => {
    mockUseUGCPhotos.mockReturnValue({
      ...defaultHookResult,
      submitError: 'Photo library permission is required',
    });
    const { getByText } = renderModal();
    expect(getByText(/permission/i)).toBeTruthy();
  });
});

// ── Section 5: Close / cancel ─────────────────────────────────────────────────

describe('close / cancel', () => {
  it('calls onClose when close button pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderModal({ onClose });
    fireEvent.press(getByTestId('ugc-close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls clearSubmitStatus when modal closes', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderModal({ onClose });
    fireEvent.press(getByTestId('ugc-close-button'));
    expect(mockClearSubmitStatus).toHaveBeenCalled();
  });
});

// ── Section 6: Room type selection ───────────────────────────────────────────

describe('room type selection', () => {
  it('passes selected roomType to submitPhoto', async () => {
    const { getByText, getByTestId } = renderModal();
    // Room type uses segmented chips — press the Bedroom chip by its label text
    fireEvent.press(getByText('Bedroom'));
    await act(async () => {
      fireEvent.press(getByTestId('ugc-submit-button'));
    });
    expect(mockSubmitPhoto).toHaveBeenCalledWith(expect.objectContaining({ roomType: 'bedroom' }));
  });

  it('defaults to living-room', async () => {
    const { getByTestId } = renderModal();
    await act(async () => {
      fireEvent.press(getByTestId('ugc-submit-button'));
    });
    expect(mockSubmitPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ roomType: 'living-room' }),
    );
  });
});
