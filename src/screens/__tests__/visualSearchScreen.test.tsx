/**
 * Tests for VisualSearchScreen — deacon-905
 *
 * Covers: camera permission states (undetermined, denied, denied-permanently, granted),
 * camera viewfinder rendering, photo capture, navigation to results,
 * and back navigation.
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { VisualSearchScreen } from '../VisualSearchScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      dispatch: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    }),
    useNavigationState: (selector: any) => {
      const state = { routes: [{ name: 'VisualSearch', key: 'VS-mock' }], index: 0 };
      return selector(state);
    },
  };
});

const mockRequestPermission = jest.fn();
const mockTakePicture = jest.fn();

jest.mock('expo-camera', () => {
  const { createElement, forwardRef } = require('react');
  const { View } = require('react-native');
  return {
    CameraView: forwardRef(({ children, testID }: any, ref: any) => {
      if (ref) {
        ref.current = { takePictureAsync: mockTakePicture };
      }
      return createElement(View, { testID }, children);
    }),
    useCameraPermissions: jest.fn(),
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

const mockCaptureException = jest.fn();
jest.mock('@/services/crashReporting', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockPermission(
  granted: boolean,
  status: 'granted' | 'denied' | 'undetermined',
  canAskAgain = true,
) {
  const { useCameraPermissions } = require('expo-camera');
  (useCameraPermissions as jest.Mock).mockReturnValue([
    { granted, status, canAskAgain },
    mockRequestPermission,
  ]);
}

function renderScreen() {
  return render(
    <NavigationContainer>
      <ThemeProvider>
        <VisualSearchScreen />
      </ThemeProvider>
    </NavigationContainer>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Screen root ────────────────────────────────────────────────────────────────

describe('VisualSearchScreen — root', () => {
  it('renders with testID visual-search-screen', () => {
    mockPermission(true, 'granted');
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-screen')).toBeTruthy();
  });

  it('renders a back button', () => {
    mockPermission(true, 'granted');
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-back')).toBeTruthy();
  });

  it('back button calls goBack', () => {
    mockPermission(true, 'granted');
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('visual-search-back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});

// ── Permission: undetermined ───────────────────────────────────────────────────

describe('VisualSearchScreen — permission undetermined', () => {
  it('shows permission prompt when status is undetermined', () => {
    mockPermission(false, 'undetermined');
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-permission-prompt')).toBeTruthy();
  });

  it('shows "Allow Camera" button', () => {
    mockPermission(false, 'undetermined');
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-allow-camera')).toBeTruthy();
  });

  it('calls requestPermission when Allow Camera pressed', async () => {
    mockPermission(false, 'undetermined');
    mockRequestPermission.mockResolvedValue({ granted: true });
    const { getByTestId } = renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId('visual-search-allow-camera'));
    });

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('does not render the camera viewfinder', () => {
    mockPermission(false, 'undetermined');
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('visual-search-camera')).toBeNull();
  });
});

// ── Permission: denied ────────────────────────────────────────────────────────

describe('VisualSearchScreen — permission denied (can re-prompt)', () => {
  it('shows denied state UI', () => {
    mockPermission(false, 'denied', true);
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-permission-denied')).toBeTruthy();
  });

  it('shows Try Again button that re-requests permission', async () => {
    mockPermission(false, 'denied', true);
    mockRequestPermission.mockResolvedValue({ granted: false });
    const { getByTestId } = renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId('visual-search-permission-retry'));
    });

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('does not render the camera viewfinder', () => {
    mockPermission(false, 'denied', true);
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('visual-search-camera')).toBeNull();
  });
});

// ── Permission: denied permanently ────────────────────────────────────────────

describe('VisualSearchScreen — permission denied permanently', () => {
  it('shows denied-permanently state UI', () => {
    mockPermission(false, 'denied', false);
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-permission-denied-permanent')).toBeTruthy();
  });

  it('shows Open Settings button', () => {
    mockPermission(false, 'denied', false);
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-open-settings')).toBeTruthy();
  });

  it('Open Settings button calls Linking.openSettings', async () => {
    const { Linking } = require('react-native');
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    mockPermission(false, 'denied', false);

    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('visual-search-open-settings'));
    });

    expect(openSettings).toHaveBeenCalledTimes(1);
    openSettings.mockRestore();
  });

  it('does not render the camera viewfinder', () => {
    mockPermission(false, 'denied', false);
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('visual-search-camera')).toBeNull();
  });
});

// ── Permission: granted — camera viewfinder ───────────────────────────────────

describe('VisualSearchScreen — camera viewfinder (permission granted)', () => {
  it('renders the camera viewfinder', () => {
    mockPermission(true, 'granted');
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-camera')).toBeTruthy();
  });

  it('renders the shutter capture button', () => {
    mockPermission(true, 'granted');
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-shutter')).toBeTruthy();
  });

  it('shutter button has accessible label', () => {
    mockPermission(true, 'granted');
    const { getByTestId } = renderScreen();
    const shutter = getByTestId('visual-search-shutter');
    expect(shutter.props.accessibilityLabel).toMatch(/capture|take photo|snap/i);
  });

  it('does not render permission prompt when granted', () => {
    mockPermission(true, 'granted');
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('visual-search-permission-prompt')).toBeNull();
    expect(queryByTestId('visual-search-permission-denied')).toBeNull();
  });
});

// ── Capture flow ──────────────────────────────────────────────────────────────

describe('VisualSearchScreen — photo capture', () => {
  it('calls takePictureAsync when shutter pressed', async () => {
    mockPermission(true, 'granted');
    mockTakePicture.mockResolvedValue({ uri: 'file:///photos/snap-001.jpg' });

    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });

    expect(mockTakePicture).toHaveBeenCalledTimes(1);
  });

  it('navigates to VisualSearchResults with imageUri after capture', async () => {
    mockPermission(true, 'granted');
    const uri = 'file:///photos/snap-002.jpg';
    mockTakePicture.mockResolvedValue({ uri });

    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('VisualSearchResults', { imageUri: uri });
  });

  it('shows capturing indicator while taking picture', async () => {
    mockPermission(true, 'granted');
    let resolveCapture!: (v: any) => void;
    mockTakePicture.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCapture = resolve;
        }),
    );

    const { getByTestId } = renderScreen();
    // Flush past the Haptics.impactAsync await so takePictureAsync is called
    // and resolveCapture is assigned before we assert on capturing state
    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });

    expect(getByTestId('visual-search-capturing')).toBeTruthy();

    await act(async () => {
      resolveCapture({ uri: 'file:///photos/snap-003.jpg' });
    });
  });

  it('hides capturing indicator after capture completes', async () => {
    mockPermission(true, 'granted');
    mockTakePicture.mockResolvedValue({ uri: 'file:///photos/snap-004.jpg' });

    const { getByTestId, queryByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });

    await waitFor(() => {
      expect(queryByTestId('visual-search-capturing')).toBeNull();
    });
  });

  it('does not navigate if takePictureAsync returns null uri', async () => {
    mockPermission(true, 'granted');
    mockTakePicture.mockResolvedValue(null);

    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate if takePictureAsync throws', async () => {
    mockPermission(true, 'granted');
    mockTakePicture.mockRejectedValue(new Error('Camera hardware error'));

    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('disables shutter during capture to prevent double-tap', async () => {
    mockPermission(true, 'granted');
    let resolveCapture!: (v: any) => void;
    mockTakePicture.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCapture = resolve;
        }),
    );

    const { getByTestId } = renderScreen();
    // First press — flush past haptics await so takePictureAsync is called and capturing=true
    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });

    // Second tap while capturing — should be ignored since capturing=true
    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });

    await act(async () => {
      resolveCapture({ uri: 'file:///photos/snap-005.jpg' });
    });

    expect(mockTakePicture).toHaveBeenCalledTimes(1);
  });
});

// ── cm-ga6: capture error handling ───────────────────────────────────────────

describe('VisualSearchScreen — capture error handling', () => {
  it('calls captureException when takePictureAsync throws', async () => {
    mockPermission(true, 'granted');
    mockTakePicture.mockRejectedValue(new Error('Hardware failure'));
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
  });

  it('captureException receives an Error instance when a real Error is thrown', async () => {
    mockPermission(true, 'granted');
    mockTakePicture.mockRejectedValue(new Error('Camera hardware error'));
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });
    expect(mockCaptureException.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it('captureException receives an Error even when a non-Error string is thrown', async () => {
    mockPermission(true, 'granted');
    mockTakePicture.mockRejectedValue('string error message');
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });
    expect(mockCaptureException.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it('hides capturing indicator after an error (capturing state reset)', async () => {
    mockPermission(true, 'granted');
    mockTakePicture.mockRejectedValue(new Error('Capture failed'));
    const { getByTestId, queryByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });
    await waitFor(() => {
      expect(queryByTestId('visual-search-capturing')).toBeNull();
    });
  });

  it('shutter is re-enabled after a capture error (second press works)', async () => {
    mockPermission(true, 'granted');
    mockTakePicture.mockRejectedValueOnce(new Error('First attempt failed'));
    mockTakePicture.mockResolvedValue({ uri: 'file:///photos/retry.jpg' });
    const { getByTestId } = renderScreen();
    // First press fails
    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });
    // Second press succeeds (capturing was reset to false)
    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });
    expect(mockTakePicture).toHaveBeenCalledTimes(2);
  });
});

// ── cm-ga6: accessibility ─────────────────────────────────────────────────────

describe('VisualSearchScreen — accessibility', () => {
  it('back button has accessibilityLabel', () => {
    mockPermission(true, 'granted');
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-back').props.accessibilityLabel).toBeTruthy();
  });

  it('Allow Camera button has accessibilityLabel', () => {
    mockPermission(false, 'undetermined');
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-allow-camera').props.accessibilityLabel).toBeTruthy();
  });

  it('shutter button has accessibilityRole button', () => {
    mockPermission(true, 'granted');
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-shutter').props.accessibilityRole).toBe('button');
  });

  it('denied permanently view does not render the retry button', () => {
    mockPermission(false, 'denied', false);
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('visual-search-permission-retry')).toBeNull();
  });
});
