/**
 * VisualSearchScreen deeper edge-case tests — cm-2su
 *
 * Covers:
 *  - Permission denied: full UI isolation (no camera, no shutter, back button present)
 *  - Permission denied permanently: no camera, no retry, Open Settings shown
 *  - Capture error state: shutter re-enabled, indicator hidden, multiple errors
 *  - Falsy URI result: empty-string and undefined URI do not trigger navigation
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
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
  };
});

const mockRequestPermission = jest.fn();
const mockTakePicture = jest.fn();

jest.mock('expo-camera', () => {
  const { createElement, forwardRef } = require('react');
  const { View } = require('react-native');
  return {
    CameraView: forwardRef(({ children, testID }: any, ref: any) => {
      if (ref) ref.current = { takePictureAsync: mockTakePicture };
      return createElement(View, { testID }, children);
    }),
    useCameraPermissions: jest.fn(),
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
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

// ── Permission denied — full UI isolation ─────────────────────────────────────

describe('VisualSearchScreen — permission denied (deeper)', () => {
  beforeEach(() => {
    mockPermission(false, 'denied', true);
  });

  it('shows the denied state panel', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-permission-denied')).toBeTruthy();
  });

  it('does not show the camera viewfinder in denied state', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('visual-search-camera')).toBeNull();
  });

  it('does not show the shutter button in denied state', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('visual-search-shutter')).toBeNull();
  });

  it('does not show the undetermined permission prompt in denied state', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('visual-search-permission-prompt')).toBeNull();
  });

  it('does not show the permanently-denied panel in denied state', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('visual-search-permission-denied-permanent')).toBeNull();
  });

  it('back button is present in denied state', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-back')).toBeTruthy();
  });

  it('back button calls goBack in denied state', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('visual-search-back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});

// ── Permission denied permanently — full UI isolation ─────────────────────────

describe('VisualSearchScreen — permission denied permanently (deeper)', () => {
  beforeEach(() => {
    mockPermission(false, 'denied', false);
  });

  it('shows the denied-permanent state panel', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-permission-denied-permanent')).toBeTruthy();
  });

  it('does not show the camera viewfinder in denied-permanent state', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('visual-search-camera')).toBeNull();
  });

  it('does not show the shutter button in denied-permanent state', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('visual-search-shutter')).toBeNull();
  });

  it('does not show the Try Again (re-prompt) button in denied-permanent state', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('visual-search-permission-retry')).toBeNull();
  });

  it('shows the Open Settings button in denied-permanent state', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-open-settings')).toBeTruthy();
  });

  it('back button is present in denied-permanent state', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-back')).toBeTruthy();
  });

  it('back button calls goBack in denied-permanent state', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('visual-search-back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});

// ── Capture error state (deeper) ──────────────────────────────────────────────

describe('VisualSearchScreen — capture error state (deeper)', () => {
  beforeEach(() => {
    mockPermission(true, 'granted');
  });

  it('shutter is re-enabled (not disabled) after a capture error', async () => {
    mockTakePicture.mockRejectedValue(new Error('Sensor failure'));
    const { getByTestId } = renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });

    expect(getByTestId('visual-search-shutter').props.disabled).toBeFalsy();
  });

  it('two consecutive errors both call captureException', async () => {
    mockTakePicture.mockRejectedValue(new Error('Error A'));
    const { getByTestId } = renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });

    expect(mockCaptureException).toHaveBeenCalledTimes(2);
  });

  it('capturing indicator is hidden after a capture error', async () => {
    mockTakePicture.mockRejectedValue(new Error('Capture failed'));
    const { getByTestId, queryByTestId } = renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });

    expect(queryByTestId('visual-search-capturing')).toBeNull();
  });

  it('does not navigate after a capture error', async () => {
    mockTakePicture.mockRejectedValue(new Error('Hardware error'));
    const { getByTestId } = renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ── Falsy URI — no navigation ─────────────────────────────────────────────────

describe('VisualSearchScreen — falsy URI does not navigate', () => {
  beforeEach(() => {
    mockPermission(true, 'granted');
  });

  it('does not navigate when photo uri is empty string', async () => {
    mockTakePicture.mockResolvedValue({ uri: '' });
    const { getByTestId } = renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when photo uri is undefined', async () => {
    mockTakePicture.mockResolvedValue({ uri: undefined });
    const { getByTestId } = renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when takePictureAsync returns null', async () => {
    mockTakePicture.mockResolvedValue(null);
    const { getByTestId } = renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId('visual-search-shutter'));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
