/**
 * Tests for WarrantyRegistrationScreen — cm-wrt
 *
 * Covers: rendering, form validation (required fields + date format),
 * receipt photo upload (happy path, failure, cancel),
 * submission (success, error, loading/disabled state),
 * and the wix client unavailable edge case.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { WarrantyRegistrationScreen } from '../WarrantyRegistrationScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: mockGoBack,
      dispatch: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    }),
    useNavigationState: (selector: any) => {
      const state = { routes: [{ name: 'WarrantyRegistration', key: 'WR-mock' }], index: 0 };
      return selector(state);
    },
  };
});

const mockRegisterWarranty = jest.fn();
jest.mock('@/services/warrantyRegistration', () => ({
  registerWarranty: (...args: any[]) => mockRegisterWarranty(...args),
}));

const mockInsertDataItem = jest.fn();
jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => ({ insertDataItem: mockInsertDataItem }),
}));

const mockLaunchImageLibraryAsync = jest.fn();
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: any[]) => mockLaunchImageLibraryAsync(...args),
  MediaTypeOptions: { Images: 'Images' },
}));

const mockUploadReviewPhoto = jest.fn();
jest.mock('@/services/uploadReviewPhoto', () => ({
  uploadReviewPhoto: (...args: any[]) => mockUploadReviewPhoto(...args),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_PROPS = {
  orderId: 'ord-001',
  orderNumber: 'CF-2026-0147',
  productName: 'The Asheville Futon',
  onBack: jest.fn(),
  onSuccess: jest.fn(),
};

function renderScreen(props: Partial<typeof DEFAULT_PROPS> = {}) {
  const merged = { ...DEFAULT_PROPS, ...props };
  return render(
    <NavigationContainer>
      <ThemeProvider>
        <WarrantyRegistrationScreen {...merged} />
      </ThemeProvider>
    </NavigationContainer>,
  );
}

function fillValidForm(getByTestId: ReturnType<typeof render>['getByTestId']) {
  fireEvent.changeText(getByTestId('warranty-product-input'), 'The Asheville Futon');
  fireEvent.changeText(getByTestId('warranty-date-input'), '2026-02-10');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRegisterWarranty.mockResolvedValue({ success: true, id: 'warranty-001' });
  mockLaunchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///receipt.jpg' }],
  });
  mockUploadReviewPhoto.mockResolvedValue({ mediaUrl: 'https://media.wix.com/receipt.jpg' });
});

// ── Root rendering ────────────────────────────────────────────────────────────

describe('WarrantyRegistrationScreen — rendering', () => {
  it('renders with testID warranty-registration-screen', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('warranty-registration-screen')).toBeTruthy();
  });

  it('renders a back button', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('warranty-back')).toBeTruthy();
  });

  it('back button calls onBack', () => {
    const onBack = jest.fn();
    const { getByTestId } = renderScreen({ onBack });
    fireEvent.press(getByTestId('warranty-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows the order number pre-filled read-only', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('warranty-order-number').props.children).toContain('CF-2026-0147');
  });

  it('pre-fills product field with productName prop', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('warranty-product-input').props.value).toBe('The Asheville Futon');
  });

  it('shows empty product field when no productName prop', () => {
    const { getByTestId } = renderScreen({ productName: undefined });
    expect(getByTestId('warranty-product-input').props.value).toBe('');
  });

  it('renders purchase date input', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('warranty-date-input')).toBeTruthy();
  });

  it('renders add receipt photo button', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('warranty-add-photo')).toBeTruthy();
  });

  it('renders submit button', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('warranty-submit')).toBeTruthy();
  });
});

// ── Form validation ────────────────────────────────────────────────────────────

describe('WarrantyRegistrationScreen — validation', () => {
  it('shows error when product field is empty on submit', () => {
    const { getByTestId } = renderScreen({ productName: undefined });
    fireEvent.changeText(getByTestId('warranty-date-input'), '2026-02-10');
    fireEvent.press(getByTestId('warranty-submit'));
    expect(getByTestId('warranty-product-error')).toBeTruthy();
  });

  it('shows error when purchase date is empty on submit', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('warranty-submit'));
    expect(getByTestId('warranty-date-error')).toBeTruthy();
  });

  it('shows error for invalid date format', () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('warranty-date-input'), 'not-a-date');
    fireEvent.press(getByTestId('warranty-submit'));
    expect(getByTestId('warranty-date-error')).toBeTruthy();
  });

  it('shows error for future purchase date', () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('warranty-product-input'), 'Test Product');
    fireEvent.changeText(getByTestId('warranty-date-input'), '2099-01-01');
    fireEvent.press(getByTestId('warranty-submit'));
    expect(getByTestId('warranty-date-error')).toBeTruthy();
  });

  it('clears product error when user types', () => {
    const { getByTestId, queryByTestId } = renderScreen({ productName: undefined });
    fireEvent.press(getByTestId('warranty-submit'));
    expect(getByTestId('warranty-product-error')).toBeTruthy();
    fireEvent.changeText(getByTestId('warranty-product-input'), 'My Futon');
    expect(queryByTestId('warranty-product-error')).toBeNull();
  });

  it('clears date error when user types', () => {
    const { getByTestId, queryByTestId } = renderScreen();
    fireEvent.press(getByTestId('warranty-submit'));
    fireEvent.changeText(getByTestId('warranty-date-input'), '2026-02-10');
    expect(queryByTestId('warranty-date-error')).toBeNull();
  });

  it('does not call registerWarranty when validation fails', () => {
    const { getByTestId } = renderScreen({ productName: undefined });
    fireEvent.press(getByTestId('warranty-submit'));
    expect(mockRegisterWarranty).not.toHaveBeenCalled();
  });
});

// ── Receipt photo upload ───────────────────────────────────────────────────────

describe('WarrantyRegistrationScreen — receipt photo upload', () => {
  it('opens image picker when add photo is pressed', async () => {
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('warranty-add-photo'));
    });
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalledTimes(1);
  });

  it('uploads the picked photo via uploadReviewPhoto', async () => {
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('warranty-add-photo'));
    });
    await waitFor(() => {
      expect(mockUploadReviewPhoto).toHaveBeenCalledWith('file:///receipt.jpg');
    });
  });

  it('shows receipt photo preview after successful upload', async () => {
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('warranty-add-photo'));
    });
    await waitFor(() => {
      expect(getByTestId('warranty-receipt-preview')).toBeTruthy();
    });
  });

  it('shows uploading indicator while photo uploads', async () => {
    let resolveUpload!: (v: { mediaUrl: string }) => void;
    mockUploadReviewPhoto.mockReturnValue(
      new Promise((res) => {
        resolveUpload = res;
      }),
    );

    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('warranty-add-photo'));
    });

    expect(getByTestId('warranty-photo-uploading')).toBeTruthy();

    await act(async () => {
      resolveUpload({ mediaUrl: 'https://media.wix.com/receipt.jpg' });
    });
  });

  it('does not upload when picker is cancelled', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true });
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('warranty-add-photo'));
    });
    expect(mockUploadReviewPhoto).not.toHaveBeenCalled();
  });

  it('shows upload error when upload fails', async () => {
    mockUploadReviewPhoto.mockRejectedValue(new Error('upload failed'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('warranty-add-photo'));
    });
    await waitFor(() => {
      expect(getByTestId('warranty-photo-error')).toBeTruthy();
    });

    consoleErrorSpy.mockRestore();
  });

  it('logs error with [WarrantyRegistrationScreen] prefix when upload fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUploadReviewPhoto.mockRejectedValue(new Error('network error'));

    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('warranty-add-photo'));
    });
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WarrantyRegistrationScreen]'),
        expect.any(Error),
      );
    });
    consoleErrorSpy.mockRestore();
  });

  it('form remains submittable after photo upload failure', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUploadReviewPhoto.mockRejectedValue(new Error('upload failed'));

    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('warranty-add-photo'));
    });
    await waitFor(() => expect(mockUploadReviewPhoto).toHaveBeenCalled());

    fillValidForm(getByTestId);
    await act(async () => {
      fireEvent.press(getByTestId('warranty-submit'));
    });
    await waitFor(() => {
      expect(mockRegisterWarranty).toHaveBeenCalledWith(
        expect.anything(),
        expect.not.objectContaining({ receiptPhotoUrl: expect.anything() }),
      );
    });
    consoleErrorSpy.mockRestore();
  });
});

// ── Submission — happy path ────────────────────────────────────────────────────

describe('WarrantyRegistrationScreen — submission', () => {
  it('calls registerWarranty with correct data on valid submit', async () => {
    const { getByTestId } = renderScreen();
    fillValidForm(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('warranty-submit'));
    });

    await waitFor(() => {
      expect(mockRegisterWarranty).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          orderId: 'ord-001',
          orderNumber: 'CF-2026-0147',
          productName: 'The Asheville Futon',
          purchaseDate: '2026-02-10',
        }),
      );
    });
  });

  it('includes receiptPhotoUrl when photo was uploaded', async () => {
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('warranty-add-photo'));
    });
    await waitFor(() => expect(mockUploadReviewPhoto).toHaveBeenCalled());

    fillValidForm(getByTestId);
    await act(async () => {
      fireEvent.press(getByTestId('warranty-submit'));
    });

    await waitFor(() => {
      expect(mockRegisterWarranty).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          receiptPhotoUrl: 'https://media.wix.com/receipt.jpg',
        }),
      );
    });
  });

  it('calls onSuccess after successful registration', async () => {
    const onSuccess = jest.fn();
    const { getByTestId } = renderScreen({ onSuccess });
    fillValidForm(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('warranty-submit'));
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('shows success state after registration', async () => {
    const { getByTestId } = renderScreen();
    fillValidForm(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('warranty-submit'));
    });

    await waitFor(() => {
      expect(getByTestId('warranty-success')).toBeTruthy();
    });
  });

  it('disables submit button while submitting', async () => {
    let resolveRegister!: (v: any) => void;
    mockRegisterWarranty.mockReturnValue(
      new Promise((res) => {
        resolveRegister = res;
      }),
    );

    const { getByTestId } = renderScreen();
    fillValidForm(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('warranty-submit'));
    });

    expect(getByTestId('warranty-submit').props.accessibilityState?.disabled).toBe(true);

    await act(async () => {
      resolveRegister({ success: true, id: 'w-1' });
    });
  });

  it('shows loading indicator during submission', async () => {
    let resolveRegister!: (v: any) => void;
    mockRegisterWarranty.mockReturnValue(
      new Promise((res) => {
        resolveRegister = res;
      }),
    );

    const { getByTestId } = renderScreen();
    fillValidForm(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('warranty-submit'));
    });

    expect(getByTestId('warranty-submitting')).toBeTruthy();

    await act(async () => {
      resolveRegister({ success: true, id: 'w-1' });
    });
  });
});

// ── Submission — error state ───────────────────────────────────────────────────

describe('WarrantyRegistrationScreen — submission error', () => {
  it('shows error banner when registerWarranty returns success:false', async () => {
    mockRegisterWarranty.mockResolvedValue({ success: false, error: 'Service unavailable' });

    const { getByTestId } = renderScreen();
    fillValidForm(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('warranty-submit'));
    });

    await waitFor(() => {
      expect(getByTestId('warranty-submit-error')).toBeTruthy();
    });
  });

  it('shows error message text', async () => {
    mockRegisterWarranty.mockResolvedValue({ success: false, error: 'Service unavailable' });

    const { getByTestId, getByText } = renderScreen();
    fillValidForm(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('warranty-submit'));
    });

    await waitFor(() => {
      expect(getByText(/Service unavailable/i)).toBeTruthy();
    });
  });

  it('does not call onSuccess on failure', async () => {
    mockRegisterWarranty.mockResolvedValue({ success: false, error: 'Error' });
    const onSuccess = jest.fn();

    const { getByTestId } = renderScreen({ onSuccess });
    fillValidForm(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('warranty-submit'));
    });

    await waitFor(() => expect(getByTestId('warranty-submit-error')).toBeTruthy());
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('allows re-submit after error', async () => {
    mockRegisterWarranty
      .mockResolvedValueOnce({ success: false, error: 'Timeout' })
      .mockResolvedValueOnce({ success: true, id: 'w-1' });

    const { getByTestId } = renderScreen();
    fillValidForm(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('warranty-submit'));
    });
    await waitFor(() => expect(getByTestId('warranty-submit-error')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId('warranty-submit'));
    });
    await waitFor(() => {
      expect(getByTestId('warranty-success')).toBeTruthy();
    });

    expect(mockRegisterWarranty).toHaveBeenCalledTimes(2);
  });
});

// ── Wix client unavailable ────────────────────────────────────────────────────

describe('WarrantyRegistrationScreen — wix client unavailable', () => {
  it('shows error when registerWarranty returns unavailable error', async () => {
    // registerWarranty returns this when wixClient is null (tested at service level)
    mockRegisterWarranty.mockResolvedValue({ success: false, error: 'Wix service unavailable' });

    const { getByTestId } = renderScreen();
    fillValidForm(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('warranty-submit'));
    });

    await waitFor(() => {
      expect(getByTestId('warranty-submit-error')).toBeTruthy();
    });
  });
});
